// server/routes/products.js
import express from 'express';
import { Product } from '../models/index.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// public list
router.get('/', async (req, res) => {
  const products = await Product.findAll();
  res.json(products);
});

// get single
router.get('/:id', async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// admin create product
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, price, stock, imageUrl } = req.body;
    const p = await Product.create({ title, description, price, stock, imageUrl });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// admin update
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await p.update(req.body);
  res.json(p);
});

// admin delete
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await p.destroy();
  res.json({ ok: true });
});

export default router;
