// server/routes/orders.js
import express from 'express';
import { Order, OrderItem, Product } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// create order (authenticated)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, address } = req.body; // items: [{ productId, quantity }]
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });

    let total = 0;
    const order = await Order.create({ userId: req.user.id, status: 'pending', total: 0, address });

    for (const it of items) {
      const product = await Product.findByPk(it.productId);
      if (!product) continue;
      const unitPrice = parseFloat(product.price);
      const qty = parseInt(it.quantity, 10);
      const subtotal = unitPrice * qty;
      total += subtotal;
      await OrderItem.create({
        orderId: order.id,
        productId: product.id,
        quantity: qty,
        unitPrice,
        subtotal
      });
      // reduce stock (simple)
      product.stock = Math.max(0, product.stock - qty);
      await product.save();
    }

    order.total = total.toFixed(2);
    await order.save();

    res.json({ orderId: order.id, total: order.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// get user orders
router.get('/', authMiddleware, async (req, res) => {
  const orders = await Order.findAll({ where: { userId: req.user.id }, include: [{ model: OrderItem, as: 'items' }]});
  res.json(orders);
});

export default router;
