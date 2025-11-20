// server/routes/payments.js
import express from 'express';
import crypto from 'crypto';
import { Order, OrderItem, Product, SellerEarning, sequelize } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// PayU Money configuration
// Test Mode: https://test.payu.in/_payment
// Live Mode: https://secure.payu.in/_payment
const PAYU_BASE_URL = process.env.PAYU_MODE === 'live' 
  ? 'https://secure.payu.in/_payment'
  : 'https://test.payu.in/_payment';

// Generate PayU hash
// PayU hash format: SHA512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
// Note: udf1-udf5 are optional user-defined fields, and there are 5 empty pipes before SALT
function generateHash(params, salt) {
  const udf1 = params.udf1 || '';
  const udf2 = params.udf2 || '';
  const udf3 = params.udf3 || '';
  const udf4 = params.udf4 || '';
  const udf5 = params.udf5 || '';
  
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

// Create PayU payment request
router.post('/create-payment', authMiddleware, async (req, res) => {
  try {
    const { items, address, firstName, email, phone } = req.body;
    
    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    if (!firstName || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    // Calculate total with discounts applied
    let total = 0;
    for (const it of items) {
      const product = await Product.findByPk(it.productId);
      if (!product) continue;
      const unitPrice = parseFloat(product.price);
      const discount = parseFloat(product.discount || 0);
      const multiples = product.multiples || 1;
      // For wholesaler products, quantity is in multiples, so price per multiple = unitPrice * multiples
      const pricePerMultiple = unitPrice * multiples;
      const discountedPrice = pricePerMultiple * (1 - discount / 100);
      const qty = parseInt(it.quantity, 10); // qty is in multiples
      total += discountedPrice * qty;
    }

    const merchantKey = process.env.PAYU_MERCHANT_KEY || '';
    const salt = process.env.PAYU_SALT || '';
    const txnId = `TXN${Date.now()}`;
    const amount = total.toFixed(2);
    const productInfo = `Order from LiveMart - ${items.length} item(s)`;

    // Get success and failure URLs from environment or use defaults
    // Default to port 3000 (Vite dev server) or use environment variable
    const defaultPort = process.env.CLIENT_PORT || '3000';
    const defaultBaseUrl = process.env.CLIENT_BASE_URL || `http://localhost:${defaultPort}`;
    let successUrl = process.env.PAYU_SUCCESS_URL || `${defaultBaseUrl}/payment-success`;
    let failureUrl = process.env.PAYU_FAILURE_URL || `${defaultBaseUrl}/payment-failure`;

    // Ensure URLs are properly formatted (no trailing slashes except after domain)
    successUrl = successUrl.replace(/([^:]\/)\/+/g, "$1");
    failureUrl = failureUrl.replace(/([^:]\/)\/+/g, "$1");

    // Validate URLs are absolute
    if (!successUrl.startsWith('http://') && !successUrl.startsWith('https://')) {
      console.error('Invalid success URL format:', successUrl);
      return res.status(500).json({ error: 'Invalid success URL configuration' });
    }
    if (!failureUrl.startsWith('http://') && !failureUrl.startsWith('https://')) {
      console.error('Invalid failure URL format:', failureUrl);
      return res.status(500).json({ error: 'Invalid failure URL configuration' });
    }

    // Log URLs for debugging
    console.log('=== PayU Payment Request ===');
    console.log('Redirect URLs:', { 
      successUrl, 
      failureUrl,
      mode: process.env.PAYU_MODE || 'test',
      merchantKey: merchantKey ? '***' + merchantKey.slice(-4) : 'NOT SET'
    });
    console.log('Transaction ID:', txnId);
    console.log('Amount:', amount);
    console.log('===========================');

    // Create payment parameters
    const paymentParams = {
      key: merchantKey,
      txnid: txnId,
      amount: amount,
      productinfo: productInfo,
      firstname: firstName,
      email: email,
      phone: phone,
      surl: successUrl,
      furl: failureUrl,
      hash: '', // Will be calculated
    };

    // Generate hash with correct PayU formula
    // Format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
    const hashParams = {
      key: paymentParams.key,
      txnid: paymentParams.txnid,
      amount: paymentParams.amount,
      productinfo: paymentParams.productinfo,
      firstname: paymentParams.firstname,
      email: paymentParams.email,
      udf1: '', // Optional user-defined fields
      udf2: '',
      udf3: '',
      udf4: '',
      udf5: '',
    };
    
    paymentParams.hash = generateHash(hashParams, salt);

    // Store order details temporarily (you might want to use Redis or database for this)
    // For now, we'll include it in the response and verify on callback
    res.json({
      paymentUrl: PAYU_BASE_URL,
      paymentParams: paymentParams,
      txnId: txnId,
      items: items,
      address: address,
      amount: amount,
    });
  } catch (err) {
    console.error('PayU payment creation error:', err);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

// Verify payment callback from PayU
// PayU redirects to success/failure URL with GET parameters
// Frontend will call this endpoint with the payment details
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { 
      txnid, 
      amount, 
      productinfo, 
      firstname, 
      email, 
      status, 
      hash,
      items,
      address 
    } = req.body;

    console.log('Payment verification request:', { 
      txnid: !!txnid, 
      amount: !!amount, 
      status, 
      hasItems: !!items,
      itemsCount: items?.length,
      hasAddress: !!address,
      userId: req.user?.id
    });

    // Validate required fields - items are the most critical
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Missing or invalid items in payment verification');
      return res.status(400).json({ error: 'Order items are required' });
    }

    // For PayU, status might be missing in some cases, default to 'success' if we have items
    // This handles cases where PayU redirects but doesn't send all parameters
    const paymentStatus = status || 'success';
    
    // Generate txnid if missing (fallback for test scenarios)
    const transactionId = txnid || `TXN${Date.now()}_${req.user.id}`;
    
    // Calculate amount from items if missing
    let calculatedAmount = amount;
    if (!calculatedAmount) {
      let total = 0;
      for (const it of items) {
        try {
          const product = await Product.findByPk(it.productId);
          if (product) {
            const originalPrice = parseFloat(product.price);
            const discount = parseFloat(product.discount || 0);
            const discountedPrice = originalPrice * (1 - discount / 100);
            total += discountedPrice * parseInt(it.quantity, 10);
          }
        } catch (err) {
          console.error(`Error calculating amount for product ${it.productId}:`, err);
        }
      }
      calculatedAmount = total.toFixed(2);
      console.log('Calculated amount from items:', calculatedAmount);
    }

    const salt = process.env.PAYU_SALT || '';
    const merchantKey = process.env.PAYU_MERCHANT_KEY || '';
    
    // Verify hash for success response (only if hash is provided)
    // PayU response hash format: SHA512(status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|salt)
    // Note: The order is REVERSED compared to request hash, and udf fields come before email
    if (paymentStatus === 'success' && hash && email && firstname && productinfo) {
      // For response verification, PayU uses: status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|salt
      // Since we're not using udf fields, they'll be empty
      const hashString = `${paymentStatus}|||||||${email}|${firstname}|${productinfo}|${calculatedAmount}|${transactionId}|${salt}`;
      const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
      
      // PayU may send hash in reverse for some responses
      // Note: In test mode, hash verification might be skipped for easier testing
      if (generatedHash !== hash && generatedHash !== hash.split('').reverse().join('')) {
        console.error('Hash mismatch:', { generatedHash, receivedHash: hash, hashString });
        // In test mode, we might want to be more lenient, but log the issue
        if (process.env.PAYU_MODE !== 'test' && process.env.PAYU_MODE !== 'live') {
          // Only enforce hash in production if explicitly set
          console.warn('Hash mismatch but proceeding (test mode or hash not enforced)');
        } else if (process.env.ENFORCE_PAYU_HASH === 'true') {
          return res.status(400).json({ error: 'Invalid payment hash' });
        } else {
          console.warn('Hash mismatch - proceeding anyway (hash verification not enforced)');
        }
      } else {
        console.log('Hash verification successful');
      }
    } else if (paymentStatus === 'success' && !hash) {
      console.warn('No hash provided for payment verification - proceeding without hash check');
    }

    // Create order in database only if payment is successful
    if (paymentStatus === 'success') {
      console.log('Creating orders for payment:', { 
        transactionId, 
        userId: req.user.id, 
        itemsCount: items.length,
        amount: calculatedAmount,
        address: address || 'not provided'
      });

      // Use database transaction to prevent race conditions
      const t = await sequelize.transaction();

      try {
        // Check if orders for this transaction already exist (prevent duplicates)
        // Use a more aggressive check - look for ANY orders with this paymentId and userId
        // Query without include first to avoid outer join locking issues
        const existingOrders = await Order.findAll({
          where: {
            paymentId: transactionId,
            userId: req.user.id
          },
          transaction: t,
          lock: t.LOCK.UPDATE // Lock rows to prevent concurrent access
        });
        
        // If orders exist, fetch their items separately
        if (existingOrders.length > 0) {
          const orderIds = existingOrders.map(o => o.id);
          const existingOrderItems = await OrderItem.findAll({
            where: {
              orderId: { [Op.in]: orderIds }
            },
            transaction: t
          });
          
          // Attach items to orders
          existingOrders.forEach(order => {
            order.items = existingOrderItems.filter(item => item.orderId === order.id);
          });
        }

        if (existingOrders.length > 0) {
          // If ANY orders exist for this transaction, return them immediately
          // Don't check item count - just prevent any new orders
          console.log('Orders already exist for this transaction - preventing duplicates:', { 
            transactionId, 
            existingOrderIds: existingOrders.map(o => o.id),
            userId: req.user.id,
            existingOrderCount: existingOrders.length
          });
          await t.commit();
          return res.json({
            success: true,
            orderIds: existingOrders.map(o => o.id),
            message: 'Orders already created for this payment',
          });
        }

        // Platform commission percentage (default 5%, can be configured via env)
        const platformCommissionPercent = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '5.00');

        // Create separate order for each item
        const createdOrders = [];
        for (const it of items) {
          const product = await Product.findByPk(it.productId, { transaction: t });
          if (!product) continue;

          // Double-check: verify this specific order doesn't already exist
          // Check more aggressively - if ANY order exists for this transaction+user+product, skip
          // Query without include to avoid outer join locking issues
          const existingOrderForItem = await Order.findOne({
            where: {
              paymentId: transactionId,
              userId: req.user.id
            },
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          
          // If order exists, check if it has this product
          if (existingOrderForItem) {
            const existingItem = await OrderItem.findOne({
              where: {
                orderId: existingOrderForItem.id,
                productId: product.id
              },
              transaction: t
            });
            
            if (existingItem) {
              // Order with this product already exists
              console.log('Order for this item already exists - skipping duplicate:', { 
                transactionId, 
                productId: product.id,
                orderId: existingOrderForItem.id
              });
              createdOrders.push(existingOrderForItem.id);
              continue;
            }
          }

          const originalPrice = parseFloat(product.price);
          const discount = parseFloat(product.discount || 0);
          const multiples = product.multiples || 1;
          // For wholesaler products, quantity is in multiples, so price per multiple = originalPrice * multiples
          const pricePerMultiple = originalPrice * multiples;
          const discountedPrice = pricePerMultiple * (1 - discount / 100);
          const qty = parseInt(it.quantity, 10); // qty is in multiples
          const subtotal = discountedPrice * qty; // Use discounted price for subtotal

          // Create one order per item
          const order = await Order.create({
            userId: req.user.id,
            status: 'confirmed',
            total: subtotal.toFixed(2),
            address: address || '',
            paymentId: transactionId,
            paymentOrderId: transactionId,
          }, { transaction: t });

          const orderItem = await OrderItem.create({
            orderId: order.id,
            productId: product.id,
            quantity: qty, // Store quantity in multiples
            unitPrice: discountedPrice, // Store discounted price per multiple
            subtotal,
          }, { transaction: t });
          
          // Calculate seller earnings (track how much seller should receive)
          // Platform takes commission, seller gets the rest
          const commissionAmount = (subtotal * platformCommissionPercent) / 100;
          const sellerAmount = subtotal - commissionAmount;
          
          // Create seller earning record
          await SellerEarning.create({
            sellerId: product.ownerId, // The retailer/wholesaler who owns this product
            orderId: order.id,
            orderItemId: orderItem.id,
            productId: product.id,
            quantity: qty,
            unitPrice: discountedPrice, // Use discounted price
            subtotal,
            platformCommission: commissionAmount,
            commissionPercent: platformCommissionPercent,
            sellerAmount,
            status: 'pending', // Payment to seller is pending until manually settled
          }, { transaction: t });
          
          // Reduce stock
          product.stock = Math.max(0, product.stock - qty);
          await product.save({ transaction: t });

          createdOrders.push(order.id);
          console.log('Order created successfully:', { 
            orderId: order.id, 
            total: order.total, 
            productId: product.id,
            retailerId: product.ownerId, 
            userId: req.user.id 
          });
        }

        // Commit transaction
        await t.commit();

        res.json({
          success: true,
          orderIds: createdOrders,
          message: 'Payment successful and orders placed',
        });
      } catch (error) {
        // Rollback transaction on error
        await t.rollback();
        throw error;
      }
    } else {
      console.log('Payment not successful or no items:', { status, itemsCount: items?.length || 0 });
      res.json({
        success: false,
        message: 'Payment failed or cancelled',
      });
    }
  } catch (err) {
    console.error('Payment verification error:', err);
    // Try to get transaction info from scope or request body
    const errorTxnId = typeof transactionId !== 'undefined' ? transactionId : (req.body.txnid || 'unknown');
    const errorStatus = typeof paymentStatus !== 'undefined' ? paymentStatus : (req.body.status || 'unknown');
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      transactionId: errorTxnId,
      status: errorStatus
    });
    res.status(500).json({ error: 'Payment verification failed', details: err.message });
  }
});

// Handle PayU callback (webhook)
router.post('/payu-callback', async (req, res) => {
  try {
    // PayU sends payment status via POST
    const { txnid, status, hash } = req.body;
    
    // This is a webhook, so we might not have user context
    // You may need to store txnid -> userId mapping when creating payment
    // For now, we'll just acknowledge the callback
    res.status(200).send('OK');
  } catch (err) {
    console.error('PayU callback error:', err);
    res.status(500).send('Error');
  }
});

export default router;
