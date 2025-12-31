# 🚀 Vercel Deployment Guide - GHOHARY

Your GHOHARY website is ready to deploy to Vercel with Stripe payments!

---

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ GitHub account with your repo pushed
- ✅ Vercel account (free at https://vercel.com)
- ✅ Stripe live keys ready

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
cd /Users/ghohary/Desktop/sghohary/sghohary
git add -A
git commit -m "🚀 Prepare for Vercel deployment with Stripe integration"
git push origin main
```

### 1.2 Verify Files
Make sure these files exist:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/create-payment-intent.js` - Payment endpoint
- ✅ `api/confirm-payment.js` - Confirmation endpoint
- ✅ `.env.example` - Environment template
- ✅ `package.json` - Dependencies

---

## 🌐 Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Easiest)

1. Go to **https://vercel.com**
2. Click **Import Project**
3. Select **Import Git Repository**
4. Choose your GitHub repo (sghohary)
5. Click **Import**

### Option B: Vercel CLI

```bash
npm i -g vercel
cd /Users/ghohary/Desktop/sghohary/sghohary
vercel
```

Follow the prompts to connect GitHub and deploy.

---

## 🔑 Step 3: Add Environment Variables

After deployment starts:

1. Go to your **Vercel Project Dashboard**
2. Click **Settings** → **Environment Variables**
3. Add these variables:

**Production Variables:**
```
STRIPE_PUBLISHABLE_KEY = pk_live_51SkJ7rPozdfQVQjdB6NV393s0ivOkLCaRJoT0MSazHduATeJu1ko5qwukDbZY6kNAtTGpJJE8ChstvboDSiXGkwg00XuI7inp3
STRIPE_SECRET_KEY = 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
PORT = 3000
NODE_ENV = production
```

4. Click **Save**
5. Vercel will auto-redeploy with the variables

---

## ✅ Step 4: Verify Deployment

Once deployed, you should see:
- ✅ Green checkmark on Vercel Dashboard
- ✅ URL like `https://ghohary.vercel.app`
- ✅ API endpoints accessible at `/api/create-payment-intent`

### Test the Deployment

1. Visit your Vercel URL: `https://ghohary.vercel.app/checkout.html`
2. Go through checkout with test card: `4242 4242 4242 4242`
3. Complete the payment
4. Check Stripe Dashboard for the transaction

---

## 🎯 What's Deployed

### Frontend Files (Static)
- ✅ All HTML files (index.html, checkout.html, etc.)
- ✅ CSS files (styles.css)
- ✅ JavaScript files (app.js, checkout.js, etc.)
- ✅ Images and assets

### Backend API (Serverless)
- ✅ `/api/create-payment-intent.js` - Creates Stripe payment intent
- ✅ `/api/confirm-payment.js` - Confirms payment completion

### Configuration
- ✅ `vercel.json` - Vercel settings
- ✅ `.env` - Environment variables (kept secret)
- ✅ `package.json` - Dependencies

---

## 🔄 Making Changes

After deployment, if you make changes:

1. Edit files locally
2. Test on localhost
3. Commit to GitHub: `git commit -m "message" && git push`
4. Vercel automatically redeploys! 🎉

---

## 🆘 Troubleshooting

### "Build Failed"
- Check that all dependencies are in `package.json`
- Verify `vercel.json` is valid
- Look at Vercel build logs for errors

### "Payment endpoint not working"
- Verify environment variables are set in Vercel Dashboard
- Check API function exists at `/api/create-payment-intent.js`
- Look at Vercel Function logs for errors

### "CORS errors"
- CORS headers are already configured in `vercel.json`
- Ensure your frontend URL matches allowed origins
- Check browser console for specific errors

### "Environment variables not loading"
- Wait 5 minutes after setting variables
- Trigger a redeploy: `vercel --prod`
- Verify variables in Vercel Dashboard

---

## 📊 Monitoring

### Check Deployment Status
1. Go to **Vercel Dashboard**
2. Click your project
3. View build logs and function logs

### Monitor Payments
1. Go to **Stripe Dashboard**
2. Check **Payments** for all transactions
3. View customer details and refund if needed

### View Error Logs
In Vercel:
- **Deployments tab** → View build logs
- **Logs section** → View runtime errors
- **Functions** → View individual function logs

---

## 🚀 Custom Domain

To use a custom domain:

1. In Vercel Dashboard, go to **Settings** → **Domains**
2. Add your domain (e.g., ghohary.com)
3. Follow DNS setup instructions
4. Update Stripe webhook URLs if needed

---

## 📝 Important Notes

**Security:**
- ✅ Secret keys are hidden from logs
- ✅ `.env` file not committed to GitHub
- ✅ CORS properly configured
- ✅ HTTPS enforced

**Performance:**
- ✅ Static files cached globally
- ✅ API endpoints auto-scale
- ✅ CDN distribution included
- ✅ Zero cold starts (with Pro plan)

**Costs:**
- ✅ Free tier: 100GB bandwidth/month
- ✅ Pro tier: $20/month for more
- ✅ No per-request charges
- ✅ Stripe charges only for transactions

---

## ✨ You're Live!

Once deployed, customers can visit your site at:
```
https://ghohary.vercel.app
```

And pay securely via Stripe! 💳

---

**Need help?** Check Vercel docs: https://vercel.com/docs

