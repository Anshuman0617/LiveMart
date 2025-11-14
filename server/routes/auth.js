// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';
dotenv.config();

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

// register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, passwordHash, role: role || 'customer' });
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email }});
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
