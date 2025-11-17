// server/routes/earnings.js
import express from 'express';
import { SellerEarning, User, Order, OrderItem, Product } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get seller's earnings (for retailers/wholesalers)
router.get('/my-earnings', authMiddleware, async (req, res) => {
  try {
    // Only retailers and wholesalers can view their earnings
    if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
      return res.status(403).json({ error: 'Only sellers can view earnings' });
    }

    const earnings = await SellerEarning.findAll({
      where: { sellerId: req.user.id },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'status', 'createdAt', 'paymentId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'imageUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate totals
    const totals = earnings.reduce((acc, earning) => {
      if (earning.status === 'pending') {
        acc.pending += parseFloat(earning.sellerAmount);
      } else if (earning.status === 'settled') {
        acc.settled += parseFloat(earning.sellerAmount);
      }
      acc.total += parseFloat(earning.sellerAmount);
      acc.totalCommission += parseFloat(earning.platformCommission);
      return acc;
    }, { pending: 0, settled: 0, total: 0, totalCommission: 0 });

    res.json({
      earnings,
      totals: {
        pending: totals.pending.toFixed(2),
        settled: totals.settled.toFixed(2),
        total: totals.total.toFixed(2),
        totalCommission: totals.totalCommission.toFixed(2)
      }
    });
  } catch (err) {
    console.error('Get earnings error:', err);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Get seller's payment account info
router.get('/payment-info', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
      return res.status(403).json({ error: 'Only sellers can view payment info' });
    }

    const user = await User.findByPk(req.user.id);
    res.json({
      bankAccountName: user.bankAccountName,
      bankAccountNumber: user.bankAccountNumber,
      bankIFSC: user.bankIFSC,
      bankName: user.bankName,
      upiId: user.upiId,
      payuMerchantKey: user.payuMerchantKey
    });
  } catch (err) {
    console.error('Get payment info error:', err);
    res.status(500).json({ error: 'Failed to fetch payment info' });
  }
});

// Update seller's payment account info
router.put('/payment-info', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
      return res.status(403).json({ error: 'Only sellers can update payment info' });
    }

    const {
      bankAccountName,
      bankAccountNumber,
      bankIFSC,
      bankName,
      upiId,
      payuMerchantKey
    } = req.body;

    const user = await User.findByPk(req.user.id);
    
    if (bankAccountName !== undefined) user.bankAccountName = bankAccountName;
    if (bankAccountNumber !== undefined) user.bankAccountNumber = bankAccountNumber;
    if (bankIFSC !== undefined) user.bankIFSC = bankIFSC;
    if (bankName !== undefined) user.bankName = bankName;
    if (upiId !== undefined) user.upiId = upiId;
    if (payuMerchantKey !== undefined) user.payuMerchantKey = payuMerchantKey;

    await user.save();

    res.json({ 
      success: true, 
      message: 'Payment information updated',
      paymentInfo: {
        bankAccountName: user.bankAccountName,
        bankAccountNumber: user.bankAccountNumber,
        bankIFSC: user.bankIFSC,
        bankName: user.bankName,
        upiId: user.upiId,
        payuMerchantKey: user.payuMerchantKey
      }
    });
  } catch (err) {
    console.error('Update payment info error:', err);
    res.status(500).json({ error: 'Failed to update payment info' });
  }
});

// Admin: Get all pending earnings (for settlement)
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingEarnings = await SellerEarning.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email', 'role', 'bankAccountName', 'bankAccountNumber', 'bankIFSC', 'bankName', 'upiId']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'status', 'createdAt', 'paymentId']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Group by seller
    const bySeller = {};
    pendingEarnings.forEach(earning => {
      const sellerId = earning.sellerId;
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = {
          seller: earning.seller,
          earnings: [],
          total: 0
        };
      }
      bySeller[sellerId].earnings.push(earning);
      bySeller[sellerId].total += parseFloat(earning.sellerAmount);
    });

    res.json({
      pendingEarnings,
      bySeller: Object.values(bySeller).map(s => ({
        ...s,
        total: s.total.toFixed(2)
      }))
    });
  } catch (err) {
    console.error('Get pending earnings error:', err);
    res.status(500).json({ error: 'Failed to fetch pending earnings' });
  }
});

// Admin: Mark earnings as settled
router.post('/settle', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { earningIds, notes } = req.body;

    if (!earningIds || !Array.isArray(earningIds) || earningIds.length === 0) {
      return res.status(400).json({ error: 'Earning IDs required' });
    }

    const earnings = await SellerEarning.findAll({
      where: {
        id: { [Op.in]: earningIds },
        status: 'pending'
      }
    });

    for (const earning of earnings) {
      earning.status = 'settled';
      earning.settledAt = new Date();
      earning.settlementNotes = notes || null;
      await earning.save();
    }

    res.json({
      success: true,
      message: `${earnings.length} earnings marked as settled`,
      settledCount: earnings.length
    });
  } catch (err) {
    console.error('Settle earnings error:', err);
    res.status(500).json({ error: 'Failed to settle earnings' });
  }
});

export default router;

