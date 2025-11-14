// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'dev_secret';

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
