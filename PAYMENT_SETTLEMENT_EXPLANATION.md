# Payment Settlement System - Explanation

## The Problem You Identified

**Where is PayU Money sending the money?**

Currently, **ALL payments go to a single PayU merchant account** configured via `PAYU_MERCHANT_KEY` and `PAYU_SALT` environment variables. This is the platform owner's account.

**The Issue:**
- Retailers and wholesalers didn't enter any payment account details
- There's no mechanism to split payments or route money to individual sellers
- All money accumulates in the platform's PayU account
- Sellers have no way to receive their earnings

## What I've Implemented

I've created a **payment settlement tracking system** that:

### 1. **Tracks Seller Earnings** ✅
   - Every time a payment is successful, the system now:
     - Calculates how much each seller (retailer/wholesaler) should receive
     - Deducts a platform commission (default 5%, configurable via `PLATFORM_COMMISSION_PERCENT` env var)
     - Creates a `SellerEarning` record for each product sold
     - Tracks the status: `pending` → `settled`

### 2. **Payment Account Storage** ✅
   - Added fields to User model for retailers/wholesalers:
     - Bank account details (name, number, IFSC, bank name)
     - UPI ID
     - PayU merchant key (if seller has their own PayU account)

### 3. **Seller Earnings API** ✅
   - **GET `/api/earnings/my-earnings`** - Sellers can view:
     - All their earnings (pending and settled)
     - Total pending amount
     - Total settled amount
     - Commission deducted
     - Order details for each earning
   
   - **GET `/api/earnings/payment-info`** - View payment account details
   - **PUT `/api/earnings/payment-info`** - Update payment account details

### 4. **Admin Settlement Tools** ✅
   - **GET `/api/earnings/pending`** - View all pending earnings grouped by seller
   - **POST `/api/earnings/settle`** - Mark earnings as settled (after manual transfer)

## How It Works Now

### Payment Flow:
1. Customer pays → Money goes to **platform's PayU account** (still the same)
2. Payment verified → System creates:
   - Order record
   - OrderItem records
   - **SellerEarning records** (NEW!) - tracks how much each seller should receive
3. Money stays in platform account, but system tracks who should get what

### Settlement Flow:
1. Admin views pending earnings via `/api/earnings/pending`
2. Admin manually transfers money to sellers (via bank transfer, UPI, etc.)
3. Admin marks earnings as settled via `/api/earnings/settle`
4. Sellers can view their earnings and settlement status

## Database Changes

### New Model: `SellerEarning`
Tracks:
- Which seller should receive payment
- Which order/product it's from
- Amount seller should receive
- Platform commission deducted
- Settlement status

### Updated Model: `User`
Added payment account fields for retailers/wholesalers:
- `bankAccountName`
- `bankAccountNumber`
- `bankIFSC`
- `bankName`
- `upiId`
- `payuMerchantKey`

## Next Steps (Manual Process)

Since PayU doesn't automatically split payments, you'll need to:

1. **Sellers add payment info:**
   - Sellers should update their payment account details via the API
   - Or you can add a UI form in the retailer/wholesaler dashboards

2. **Regular settlement:**
   - Periodically (daily/weekly), check pending earnings
   - Transfer money from your PayU account to sellers' bank accounts/UPI
   - Mark earnings as settled

3. **Future automation options:**
   - Use PayU's marketplace/split payment features (if available)
   - Integrate with payment gateway APIs for automated transfers
   - Use Razorpay/RazorpayX for better marketplace support

## Environment Variables

Add to your `.env` file:
```env
# Platform commission percentage (default: 5%)
PLATFORM_COMMISSION_PERCENT=5.00
```

## Important Notes

⚠️ **Current Limitation:** Money still goes to the platform account. The system now **tracks** who should receive what, but **actual transfers must be done manually** or through another payment system.

✅ **What's Fixed:** The system now knows exactly how much each seller should receive, when, and for which orders. This enables proper accounting and settlement.

