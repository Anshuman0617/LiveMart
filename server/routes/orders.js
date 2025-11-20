// server/routes/orders.js
import express from 'express';
import { Order, OrderItem, Product, User } from '../models/index.js';
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

// Get user orders (for customers)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                {
                  model: User,
                  as: 'owner',
                  attributes: ['id', 'name', 'email', 'phone', 'address']
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get seller orders (for retailers and wholesalers)
router.get('/seller', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
      return res.status(403).json({ error: 'Only sellers can access this endpoint' });
    }

    // Get all order items for products owned by this seller
    const sellerOrderItems = await OrderItem.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          where: { ownerId: req.user.id },
          required: true,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'email', 'phone', 'address']
            }
          ]
        },
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone', 'address']
            }
          ]
        }
      ]
    });

    // Group by order and format
    const orderMap = new Map();
    
    for (const orderItem of sellerOrderItems) {
      const order = orderItem.order;
      if (!order) continue;

      const orderId = order.id;
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          ...order.toJSON(),
          items: [],
          customer: order.user
        });
      }

      orderMap.get(orderId).items.push({
        ...orderItem.toJSON(),
        product: orderItem.product ? orderItem.product.toJSON() : null
      });
    }

    const formattedOrders = Array.from(orderMap.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(formattedOrders);
  } catch (err) {
    console.error('Get seller orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status (for sellers)
router.put('/:orderId/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
      return res.status(403).json({ error: 'Only sellers can update order status' });
    }

    const { status } = req.body;
    if (!['confirmed', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "confirmed" or "delivered"' });
    }

    const order = await Order.findByPk(req.params.orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify that this order contains products from this seller
    const hasSellerProducts = order.items.some(item => 
      item.product && item.product.ownerId === req.user.id
    );

    if (!hasSellerProducts) {
      return res.status(403).json({ error: 'You can only update orders containing your products' });
    }

    order.status = status;
    await order.save();

    // If order is marked as delivered and the seller is a wholesaler,
    // automatically create/update retailer products for the buyer (retailer)
    if (status === 'delivered' && req.user.role === 'wholesaler') {
      try {
        const buyer = await User.findByPk(order.userId);
        
        // Only process if buyer is a retailer
        if (buyer && buyer.role === 'retailer') {
          for (const item of order.items) {
            if (item.product && item.product.ownerType === 'wholesaler') {
              // Reload product to ensure we have the multiples field
              const wholesalerProduct = await Product.findByPk(item.productId);
              if (!wholesalerProduct) continue;
              
              // Convert quantity from multiples to individual units
              // item.quantity is in multiples (number of multiples ordered)
              // wholesalerProduct.multiples is the size of each multiple
              const quantityInUnits = item.quantity * (wholesalerProduct.multiples || 1);
              
              // Find or create retailer product using sourceProductId for reliable matching
              // This ensures matching works even if retailer edits title/description
              let retailerProduct = await Product.findOne({
                where: {
                  ownerId: buyer.id,
                  ownerType: 'retailer',
                  sourceProductId: wholesalerProduct.id
                }
              });

              if (retailerProduct) {
                // Update existing product: increase stock
                // Note: Retailer can edit title, description, price, etc., but stock will still update correctly
                retailerProduct.stock = (retailerProduct.stock || 0) + quantityInUnits;
                await retailerProduct.save();
              } else {
                // Create new retailer product (in case retailer didn't add it manually first)
                retailerProduct = await Product.create({
                  title: wholesalerProduct.title,
                  description: wholesalerProduct.description,
                  price: wholesalerProduct.price, // Retailer can adjust later
                  stock: quantityInUnits, // Stock in individual units
                  multiples: 1, // Retailer products sell individual units
                  discount: 0,
                  images: wholesalerProduct.images || [],
                  imageUrl: wholesalerProduct.imageUrl,
                  ownerId: buyer.id,
                  ownerType: 'retailer',
                  sourceProductId: wholesalerProduct.id // Track source for future deliveries
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error auto-creating retailer products on delivery:', err);
        // Don't fail the order update if product creation fails
      }
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
