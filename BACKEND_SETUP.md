# Complete Setup Guide: GHOHARY E-Commerce Backend

This guide will walk you through setting up your backend system to manage **450+ products, inventory, and payments**.

## 📊 Architecture Overview

```
Frontend (Your current site)
        ↓
    Stripe Payment
        ↓
Backend (Node.js + Express)
        ↓
MongoDB (Database)
        ↓
Cloudinary (Image Storage)
```

## 🔧 Step 1: Set Up MongoDB Atlas (Free)

1. **Go to**: https://www.mongodb.com/cloud/atlas
2. **Click**: "Try Free"
3. **Create Account**: Sign up with email
4. **Create Cluster**:
   - Select "M0 Sandbox" (free forever)
   - Choose region closest to you
   - Click "Create"
5. **Wait**: 1-2 minutes for cluster creation
6. **Get Connection String**:
   - Click "Database" → "Connect"
   - Choose "Drivers"
   - Copy the connection string
   - Replace `<password>` with your database password
   - It should look like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ghohary?retryWrites=true&w=majority
   ```
7. **Whitelist IP** (Important):
   - Click "Network Access"
   - Click "Add IP Address"
   - Select "Allow from anywhere" (or add your IP)

## 🎨 Step 2: Set Up Cloudinary (Free)

1. **Go to**: https://cloudinary.com/
2. **Sign Up**: Create free account
3. **Go to Dashboard**:
   - Copy your **Cloud Name**
   - Under API Keys, copy your **API Key**
   - Copy your **API Secret**
4. **Note these three values** for `.env` file

## 💳 Step 3: Set Up Stripe (Free for Testing)

1. **Go to**: https://stripe.com/
2. **Sign Up**: Create account
3. **Get Test Keys**:
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Copy **Secret Key** (starts with `sk_test_`)
   - Copy **Publishable Key** (starts with `pk_test_`)
4. **Note**: Use test keys for development!

## 🚀 Step 4: Install Backend

### Option A: Using Terminal (Recommended)

```bash
# Navigate to backend folder
cd /Users/ghohary/Desktop/sghohary/sghohary-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use VS Code to open it
```

### What to Put in `.env`:

```env
PORT=5000
NODE_ENV=development

# MongoDB - paste your connection string here
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ghohary?retryWrites=true&w=majority

# Cloudinary - from dashboard
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe - from dashboard
STRIPE_SECRET_KEY=sk_test_your_actual_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key

# JWT Secret - make this random
JWT_SECRET=super_secret_key_change_in_production_12345

# Frontend
FRONTEND_URL=http://localhost:3000
```

**Save the file** (Ctrl+S or Cmd+S)

## ✅ Step 5: Start Backend Server

```bash
# In the backend folder
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 GHOHARY Backend running on port 5000
📍 API: http://localhost:5000
```

## 🔐 Step 6: Create Admin Account

### Quick Way (Using MongoDB Compass):

1. Download MongoDB Compass: https://www.mongodb.com/products/tools/compass
2. Connect with your MongoDB URI
3. Go to Database: `ghohary` → Collection: `admins`
4. Insert Document:

```json
{
  "email": "admin@ghohary.com",
  "password": "hashedpasswordhere",
  "name": "Admin User",
  "role": "super_admin",
  "permissions": {
    "canManageProducts": true,
    "canManageOrders": true,
    "canManageAdmins": true
  },
  "isActive": true,
  "createdAt": new Date()
}
```

**Note**: For now, you need to hash the password using bcrypt. Use this tool: https://bcrypt-generator.com/
- Enter: `yourpassword123`
- Copy the hash

### Easier Way (Using API):

Once you have the backend running, create admin via REST client or Postman.

## 📱 Step 7: Test Backend

### Test in Browser:

1. Open: http://localhost:5000/health
   - Should see: `{"status":"Server is running"}`

2. Open: http://localhost:5000/api/products
   - Should show: `{"products":[],"pagination":{...}}`

### Test with Postman (Recommended):

1. Download: https://www.postman.com/
2. Create new request:
   - GET http://localhost:5000/api/products
   - Click "Send"
   - Should see products list

## 🎯 Step 8: Access Admin Dashboard

1. Open: **http://localhost:3000/admin.html** (your frontend) or
2. Open the `admin.html` file directly in browser

**Login with**:
- Email: `admin@ghohary.com`
- Password: Your password

You can now:
- ✅ Add products
- ✅ Manage inventory
- ✅ Update prices
- ✅ View orders
- ✅ Upload product images

## 📝 Step 9: Add Your First Product

1. Go to Admin Dashboard → **Products** tab
2. Fill in:
   - Product Name: "Ethereal Lace"
   - SKU: "EL-001"
   - Category: "Bridal Couture"
   - Price: "25000"
   - Images: Upload 3-5 images
   - Sizes: "XS,S,M,L"
   - Colors: "White,Ivory"
3. Click "Add Product"
4. Image should upload to Cloudinary automatically

## 🔗 Step 10: Connect Frontend to Backend

Update your `collections.html` to fetch from backend:

```javascript
// In app.js or collections.js, replace hardcoded products with:

