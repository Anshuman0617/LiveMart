// server/routes/otp.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// In-memory OTP storage (in production, consider using Redis)
// Format: { email: { otp: string, expiresAt: number, attempts: number } }
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

// Configure email transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, {
      otp,
      expiresAt,
      attempts: 0,
    });

    // Send email
    const transporter = getTransporter();
    const mailOptions = {
      from: `"LiveMart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your LiveMart Registration OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3399cc;">LiveMart Registration Verification</h2>
          <p>Thank you for registering with LiveMart!</p>
          <p>Your OTP (One-Time Password) for email verification is:</p>
          <div style="background-color: #f0f9ff; border: 2px solid #3399cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #3399cc; margin: 0; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'OTP sent to your email',
      expiresIn: 600 // seconds
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' });
    }

    // Check if OTP has expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    // Check attempts (max 5 attempts)
    if (storedData.attempts >= 5) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts++;
      return res.status(400).json({ 
        error: 'Invalid OTP',
        remainingAttempts: 5 - storedData.attempts
      });
    }

    // OTP verified successfully - mark as verified (don't delete yet, will be used during registration)
    storedData.verified = true;
    storedData.verifiedAt = Date.now();

    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Check if OTP is verified (used during registration)
router.post('/check-verified', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const storedData = otpStore.get(email);

    if (!storedData || !storedData.verified) {
      return res.json({ verified: false });
    }

    // Check if verification is still valid (within 30 minutes)
    const verificationValidFor = 30 * 60 * 1000; // 30 minutes
    if (Date.now() - storedData.verifiedAt > verificationValidFor) {
      otpStore.delete(email);
      return res.json({ verified: false });
    }

    return res.json({ verified: true });
  } catch (err) {
    console.error('Check verified error:', err);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// Clean up verified OTP after successful registration
router.post('/cleanup', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      otpStore.delete(email);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Cleanup OTP error:', err);
    res.status(500).json({ error: 'Failed to cleanup OTP' });
  }
});

// Export functions for direct use in other routes
export function isOTPVerified(email) {
  const storedData = otpStore.get(email);
  if (!storedData || !storedData.verified) {
    return false;
  }
  // Check if verification is still valid (within 30 minutes)
  const verificationValidFor = 30 * 60 * 1000; // 30 minutes
  if (Date.now() - storedData.verifiedAt > verificationValidFor) {
    otpStore.delete(email);
    return false;
  }
  return true;
}

export function cleanupOTP(email) {
  otpStore.delete(email);
}

export default router;

