# PayU Money Setup Guide

## Getting Your PayU Money Credentials

### Step 1: Create/Login to PayU Account
1. Go to [https://www.payu.in/](https://www.payu.in/)
2. Sign up for a new merchant account or log in if you already have one
3. Complete the merchant onboarding process

### Step 2: Get Test Mode Credentials (For Development/Testing)
1. After logging in, go to **Merchant Dashboard**
2. Navigate to **Settings** → **API Keys** or **Integration Details**
3. You'll find:
   - **Merchant Key** (also called Merchant ID)
   - **Salt** (Secret Key)
4. Copy both values
   - ⚠️ **Important**: Keep your Salt secret and never share it publicly

### Step 3: Get Live Mode Credentials (For Production)
1. Complete account verification and KYC
2. In the same **Settings** → **API Keys** section
3. Switch to **Production Mode**
4. Copy your **Live Merchant Key** and **Live Salt**
   - ⚠️ **Important**: These are different from test credentials

### Step 4: Add to Environment Variables
Add these to your `server/.env` file:

```env
# PayU Money Configuration
# For Test Mode (Development)
PAYU_MERCHANT_KEY=your_merchant_key_here
PAYU_SALT=your_salt_here
PAYU_MODE=test

# Success and Failure URLs (update with your domain)
# ⚠️ IMPORTANT: PayU cannot access localhost URLs from their servers!
# For local development, use ngrok or a similar tunneling service:
# 1. Install ngrok: https://ngrok.com
# 2. Run: ngrok http 3000
# 3. Use the HTTPS URL provided by ngrok

# For local development with ngrok (RECOMMENDED):
# PAYU_SUCCESS_URL=https://your-ngrok-url.ngrok.io/payment-success
# PAYU_FAILURE_URL=https://your-ngrok-url.ngrok.io/payment-failure

# For local development without ngrok (may not work - PayU servers can't reach localhost):
PAYU_SUCCESS_URL=http://localhost:3000/payment-success
PAYU_FAILURE_URL=http://localhost:3000/payment-failure

# Alternative: Set CLIENT_PORT if your client runs on a different port
# CLIENT_PORT=5173
# Or set the full base URL:
# CLIENT_BASE_URL=http://localhost:5173

# For Live Mode (Production) - uncomment and use these instead
# PAYU_MERCHANT_KEY=your_live_merchant_key_here
# PAYU_SALT=your_live_salt_here
# PAYU_MODE=live
# PAYU_SUCCESS_URL=https://yourdomain.com/payment-success
# PAYU_FAILURE_URL=https://yourdomain.com/payment-failure
```

### Test Mode vs Live Mode

- **Test Mode**: 
  - Use test credentials
  - Payment URL: `https://test.payu.in/_payment`
  - No real money is charged
  - Use test card numbers (see below)
  - Perfect for development and testing

- **Live Mode (Production)**:
  - Use live credentials
  - Payment URL: `https://secure.payu.in/_payment`
  - Real money transactions
  - Requires account verification and KYC
  - Use only after thorough testing

### Test Card Numbers (Sandbox Mode Only)
When testing in test mode, you can use these test cards:

**Success Cards:**
- Card Number: `5123456789012346`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)
- Name: Any name
- **OTP: `123456`** ⚠️ (Required during test mode)

**Failure Cards:**
- Card Number: `4012001037141112` (for failure)
- Expiry: Any future date
- CVV: Any 3 digits
- **OTP: `123456`** ⚠️ (Required during test mode)

**Important:** PayU's test environment requires OTP verification to simulate real payment scenarios. After entering test card details, you'll be prompted for an OTP. Always use **`123456`** as the OTP during testing.

For more test cards and scenarios, see: [PayU Test Cards](https://docs.payu.in/docs/test-cards)

### How PayU Money Integration Works

1. **User clicks "Proceed to Checkout"** in the cart
2. **Backend creates payment request** with hash generation
3. **Form is submitted** to PayU payment page
4. **User completes payment** on PayU's secure page
5. **PayU redirects back** to success/failure URL
6. **Backend verifies payment** using hash verification
7. **Order is created** in database if payment successful

### Important Notes

- ⚠️ **Never commit your `.env` file to version control**
- ⚠️ **Never share your Salt publicly**
- ⚠️ **Use test credentials for development, live credentials only in production**
- ⚠️ **Update SUCCESS_URL and FAILURE_URL to match your domain**
- ⚠️ **PayU requires HTTPS in production mode**

### Hash Generation

PayU uses SHA-512 hash for security. The hash is generated using:
```
Hash String = key|txnid|amount|productinfo|firstname|email|salt
Final Hash = SHA-512(Hash String)
```

The backend automatically generates this hash when creating payment requests.

### OTP Verification in Test Mode

⚠️ **Important:** PayU's test environment requires OTP verification even in test mode. This is expected behavior to simulate real payment scenarios.

**When testing:**
1. Enter test card details (e.g., `5123456789012346`)
2. You'll be prompted for an OTP
3. **Always use `123456` as the OTP** during testing
4. Complete the payment process

This OTP requirement is only in test mode. In production, users will receive real OTPs on their registered mobile numbers.

### Troubleshooting

1. **Payment not redirecting / Page not found error**: 
   - Check your `PAYU_SUCCESS_URL` and `PAYU_FAILURE_URL` in `.env`
   - Ensure the URLs match your actual client URL (default is `http://localhost:3000`)
   - Make sure your React app is running when testing
   - Verify the routes `/payment-success` and `/payment-failure` exist in your React Router
   - Check server logs for the actual URLs being sent to PayU

2. **Hash verification failing**: Ensure your Salt is correct and matches the mode (test/live)

3. **Payment page not loading**: Verify your Merchant Key is correct

4. **Order not created**: Check backend logs for verification errors

5. **OTP prompt during testing**: This is normal! Use `123456` as the OTP

6. **"Page not found" after successful payment**:
   - ⚠️ **MOST COMMON ISSUE**: PayU cannot access `localhost` URLs from their servers
   - **Solution**: Use **ngrok** for local testing:
     ```bash
     # Install ngrok: https://ngrok.com
     # Start your React app on port 3000
     ngrok http 3000
     # Copy the HTTPS URL and update .env:
     PAYU_SUCCESS_URL=https://your-ngrok-url.ngrok.io/payment-success
     PAYU_FAILURE_URL=https://your-ngrok-url.ngrok.io/payment-failure
     ```
   - Verify `PAYU_SUCCESS_URL` points to the correct URL where your React app is running
   - Check that your React app is accessible at that URL
   - Ensure React Router is properly configured with the `/payment-success` route
   - Check browser console and network tab for any errors
   - See `PAYU_TROUBLESHOOTING.md` for detailed troubleshooting steps

For more help, refer to [PayU Documentation](https://docs.payu.in/)

