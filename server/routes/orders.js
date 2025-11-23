// server/routes/orders.js
import express from 'express';
import { Order, OrderItem, Product, User } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateDeliveryOTP, sendDeliveryOTP, sendDeliveryConfirmation, sendOutForDeliveryNotification } from '../utils/deliveryOTP.js';

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
      // reduce stock and increment soldCount
      product.stock = Math.max(0, product.stock - qty);
      product.soldCount = (parseInt(product.soldCount) || 0) + qty;
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
        },
        {
          model: User,
          as: 'deliveryPerson',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
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
            },
            {
              model: User,
              as: 'deliveryPerson',
              attributes: ['id', 'name', 'email', 'phone'],
              required: false
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
          customer: order.user,
          deliveryPerson: order.deliveryPerson // Include delivery person details
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
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
    
    // If marking as delivered, also update trackingStatus to remove from delivery person's dashboard
    // This ensures orders are removed from delivery person's dashboard when seller marks as delivered
    if (status === 'delivered') {
      order.trackingStatus = 'delivered';
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
    }
    
    await order.save();

    // Reload order with deliveryPerson association
    await order.reload({
      include: [
        {
          model: User,
          as: 'deliveryPerson',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    // Send delivery confirmation email when order is marked as delivered
    if (status === 'delivered') {
      try {
        if (order.user && order.user.email) {
          await sendDeliveryConfirmation(
            order.user.email,
            order.id,
            order.user.name || order.user.email,
            order.total,
            order.items
          );
          console.log(`Delivery confirmation email sent to ${order.user.email} for order #${order.id}`);
        } else {
          console.warn(`Cannot send delivery confirmation: order #${order.id} has no user email`);
        }
      } catch (emailErr) {
        console.error('Failed to send delivery confirmation:', emailErr);
        // Don't fail the request if email fails
      }
    }

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

// Mark order as out for delivery (wholesaler to retailer, or retailer to consumer)
router.put('/:orderId/out-for-delivery', authMiddleware, async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;
    
    // Only wholesalers and retailers can mark orders as out for delivery
    if (req.user.role !== 'wholesaler' && req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only wholesalers and retailers can mark orders as out for delivery' });
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
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

    // Determine delivery type based on seller role
    const deliveryType = req.user.role === 'wholesaler' 
      ? 'wholesaler_to_retailer' 
      : 'retailer_to_consumer';

    // Update order tracking (OTP will be generated when delivery person requests it)
    order.trackingStatus = 'out_for_delivery';
    order.outForDelivery = new Date();
    order.deliveryType = deliveryType;
    if (deliveryPersonId) {
      order.deliveryPersonId = deliveryPersonId;
    }
    await order.save();

    // Reload order with deliveryPerson association
    await order.reload({
      include: [
        {
          model: User,
          as: 'deliveryPerson',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    // Send "out for delivery" notification email
    try {
      if (order.user && order.user.email) {
        await sendOutForDeliveryNotification(
          order.user.email,
          order.id,
          order.user.name || order.user.email,
          order.deliveryPerson?.name,
          order.deliveryPerson?.phone
        );
        console.log(`Out for delivery notification email sent to ${order.user.email} for order #${order.id}`);
      } else {
        console.warn(`Cannot send out for delivery notification: order #${order.id} has no user email`);
      }
    } catch (emailErr) {
      console.error('Failed to send out for delivery notification:', emailErr);
      // Don't fail the request if email fails
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Mark out for delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request delivery OTP (for delivery persons when they arrive at delivery location)
router.post('/:orderId/request-delivery-otp', authMiddleware, async (req, res) => {
  try {
    // Only delivery persons can request OTP
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery persons can request delivery OTP' });
    }

    const order = await Order.findByPk(req.params.orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify that this order is assigned to this delivery person
    if (order.deliveryPersonId !== req.user.id) {
      return res.status(403).json({ error: 'This order is not assigned to you' });
    }

    // Verify that order is out for delivery
    if (order.trackingStatus !== 'out_for_delivery') {
      return res.status(400).json({ error: 'Order is not out for delivery' });
    }

    // Check if OTP was already sent and is still valid
    if (order.deliveryOTP && order.deliveryOTPExpiresAt && new Date() < new Date(order.deliveryOTPExpiresAt)) {
      return res.json({ 
        success: true, 
        message: 'OTP already sent and still valid',
        otp: order.deliveryOTP // Return OTP for delivery person to see
      });
    }

    // Generate new delivery OTP
    const deliveryOTP = generateDeliveryOTP();
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update order with OTP
    order.deliveryOTP = deliveryOTP;
    order.deliveryOTPExpiresAt = otpExpiresAt;
    await order.save();

    // Send delivery OTP to recipient
    try {
      if (order.user && order.user.email) {
        await sendDeliveryOTP(
          order.user.email,
          order.id,
          deliveryOTP,
          order.user.name || order.user.email
        );
      } else {
        return res.status(400).json({ error: 'Recipient email not found' });
      }
    } catch (emailErr) {
      console.error('Failed to send delivery OTP:', emailErr);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.json({ 
      success: true, 
      message: 'OTP sent to recipient',
      otp: deliveryOTP // Return OTP for delivery person to see/verify
    });
  } catch (err) {
    console.error('Request delivery OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark order as delivered by delivery person (using OTP)
router.put('/:orderId/mark-delivered', authMiddleware, async (req, res) => {
  try {
    const { otp } = req.body; // OTP entered by delivery person
    
    // Only delivery persons can mark orders as delivered
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery persons can mark orders as delivered' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify that this order is assigned to this delivery person
    if (order.deliveryPersonId !== req.user.id) {
      return res.status(403).json({ error: 'This order is not assigned to you' });
    }

    // Verify that order is out for delivery
    if (order.trackingStatus !== 'out_for_delivery') {
      return res.status(400).json({ error: 'Order is not out for delivery' });
    }

    // Verify OTP
    if (!order.deliveryOTP) {
      return res.status(400).json({ error: 'No OTP found for this order. Please request OTP first.' });
    }

    // Check if OTP has expired
    if (order.deliveryOTPExpiresAt && new Date() > new Date(order.deliveryOTPExpiresAt)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    // Verify OTP
    if (order.deliveryOTP !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    // Update order status to delivered
    order.trackingStatus = 'delivered';
    order.deliveredAt = new Date();
    // Clear OTP after successful delivery
    order.deliveryOTP = null;
    order.deliveryOTPExpiresAt = null;
    await order.save();

    // Send delivery confirmation email
    try {
      if (order.user && order.user.email) {
        await sendDeliveryConfirmation(
          order.user.email,
          order.id,
          order.user.name || order.user.email,
          order.total,
          order.items
        );
        console.log(`Delivery confirmation email sent to ${order.user.email} for order #${order.id}`);
      } else {
        console.warn(`Cannot send delivery confirmation: order #${order.id} has no user email`);
      }
    } catch (emailErr) {
      console.error('Failed to send delivery confirmation:', emailErr);
      // Don't fail the request if email fails
    }

    // Reload order with associations
    await order.reload({
      include: [
        {
          model: User,
          as: 'deliveryPerson',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        }
      ]
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Mark delivered error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark order as delivered/received (retailer receiving from wholesaler, or consumer receiving from retailer)
router.put('/:orderId/mark-received', authMiddleware, async (req, res) => {
  try {
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Retailers can mark orders as received when they receive from wholesalers
    // Consumers can mark orders as received when they receive from retailers
    if (req.user.role === 'retailer') {
      // Retailer receiving from wholesaler
      if (order.deliveryType !== 'wholesaler_to_retailer') {
        return res.status(400).json({ error: 'This order is not a wholesaler-to-retailer delivery' });
      }
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only mark your own orders as received' });
      }
    } else if (req.user.role === 'customer') {
      // Consumer receiving from retailer
      if (order.deliveryType !== 'retailer_to_consumer') {
        return res.status(400).json({ error: 'This order is not a retailer-to-consumer delivery' });
      }
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only mark your own orders as received' });
      }
    } else {
      return res.status(403).json({ error: 'Only retailers and consumers can mark orders as received' });
    }

    // For mark-received, we just acknowledge receipt (delivery person already marked it as delivered via OTP)
    // This is for retailers/consumers to confirm they received the order
    // Order should already be marked as delivered by delivery person
    if (order.trackingStatus !== 'delivered') {
      return res.status(400).json({ error: 'Order has not been delivered yet. Please wait for delivery person to complete delivery.' });
    }
    
    // Order is already delivered, just acknowledge receipt (no status change needed)
    // The delivery confirmation email was already sent when delivery person marked it as delivered

    res.json({ success: true, order });
  } catch (err) {
    console.error('Mark received error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders assigned to a delivery person
router.get('/delivery/assigned', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery persons can access this endpoint' });
    }

    const orders = await Order.findAll({
      where: {
        deliveryPersonId: req.user.id,
        trackingStatus: 'out_for_delivery'
      },
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        }
      ],
      order: [['outForDelivery', 'ASC']]
    });

    res.json(orders);
  } catch (err) {
    console.error('Get delivery orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all available delivery persons (for assigning to orders)
router.get('/delivery/persons', authMiddleware, async (req, res) => {
  try {
    // Only wholesalers and retailers can see delivery persons
    if (req.user.role !== 'wholesaler' && req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only sellers can access this endpoint' });
    }

    const deliveryPersons = await User.findAll({
      where: { role: 'delivery' },
      attributes: ['id', 'name', 'email', 'phone']
    });

    res.json(deliveryPersons);
  } catch (err) {
    console.error('Get delivery persons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
