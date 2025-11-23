// server/utils/deliveryOTP.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate 6-digit OTP
export const generateDeliveryOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send delivery OTP via email
export const sendDeliveryOTP = async (email, orderId, otp, recipientName) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured');
      throw new Error('Email service not configured');
    }

    const transporter = getTransporter();
    const mailOptions = {
      from: `"LiveMart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your LiveMart Delivery OTP for Order #${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3399cc;">LiveMart Delivery Verification</h2>
          <p>Hello ${recipientName || 'Customer'},</p>
          <p>Your order <strong>#${orderId}</strong> is out for delivery!</p>
          <p>Please provide the following OTP to the delivery person to complete the delivery:</p>
          <div style="background-color: #f0f9ff; border: 2px solid #3399cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #3399cc; margin: 0; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p><strong>Important:</strong> This OTP will expire in 30 minutes. Do not share this OTP with anyone except the delivery person.</p>
          <p>If you didn't expect this delivery, please contact us immediately.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Send delivery OTP error:', err);
    throw err;
  }
};

// Send delivery confirmation email
export const sendDeliveryConfirmation = async (email, orderId, recipientName, orderTotal, items) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured');
      throw new Error('Email service not configured');
    }

    const transporter = getTransporter();
    
    // Format items list
    const itemsList = items.map(item => 
      `<li style="margin: 8px 0;">${item.quantity}x ${item.product?.title || 'Product'} - ₹${parseFloat(item.subtotal || 0).toFixed(2)}</li>`
    ).join('');

    const mailOptions = {
      from: `"LiveMart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your LiveMart Order #${orderId} has been Delivered`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">✓ Order Delivered Successfully!</h2>
          <p>Hello ${recipientName || 'Customer'},</p>
          <p>Great news! Your order <strong>#${orderId}</strong> has been successfully delivered.</p>
          
          <div style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin-top: 0;">Order Summary</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              ${itemsList}
            </ul>
            <p style="margin: 16px 0 0 0; font-size: 18px; font-weight: 600; color: #166534;">
              Total: ₹${parseFloat(orderTotal || 0).toFixed(2)}
            </p>
          </div>

          <p>Thank you for shopping with LiveMart! We hope you enjoy your purchase.</p>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Send delivery confirmation error:', err);
    throw err;
  }
};

// Send "out for delivery" notification email
export const sendOutForDeliveryNotification = async (email, orderId, recipientName, deliveryPersonName, deliveryPersonPhone) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured');
      throw new Error('Email service not configured');
    }

    const transporter = getTransporter();
    const mailOptions = {
      from: `"LiveMart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your LiveMart Order #${orderId} is Out for Delivery`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">🚚 Your Order is Out for Delivery!</h2>
          <p>Hello ${recipientName || 'Customer'},</p>
          <p>Your order <strong>#${orderId}</strong> is now out for delivery and should arrive soon.</p>
          
          ${deliveryPersonName ? `
          <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">Delivery Person Details:</p>
            <p style="margin: 4px 0; color: #374151;"><strong>Name:</strong> ${deliveryPersonName}</p>
            ${deliveryPersonPhone ? `<p style="margin: 4px 0; color: #374151;"><strong>Phone:</strong> ${deliveryPersonPhone}</p>` : ''}
          </div>
          ` : ''}
          
          <p><strong>Please keep your phone handy.</strong> When the delivery person arrives, they will request a delivery OTP to be sent to your email. Please provide this OTP to the delivery person to complete the delivery.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Send out for delivery notification error:', err);
    throw err;
  }
};

