# PayU "Page Not Found" Error - Troubleshooting Guide

## Common Causes

### 1. **URLs Not Accessible to PayU**
PayU needs to be able to access your success/failure URLs. If you're using `localhost`, PayU's servers cannot reach it.

**Solution for Local Development:**
- Use a tunneling service like **ngrok** to create a public URL
- Install ngrok: `npm install -g ngrok` or download from https://ngrok.com
- Start your React app on port 3000
- Run: `ngrok http 3000`
- Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
- Update your `.env`:
  ```env
  PAYU_SUCCESS_URL=https://abc123.ngrok.io/payment-success
  PAYU_FAILURE_URL=https://abc123.ngrok.io/payment-failure
  ```

### 2. **URLs Not Registered in PayU Dashboard**
Some PayU accounts require you to whitelist your redirect URLs.

**Solution:**
1. Log in to your PayU merchant dashboard
2. Go to **Settings** → **Integration** or **API Settings**
3. Add your success and failure URLs to the whitelist
4. Save the changes

### 3. **Incorrect URL Format**
PayU requires absolute URLs with proper protocol.

**Check:**
- ✅ `http://localhost:3000/payment-success` (for local)
- ✅ `https://yourdomain.com/payment-success` (for production)
- ❌ `/payment-success` (relative URL - won't work)
- ❌ `localhost:3000/payment-success` (missing protocol)

### 4. **Port Mismatch**
Ensure the port in your URL matches where your React app is running.

**Check:**
- Your Vite config shows port 3000
- Your `.env` should use port 3000: `http://localhost:3000/payment-success`
- If using a different port, update both

### 5. **React Router Not Handling Direct URLs**
When PayU redirects, it does a full page load. React Router should handle this, but verify:

**Check:**
- Routes are defined in `App.jsx`
- `/payment-success` and `/payment-failure` routes exist
- React app is running when testing

## Diagnostic Steps

### Step 1: Check Server Logs
When you create a payment, check your server console. You should see:
```
PayU Redirect URLs: { 
  successUrl: 'http://localhost:3000/payment-success',
  failureUrl: 'http://localhost:3000/payment-failure',
  mode: 'test',
  merchantKey: '***xxxx'
}
```

### Step 2: Test URLs Manually
1. Make sure your React app is running
2. Open browser and go to: `http://localhost:3000/payment-success`
3. If you see a "Page Not Found" in your app, the route isn't working
4. If you see the PaymentSuccess component, the route is fine

### Step 3: Check PayU Response
After payment, check the browser's Network tab:
1. Look for the redirect request
2. Check the URL PayU is trying to redirect to
3. Verify it matches your configured URLs

### Step 4: Check Browser Console
Open browser DevTools → Console:
- Look for any JavaScript errors
- Check if React Router is handling the route

## Quick Fixes

### Fix 1: Use ngrok for Local Testing
```bash
# Terminal 1: Start your React app
cd client
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the HTTPS URL and update .env
PAYU_SUCCESS_URL=https://your-ngrok-url.ngrok.io/payment-success
PAYU_FAILURE_URL=https://your-ngrok-url.ngrok.io/payment-failure
```

### Fix 2: Verify .env Configuration
Create/update `server/.env`:
```env
# PayU Configuration
PAYU_MERCHANT_KEY=your_key
PAYU_SALT=your_salt
PAYU_MODE=test

# IMPORTANT: Update these URLs
PAYU_SUCCESS_URL=http://localhost:3000/payment-success
PAYU_FAILURE_URL=http://localhost:3000/payment-failure

# Or if using ngrok:
# PAYU_SUCCESS_URL=https://abc123.ngrok.io/payment-success
# PAYU_FAILURE_URL=https://abc123.ngrok.io/payment-failure
```

### Fix 3: Restart Server After .env Changes
After updating `.env`, always restart your server:
```bash
# Stop the server (Ctrl+C)
# Then restart
cd server
npm start
```

## Still Not Working?

1. **Check PayU Merchant Dashboard:**
   - Verify your merchant key and salt are correct
   - Check if there are any URL restrictions in settings
   - Look for any error messages in the dashboard

2. **Contact PayU Support:**
   - They can check if your account has any restrictions
   - They can verify if your URLs are being accepted

3. **Test with Production URLs:**
   - If you have a deployed app, test with production URLs
   - Production URLs (HTTPS) are more reliable than localhost

## Expected Behavior

**Successful Flow:**
1. User clicks "Checkout"
2. Form submits to PayU
3. User completes payment on PayU
4. PayU redirects to: `http://localhost:3000/payment-success?txnid=...&status=success&...`
5. React Router loads PaymentSuccess component
6. Component verifies payment with backend
7. Order is created
8. User sees success message

**If you see PayU's "Page Not Found":**
- PayU cannot reach your URL
- URL is not whitelisted
- URL format is incorrect
- Use ngrok or deploy your app

