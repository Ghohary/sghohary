# 💳 Stripe Payment Integration Guide

## Overview

GHOHARY now supports real Stripe credit/debit card payments! This guide walks you through setup and testing.

---

## 🚀 Setup Instructions

### Step 1: Get Stripe API Keys

1. Create a free Stripe account at https://stripe.com
2. Go to **Dashboard** → **Developers** → **API Keys**
3. You'll see two test keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

Keep these safe! Never share the secret key.

### Step 2: Install Node.js Dependencies

```bash
cd /Users/ghohary/Desktop/sghohary/sghohary
npm install
```

This installs:
- `stripe` - Stripe API library
- `express` - Web server
- `cors` - Cross-origin requests
- `dotenv` - Environment configuration

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Stripe keys:
```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE (optional for now)
```

3. Save the file

### Step 4: Update checkout.js with Your Publishable Key

In `checkout.js`, line ~8, replace:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY';
```

With your actual key:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_abc123def456...';
```

### Step 5: Start the Server

```bash
npm start
```

You should see:
```
🚀 Stripe Payment Server running on http://localhost:5000
💳 Ready to process payments with Stripe
```

---

## 🧪 Testing Payments

### Test Card Numbers

Stripe provides test cards for different scenarios:

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| **Success** | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| **Decline** | 4000 0000 0000 0002 | Any future date | Any 3 digits |
| **3D Secure** | 4000 0025 0000 3155 | Any future date | Any 3 digits |

### Test Payment Flow

1. Go to http://localhost:8000/checkout.html
2. Fill in all customer information
3. Select "Credit / Debit Card" as payment method
4. Use test card: **4242 4242 4242 4242**
5. Enter any future expiry date (e.g., 12/25)
6. Enter any 3-digit CVC (e.g., 123)
7. Click "Complete Order"
8. Payment should succeed and redirect to confirmation

---

## 📊 Payment Flow

```
Customer fills checkout form
         ↓
Submits payment with card details
         ↓
checkout.js creates payment intent
         ↓
Server creates PaymentIntent with Stripe
         ↓
Client confirms payment with Stripe
         ↓
Stripe processes card
         ↓
Payment succeeded/failed
         ↓
Order created & email sent
         ↓
Redirect to confirmation page
```

---

## 🔧 File Structure

```
/sghohary/
├── server.js              ← Payment server (runs on port 5000)
├── package.json           ← Dependencies
├── .env                   ← Your secret keys (DO NOT COMMIT)
├── .env.example           ← Template (safe to commit)
├── checkout.html          ← Updated with Stripe Elements
├── checkout.js            ← Updated payment processing
└── styles.css             ← Stripe input styling included
```

---

## 🌐 Server Endpoints

### `POST /create-payment-intent`
Creates a payment intent for the order.

**Request:**
```json
{
  "amount": 1500.50,
  "currency": "aed",
  "metadata": {
    "customer": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_123...secret_abc...",
  "paymentIntentId": "pi_123"
}
```

### `POST /confirm-payment`
Confirms payment status (optional).

**Request:**
```json
{
  "paymentIntentId": "pi_123"
}
```

**Response:**
```json
{
  "status": "succeeded",
  "paymentIntentId": "pi_123"
}
```

### `POST /webhook`
Receives payment events from Stripe (advanced).

---

## 🛡️ Security Best Practices

✅ **DO:**
- Keep `.env` file in `.gitignore`
- Use environment variables for all secrets
- Never hardcode API keys
- Use HTTPS in production
- Validate all inputs server-side
- Store orders securely

❌ **DON'T:**
- Commit `.env` file to GitHub
- Share API keys
- Use publishable key on server
- Trust client-side validation only
- Log sensitive payment data

---

## 💬 Payment Methods

Currently supported:
- ✅ **Credit Cards** - Visa, Mastercard, American Express
- ✅ **Debit Cards** - All major providers
- ✅ **Consultation Payment** - Manual invoice/payment at meeting

Future additions:
- 🔄 Google Pay
- 🔄 Apple Pay
- 🔄 Bank Transfers
- 🔄 Digital Wallets

---

## 📧 Order Confirmation

When a payment succeeds, the order is:
1. **Saved** to localStorage with payment ID
2. **Cleared** from the cart
3. **Stored** with customer details, date, and total
4. **Displayed** on the account page

You should add:
- Email confirmation (using SendGrid or similar)
- SMS notification (using Twilio)
- Order tracking
- Invoice generation

---

## 🚨 Troubleshooting

### "Failed to create payment intent"
- Check server is running on port 5000
- Verify API URL in checkout.js is correct
- Check `.env` file has correct Stripe keys

### "Card declined"
- Use test card 4242 4242 4242 4242
- Check card details are correct
- Try different test card for specific scenario

### "CORS error"
- Ensure server is running
- Check `cors` is installed: `npm install cors`
- Verify server.js has CORS enabled

### Server won't start
- Check Node.js is installed: `node --version`
- Check dependencies: `npm install`
- Check port 5000 is not in use: `lsof -i :5000`

### Stripe Elements not loading
- Verify publishable key in checkout.js
- Check browser console for errors
- Verify https://js.stripe.com is accessible

---

## 🔐 Environment Setup Checklist

- [ ] Created Stripe account
- [ ] Copied publishable key
- [ ] Copied secret key
- [ ] Created `.env` file
- [ ] Added keys to `.env`
- [ ] Updated `checkout.js` with publishable key
- [ ] Ran `npm install`
- [ ] Started server: `npm start`
- [ ] Tested with card 4242 4242 4242 4242
- [ ] Verified payment succeeded
- [ ] Checked order in localStorage

---

## 📚 Additional Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Payment Intents API**: https://stripe.com/docs/payments/payment-intents
- **Stripe Elements**: https://stripe.com/docs/stripe-js/elements/payment-element

---

## 💡 Next Steps

1. **Get Live Keys** - Switch to production when ready
2. **Add Email** - Send confirmation emails via SendGrid
3. **Add Webhooks** - Handle events asynchronously
4. **Add Invoicing** - Generate PDF invoices
5. **Add Analytics** - Track payment metrics
6. **Add Multi-Currency** - Support more currencies
7. **Add Payment Methods** - Add Google Pay, Apple Pay, etc.

---

**Questions?** Check the Stripe dashboard or Stripe documentation.

Good luck! 🎉
