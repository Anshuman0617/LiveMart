// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/index.js';
import { isOTPVerified, cleanupOTP } from './otp.js';

dotenv.config();
const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

// Register (email/password + role) - REQUIRES OTP VERIFICATION
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'Missing fields' });
    
    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    // Verify OTP before registration
    if (!isOTPVerified(email)) {
      return res.status(400).json({ 
        error: 'Email not verified. Please verify your email with OTP before registering.' 
      });
    }
    
    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, passwordHash, role: role || 'customer' });
    
    // Cleanup OTP after successful registration
    cleanupOTP(email);
    
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findOne({ where: { email }});
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, picture: user.picture } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth (ID token from client)
router.post('/google', async (req, res) => {
  try {
    if (!googleClient) return res.status(500).json({ error: 'Google OAuth not configured' });
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'No email in token' });

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        name: name || email.split('@')[0],
        passwordHash: null,
        provider: 'google',
        providerId: sub,
        picture: picture || null,
        role: 'customer'
      });
    } else {
      // update provider info if needed
      if (!user.provider || !user.providerId) {
        user.provider = 'google';
        user.providerId = sub;
        user.picture = user.picture || picture || null;
        await user.save();
      }
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, picture: user.picture } });
  } catch (err) {
    console.error('Google login error', err);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

export default router;
