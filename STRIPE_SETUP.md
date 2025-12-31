# 🎵 Stripe Payment Integration Setup Guide

## Quick Start: Add Your Stripe Account

### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for free
3. Get your keys from the dashboard

### Step 2: Get Your API Keys
In your Stripe Dashboard:
1. Click **Developers** → **API Keys**
2. You'll see two sets of keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### Step 3: Add Keys to Your Files

#### Option A: For Testing (Development)
Use `pk_test_*` and `sk_test_*` keys

**File 1: checkout.js**
```javascript
// Line 7 - Replace with your publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_KEY';
```

**File 2: .env**
```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
PORT=5000
```

#### Option B: For Production (Live)
Use `pk_live_*` and `sk_live_*` keys
- Same steps above, but with live keys
- Make sure your domain is verified in Stripe

### Step 4: Run the Server
```bash
cd /Users/ghohary/Desktop/sghohary/sghohary
npm install
node server.js
```

You should see: ✅ Payment server running on http://localhost:5000

### Step 5: Test the Checkout

**Test Card Numbers (for pk_test keys):**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Any future date and any CVC (e.g., 12/25, 123)

---

## 🔧 Configuration Details

### Publishable Key (pk_test_*)
- Used in **checkout.js** (frontend/browser)
- Safe to expose publicly
- Controls what Stripe features customers see

### Secret Key (sk_test_*)
- Used in **server.js** (backend)
- KEEP THIS SECRET - never share!
- Processes actual payments

### API Endpoint
- Your server runs on `http://localhost:5000`
- When deployed, change to your domain: `https://yourdomain.com`

---

## 📁 Files That Need Your Keys

1. **checkout.js** (line 7)
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
   ```

2. **.env** (root directory)
   ```
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   PORT=5000
   ```

3. **server.js** (line 6)
   ```javascript
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   ```

---

## 🚀 Deployment Checklist

- [ ] Switch to live keys (`pk_live_*` and `sk_live_*`)
- [ ] Update API_URL in checkout.js to your domain
- [ ] Set environment variables on your hosting
- [ ] Enable webhook notifications in Stripe
- [ ] Test with live card (you'll be charged $0.00 for verification)
- [ ] Enable 3D Secure for additional security
- [ ] Set up email receipts in Stripe settings

---

## 💡 How Payments Work

1. **Customer enters card** → Sent to Stripe Elements (encrypted, not stored)
2. **You request payment intent** → Server creates intent using Secret Key
3. **Customer confirms payment** → Stripe processes via Publishable Key
4. **Order confirmed** → Order saved to localStorage, email sent
5. **Dashboard updated** → New order appears in account.html

---

## 🔒 Security Notes

✅ **Card data never touches your server** - Stripe handles it securely
✅ **PCI DSS Compliant** - You don't store payment information
✅ **SSL/HTTPS Required** - For production (live keys)
✅ **Webhooks** - Optional for order status updates

---

## 📞 Support

- **Stripe Docs:** https://stripe.com/docs
- **Test Mode:** Use test keys to practice
- **Live Mode:** Switch keys when ready

---

**Last Updated:** December 31, 2025
**Version:** Stripe Payment Gateway v1.0

