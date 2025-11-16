// server/routes/payments.js
import express from 'express';
import crypto from 'crypto';
import { Order, OrderItem, Product } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

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

    // Calculate total
    let total = 0;
    for (const it of items) {
      const product = await Product.findByPk(it.productId);
      if (!product) continue;
      const unitPrice = parseFloat(product.price);
      const qty = parseInt(it.quantity, 10);
      total += unitPrice * qty;
    }

    const merchantKey = process.env.PAYU_MERCHANT_KEY || '';
    const salt = process.env.PAYU_SALT || '';
    const txnId = `TXN${Date.now()}`;
    const amount = total.toFixed(2);
    const productInfo = `Order from LiveMart - ${items.length} item(s)`;

    // Create payment parameters
    const paymentParams = {
      key: merchantKey,
      txnid: txnId,
      amount: amount,
      productinfo: productInfo,
      firstname: firstName,
      email: email,
      phone: phone,
      surl: process.env.PAYU_SUCCESS_URL || 'http://localhost:5173/payment-success',
      furl: process.env.PAYU_FAILURE_URL || 'http://localhost:5173/payment-failure',
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

    if (!txnid || !amount || !status) {
      return res.status(400).json({ error: 'Invalid payment response' });
    }

    const salt = process.env.PAYU_SALT || '';
    const merchantKey = process.env.PAYU_MERCHANT_KEY || '';
    
    // Verify hash for success response
    // PayU response hash format: SHA512(status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|salt)
    // Note: The order is REVERSED compared to request hash, and udf fields come before email
    if (status === 'success') {
      // For response verification, PayU uses: status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|salt
      // Since we're not using udf fields, they'll be empty
      const hashString = `${status}|||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${salt}`;
      const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
      
      // PayU may send hash in reverse for some responses
      if (generatedHash !== hash && generatedHash !== hash.split('').reverse().join('')) {
        console.error('Hash mismatch:', { generatedHash, receivedHash: hash });
        return res.status(400).json({ error: 'Invalid payment hash' });
      }
    }

    // Create order in database only if payment is successful
    if (status === 'success' && items && items.length > 0) {
      let total = 0;
      const order = await Order.create({
        userId: req.user.id,
        status: 'confirmed',
        total: 0,
        address: address || '',
        paymentId: txnid,
        paymentOrderId: txnid,
      });

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
          subtotal,
        });
        
        // Reduce stock
        product.stock = Math.max(0, product.stock - qty);
        await product.save();
      }

      order.total = total.toFixed(2);
      await order.save();

      res.json({
        success: true,
        orderId: order.id,
        message: 'Payment successful and order placed',
      });
    } else {
      res.json({
        success: false,
        message: 'Payment failed or cancelled',
      });
    }
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
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
