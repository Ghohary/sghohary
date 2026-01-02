# Setting Up mohsenghohary.net on Vercel

## Step 1: Add Domain to Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Select your **sghohary** project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `mohsenghohary.net`
6. Vercel will show you DNS records to add

## Step 2: Update DNS Records at Your Domain Registrar

Vercel will give you nameservers or DNS records. You need to:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find your domain's DNS settings
3. **Option A - Using Vercel Nameservers (Recommended):**
   - Replace your nameservers with Vercel's nameservers
   - Vercel will provide them in the domain setup

4. **Option B - Using DNS Records:**
   - Add the CNAME or A records that Vercel provides
   - Point your domain to Vercel's servers

## Step 3: Verify Domain in Vercel

1. After updating DNS records, wait 24-48 hours for propagation
2. Vercel will automatically verify when DNS is set up correctly
3. Once verified, your site is live at `https://mohsenghohary.net`

## Step 4: Add www Subdomain

1. In Vercel Settings → Domains
2. Click **Add Domain** again
3. Enter: `www.mohsenghohary.net`
4. It should auto-redirect to `mohsenghohary.net`

## Testing Your Domain

- Visit `https://mohsenghohary.net/collections.html`
- Visit `https://mohsenghohary.net/admin.html` (admin password: GhoharyLuxe2024!)
- URL should stay consistent across deployments

## Adding Your Products

1. Go to `https://mohsenghohary.net/admin.html`
2. Log in with: `admin@ghohary.com` / `GhoharyLuxe2024!`
3. Click **Add Product**
4. Upload your product images
5. Fill in product details (name, price, description, sizes)
6. Click **Save Product**

## Exporting/Importing Products

If you have products from a previous setup:

1. **Export:** In admin panel, click **Export Products** to download JSON
2. **Import:** In admin panel, click **Import Products** and select your JSON file
3. Products will merge with existing ones (same ID = update, new ID = add)

## Permanent URL Structure

Once domain is set up, use:
- `https://mohsenghohary.net` - Homepage
- `https://mohsenghohary.net/collections.html` - Products
- `https://mohsenghohary.net/admin.html` - Admin panel
- `https://mohsenghohary.net/cart.html` - Shopping cart

**These URLs will never change again!**

## Support

If DNS isn't updating:
- Clear browser cache (Cmd+Shift+R on Mac)
- Wait 24-48 hours for full propagation
- Check Vercel's domain verification status in Settings
