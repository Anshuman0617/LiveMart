// server/routes/reviews.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Review, Product, User } from '../models/index.js';

const router = express.Router();

// Add or update review (one per user)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, rating, text } = req.body;

    if (!productId || !rating)
      return res.status(400).json({ error: "Missing fields" });

    const p = await Product.findByPk(productId);
    if (!p) return res.status(404).json({ error: "Product not found" });

    // Check if user already has a review for this product
    const existingReview = await Review.findOne({
      where: {
        userId: req.user.id,
        productId: productId
      }
    });

    let review;
    if (existingReview) {
      // Update existing review
      review = await existingReview.update({
        rating,
        text: text || existingReview.text
      });
    } else {
      // Create new review
      review = await Review.create({
        userId: req.user.id,
        productId,
        rating,
        text
      });
    }

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

// Get reviews for product (with optional star filter)
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating } = req.query; // Filter by rating (1-5)

    const whereClause = { productId };
    
    // If rating filter is provided, add it to the where clause
    if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
      whereClause.rating = parseInt(rating, 10);
    }

    const reviews = await Review.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ["id","name","picture"] }],
      order: [['createdAt', 'DESC']] // Show latest reviews first
    });
    
    res.json(reviews);
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Respond to a review (retailers only)
router.put('/:reviewId/respond', authMiddleware, async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }
    
    // Only retailers can respond to reviews
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can respond to reviews' });
    }
    
    const review = await Review.findByPk(req.params.reviewId, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'ownerId', 'ownerType']
        }
      ]
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Verify that this review is for a product owned by this retailer
    if (review.product.ownerId !== req.user.id || review.product.ownerType !== 'retailer') {
      return res.status(403).json({ error: 'You can only respond to reviews for your own products' });
    }
    
    review.retailerResponse = response.trim();
    review.retailerResponseAt = new Date();
    await review.save();
    
    // Reload with user association
    await review.reload({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'picture']
        }
      ]
    });
    
    res.json(review);
  } catch (err) {
    console.error('Respond to review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
