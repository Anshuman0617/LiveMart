// server/routes/reviews.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Review, Product } from '../models/index.js';

const router = express.Router();

// Add review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, rating, text } = req.body;

    if (!productId || !rating)
      return res.status(400).json({ error: "Missing fields" });

    const p = await Product.findByPk(productId);
    if (!p) return res.status(404).json({ error: "Product not found" });

    const review = await Review.create({
      userId: req.user.id,
      productId,
      rating,
      text
    });

    // Update product rating summary
    const all = await Review.findAll({ where: { productId }});
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;

    await p.update({
      ratingAvg: avg,
      reviewsCount: all.length
    });

    res.json(review);
  } catch (err) {
    console.error("REVIEW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get reviews for product
router.get('/:productId', async (req, res) => {
  const reviews = await Review.findAll({
    where: { productId: req.params.productId },
    include: [{ association: "user", attributes: ["id","name","picture"] }]
  });
  res.json(reviews);
});

export default router;
