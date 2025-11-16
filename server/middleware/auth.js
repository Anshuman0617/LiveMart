// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findByPk(payload.id);
    if (!user) {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('auth error', err);
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