async function loadProducts() {
  const response = await fetch('http://localhost:5000/api/products');
  const data = await response.json();
  const products = data.products;
  
  // Render products from API
  products.forEach(product => {
    // Create product card in HTML
  });
}

loadProducts();
```

## 🛒 Step 11: Integrate Stripe Payments

In your `checkout.html`:

```html
<script src="https://js.stripe.com/v3/"></script>

<script>
  const stripe = Stripe('pk_test_YOUR_KEY'); // From Stripe dashboard
  
  async function handlePayment() {
    const { paymentIntent } = await fetch('/api/orders/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({orderId, stripePaymentId})
    });
    
    // Redirect to confirmation
  }
</script>
```

## 📊 Production Checklist

Before going live:

- [ ] Switch to MongoDB production cluster
- [ ] Switch to Stripe live keys (not test keys)
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Enable HTTPS (required for Stripe)
- [ ] Set `FRONTEND_URL` to your domain
- [ ] Test payment flow end-to-end
- [ ] Set up backup for MongoDB
- [ ] Enable MongoDB IP whitelist only to server IP
- [ ] Use environment secrets in your hosting platform

## 🚢 Deploy Backend (Choose One)

### Option A: Heroku (Easiest)

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your_uri
heroku config:set STRIPE_SECRET_KEY=your_key
heroku config:set CLOUDINARY_NAME=your_name
# ... set all variables

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option B: DigitalOcean (Cheaper)

1. Create droplet (Ubuntu 20.04 with Node.js)
2. SSH into droplet
3. Clone your repo
4. `npm install && npm start`
5. Use PM2 for auto-restart:
```bash
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Option C: AWS / Google Cloud

1. Create EC2 instance / Compute Engine
2. Install Node.js
3. Clone repo and start server
4. Use environment variables for secrets

## 🆘 Troubleshooting

### MongoDB Connection Error
```
Error: "getaddrinfo ENOTFOUND cluster0.mongodb.net"
```
**Solution**:
- Check your connection string in `.env`
- Verify password doesn't have special characters
- Check IP whitelist in MongoDB Atlas

### Cloudinary Upload Fails
```
Error: "EACCES: permission denied"
```
**Solution**:
- Verify API credentials
- Check that cloud folder exists
- Clear browser cache and retry

### Stripe Error
```
Error: "Invalid API Key"
```
**Solution**:
- Use TEST keys (sk_test_, pk_test_)
- Don't mix test and live keys
- Check key format

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>
```

## 📞 Quick Support

Test endpoint health:
```bash
curl http://localhost:5000/health
```

View server logs:
```bash
npm run dev  # Shows all logs in real-time
```

Test product creation:
```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test" \
  -F "price=1000"
```

## 📚 Next Steps

1. ✅ Complete setup above
2. ✅ Add your 450 products (use bulk import)
3. ✅ Configure Stripe webhooks for production
4. ✅ Update frontend to use API
5. ✅ Deploy to production
6. ✅ Go live!

---

**Questions?** Refer to:
- Backend README: `/sghohary-backend/README.md`
- Stripe Docs: https://stripe.com/docs
- MongoDB Docs: https://docs.mongodb.com/
- Cloudinary Docs: https://cloudinary.com/documentation

You're all set! 🎉
