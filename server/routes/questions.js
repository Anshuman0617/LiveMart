// server/routes/questions.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Question, Product, User } from '../models/index.js';

const router = express.Router();

// Get all questions for a product
router.get('/product/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Get all questions
    let questions = await Question.findAll({
      where: { productId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'picture']
        },
        {
          model: User,
          as: 'answeredByUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']] // Show latest questions first
    });
    
    // Filter questions based on user role
    if (userRole === 'retailer') {
      // Retailers see all questions
      // No filtering needed
    } else {
      // Regular users see:
      // 1. All their own questions
      // 2. Recent 5 questions from other users
      if (userId) {
        const userQuestions = questions.filter(q => q.userId === userId);
        const otherQuestions = questions
          .filter(q => q.userId !== userId)
          .slice(0, 5); // Recent 5 from other users
        questions = [...userQuestions, ...otherQuestions]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by date
      } else {
        // Unauthenticated users see only recent 5
        questions = questions.slice(0, 5);
      }
    }
    
    res.json(questions);
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ask a question (users only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, question } = req.body;
    
    if (!productId || !question || !question.trim()) {
      return res.status(400).json({ error: 'Product ID and question are required' });
    }
    
    // Only regular users (not retailers/wholesalers) can ask questions
    if (req.user.role === 'retailer' || req.user.role === 'wholesaler') {
      return res.status(403).json({ error: 'Retailers and wholesalers cannot ask questions' });
    }
    
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const newQuestion = await Question.create({
      productId,
      userId: req.user.id,
      question: question.trim()
    });
    
    // Reload with associations
    await newQuestion.reload({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'picture']
        }
      ]
    });
    
    res.json(newQuestion);
  } catch (err) {
    console.error('Ask question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Answer or update answer to a question (retailers only)
router.put('/:questionId/answer', authMiddleware, async (req, res) => {
  try {
    const { answer } = req.body;
    
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }
    
    // Only retailers can answer questions
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can answer questions' });
    }
    
    const question = await Question.findByPk(req.params.questionId, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'ownerId', 'ownerType']
        }
      ]
    });
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Verify that this question is for a product owned by this retailer
    if (question.product.ownerId !== req.user.id || question.product.ownerType !== 'retailer') {
      return res.status(403).json({ error: 'You can only answer questions for your own products' });
    }
    
    question.answer = answer.trim();
    question.answeredAt = new Date();
    question.answeredBy = req.user.id;
    await question.save();
    
    // Reload with associations
    await question.reload({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'picture']
        },
        {
          model: User,
          as: 'answeredByUser',
          attributes: ['id', 'name']
        }
      ]
    });
    
    res.json(question);
  } catch (err) {
    console.error('Answer question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

