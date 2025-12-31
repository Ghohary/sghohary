# 🎵 Your Stripe Integration is Ready!

## What's Already Set Up

✅ Stripe Elements card input
✅ Payment intent creation on backend
✅ Secure payment processing
✅ Order confirmation system
✅ Test mode configured

---

## 🔑 Step 1: Get Your Stripe Keys

1. Go to **https://dashboard.stripe.com/apikeys**
2. Login with your Stripe account
3. You'll see:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

---

## 🔧 Step 2: Add Your Publishable Key

### File: `checkout.js` (Line 8)

**Find this:**
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY';
```

**Replace with your key:**
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QVEzSDJuJG4KKk0YlF0wJ1K4PXLQgHJXfpPVJqXlI4vIH0a4oVpRNw4zt4yI2iQYAEZQ1uZZVZQfSmNwXvN0VTw00qK0qZvfC';
```

---

## 🔐 Step 3: Add Your Secret Key

### File: `.env` 

**Create a `.env` file in root directory if it doesn't exist:**

```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
PORT=5000
```

Or copy from `.env.example`:
```bash
cp .env.example .env
```

Then edit and add your keys.

---

## 🚀 Step 4: Start the Server

```bash
cd /Users/ghohary/Desktop/sghohary/sghohary
npm install
node server.js
```

You should see:
```
✅ Stripe payment server running on http://localhost:5000
```

---

## 🧪 Step 5: Test with Demo Cards

Visit: **http://localhost:8000/checkout.html**

**Test Cards (Test Mode Only):**
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`
- 🔐 3D Secure: `4000 0025 0000 3155`

Use any future expiry date (e.g., 12/25) and any CVC (e.g., 123)

---

## 💳 How Customer Payment Flow Works

1. **Customer enters card** → Card Element (client-side)
2. **Customer submits form** → Server creates Payment Intent
3. **Stripe charges card** → Secure processing
4. **Order confirmed** → Success page with order number
5. **Email sent** → Confirmation to customer email

---

## 🔄 Going Live (Production)

When ready to accept real payments:

1. Switch to **Live Keys** in Stripe Dashboard
2. Update `checkout.js` line 8 with live key (`pk_live_...`)
3. Update `.env` with live secret key (`sk_live_...`)
4. Change API_URL to your domain: `https://yourdomain.com`
5. Enable webhook in Stripe (optional but recommended)
6. Test with real card (Stripe will charge $0.00 for verification)

---

## 📊 Stripe Dashboard Features

After a customer pays:
- Check **Payments** tab to see transaction
- View customer email and order details
- Refund payments if needed
- Check payout schedule (usually 2 days)

---

## 🆘 Troubleshooting

**❌ "Invalid Stripe Publishable Key"**
- Check your key starts with `pk_test_` or `pk_live_`
- Verify you copied the entire key
- Reload page after changes

**❌ "Cannot connect to server"**
- Make sure `node server.js` is running
- Check PORT=5000 in your .env file
- Look for errors in terminal

**❌ "Card declined"**
- Using correct test card for mode? (test cards only work in test mode)
- Try different test card number
- Check browser console for error messages

**❌ "CORS error"**
- Make sure server is running on localhost:5000
- Ensure `checkout.html` is on localhost:8000
- Check API_URL matches in checkout.js

---

## ✨ Your Stripe Account Details

Visit **https://dashboard.stripe.com** to see:
- ✅ All transactions
- ✅ Customer information
- ✅ Payout history
- ✅ Dispute/refund management
- ✅ API logs and webhooks

---

**That's it!** Your GHOHARY checkout is ready to accept payments. 💎

