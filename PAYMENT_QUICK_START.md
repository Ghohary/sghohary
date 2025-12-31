# 🚀 Quick Start: Running the Stripe Payment Server

## One-Minute Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy .env.example and add your keys)
cp .env.example .env
# Edit .env and add:
# STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
# STRIPE_SECRET_KEY=sk_test_YOUR_KEY

# 3. Update checkout.js with your publishable key
# Change line 8: const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY';

# 4. Start the server
npm start

# Server runs on http://localhost:5000
```

## Test the Payment

1. Open browser: `http://localhost:8000/checkout.html`
2. Fill in customer details
3. Select "Credit / Debit Card"
4. Use test card: **4242 4242 4242 4242**
5. Any future expiry date (e.g., 12/25)
6. Any 3-digit CVC (e.g., 123)
7. Click "Complete Order"

✅ Payment should succeed!

## Files You Need to Update

| File | Change | Where |
|------|--------|-------|
| `.env` | Add your Stripe keys | Line 2-3 |
| `checkout.js` | Add your publishable key | Line 8 |

## Stripe Test Cards

| Card | Use | Number |
|------|-----|--------|
| Visa | Success | 4242 4242 4242 4242 |
| Visa | Decline | 4000 0000 0000 0002 |
| Mastercard | Success | 5555 5555 5555 4444 |

## Troubleshooting

**Server won't start?**
```bash
# Check port 5000 is free
lsof -i :5000

# If in use, kill it:
kill -9 <PID>

# Then restart:
npm start
```

**Payment fails with CORS error?**
- Make sure server is running on port 5000
- Check API_URL in checkout.js matches: `http://localhost:5000`

**Card element not showing?**
- Check browser console for errors
- Verify Stripe key is correct in checkout.js
- Make sure https://js.stripe.com is accessible

## Next Steps

✅ Get live Stripe keys from dashboard
✅ Deploy server to hosting (Heroku, AWS, DigitalOcean)
✅ Update API_URL in checkout.js to live server
✅ Add email confirmations
✅ Set up webhooks for order events
✅ Add order tracking

---

**Server Status:** Ready to go! 🎉
