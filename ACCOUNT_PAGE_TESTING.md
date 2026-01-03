# Account Page Testing Guide

## Pre-Testing Setup

### 1. Start the Servers
```bash
# Terminal 1: Start the Python HTTP server (port 8000)
cd /Users/ghohary/Desktop/sghohary/sghohary
python3 -m http.server 8000

# Terminal 2: Start the Node.js API server (port 3001)
node server.js
```

### 2. Verify Environment
- Check `.env` file exists with Stripe keys
- Verify `ghoharyOrders` is initialized in localStorage
- Clear localStorage before testing: `localStorage.clear()` in DevTools console

## Test Scenarios

### Scenario 1: Sign In and View Profile
**Expected:** User can sign in and see their profile information

1. Navigate to `http://localhost:8000/auth-gate.html`
2. Enter email: `test@example.com`
3. Enter name: `John Doe`
4. Click "Continue to Account"
5. **Verify:**
   - Redirected to `account.html`
   - Profile tab shows entered information
   - User email is displayed in header

### Scenario 2: View Empty Orders
**Expected:** Shows "No orders yet" state when user has no orders

1. On account page, click "My Orders" tab
2. **Verify:**
   - Empty state displays with icon
   - Message says "Your orders will appear here once you complete a purchase"
   - "Browse Collections" button is visible and clickable

### Scenario 3: Create Test Order (Manual)
**Expected:** Order appears in account dashboard after creation

1. Open browser DevTools Console
2. Paste and run:
```javascript
const testOrder = {
  id: "ORD" + Date.now(),
  ownerEmail: JSON.parse(localStorage.getItem('ghoharyCurrentUser')).email,
  customerName: "John Doe",
  email: JSON.parse(localStorage.getItem('ghoharyCurrentUser')).email,
  phone: "+971501234567",
  address: "Villa 123, Dubai",
  city: "Dubai",
  emirate: "Dubai",
  items: [
    {
      id: "1",
      name: "Luxury Bridal Gown - Pearl Elegance",
      size: "Small",
      quantity: 1,
      amount: 50000, // AED in cents
      image: "https://via.placeholder.com/200x300?text=Bridal+Gown"
    }
  ],
  subtotal: 500.00,
  shipping: 120,
  amount: 620.00,
  total: 620.00,
  status: "processing",
  paymentMethod: "Credit Card (Stripe)",
  createdAt: new Date().toISOString(),
  date: new Date().toISOString()
};

const orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
orders.push(testOrder);
localStorage.setItem('ghoharyOrders', JSON.stringify(orders));

console.log('✅ Test order created:', testOrder.id);
```

3. Refresh page
4. **Verify:**
   - Order appears in "My Orders" tab
   - Order number matches (last 8 chars of ID)
   - Status badge shows "Processing" in orange
   - Order total shows "AED 620.00"
   - Item details display correctly

### Scenario 4: View Invoice
**Expected:** Invoice modal opens with complete order details

1. Click "📄 View Invoice" button on order card
2. **Verify:**
   - Modal overlay appears with semi-transparent background
   - Invoice shows:
     - GHOHARY branding
     - Invoice number and date
     - Bill To section with customer info
     - Ship To section
     - Itemized table with columns: Item, Size, Qty, Price, Total
     - Price breakdown: Subtotal, Shipping, Total Due
     - Payment method
     - Support email
   - Modal can be closed by:
     - Clicking X button
     - Clicking outside modal
     - Pressing Escape key

3. **Test Print Function:**
   - Click "🖨️ Print" button
   - Browser print dialog should appear
   - Print preview shows invoice correctly

4. **Test Download Function:**
   - Click "⬇️ Download" button
   - Alert shows "PDF download coming soon!" (placeholder)

### Scenario 5: Track Order
**Expected:** Shows tracking timeline with 7 steps

1. Click "📍 Track Order" button on order card
2. **Verify:**
   - View switches to tracking timeline
   - Shows "Track Your Order" title with order number
   - Timeline displays 7 steps:
     1. Order Confirmed ✓
     2. Processing (current ⭐)
     3. Quality Check
     4. Shipped
     5. In Transit
     6. Out for Delivery
     7. Delivered
   - Each step shows title, description, and estimated date
   - Completed steps show in green with checkmark
   - Current step highlighted in gold
   - Pending steps in gray
   - Back button returns to orders list

### Scenario 6: Test Different Order Statuses
**Expected:** Tracking timeline updates based on order status

1. Create multiple test orders with different statuses:
```javascript
const statusesToTest = ['pending', 'processing', 'shipped', 'delivered'];

statusesToTest.forEach((status, index) => {
  const order = {
    id: "ORD" + (Date.now() + index),
    ownerEmail: JSON.parse(localStorage.getItem('ghoharyCurrentUser')).email,
    customerName: "John Doe",
    email: JSON.parse(localStorage.getItem('ghoharyCurrentUser')).email,
    phone: "+971501234567",
    address: "Villa 123, Dubai",
    city: "Dubai",
    emirate: "Dubai",
    items: [{
      id: String(index + 1),
      name: `Gown ${index + 1}`,
      size: "Small",
      quantity: 1,
      amount: 30000,
      image: "https://via.placeholder.com/200x300"
    }],
    subtotal: 300.00,
    shipping: 120,
    total: 420.00,
    status: status,
    paymentMethod: "Credit Card",
    createdAt: new Date().toISOString(),
    date: new Date().toISOString()
  };
  
  const orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
  orders.push(order);
  localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
});

console.log('✅ Created orders with all statuses');
```

2. For each order, verify:
   - Status badge shows correct color and text
   - Tracking timeline shows progress up to that status
   - Completed steps are marked correctly

### Scenario 7: Reorder Items
**Expected:** Items are added back to cart

1. Click "🛍️ Reorder" button on order card
2. **Verify:**
   - Success banner shows: "✓ Items added to cart!"
   - Page redirects to `cart.html` after 1.5 seconds
   - Cart contains the reordered items
   - Item details (size, quantity) are preserved
   - Cart count in navigation updates

3. **Test duplicate reorder:**
   - Go back to account and reorder same items again
   - Verify quantities are merged in cart (not duplicated)

### Scenario 8: Edit Profile
**Expected:** Profile changes are saved to localStorage

1. Click "Profile" tab
2. Edit profile fields:
   - First Name: Change to "Jane"
   - Phone: Change to "+971501234568"
   - Address: Change to "Apartment 456, Abu Dhabi"
   - Emirate: Select "Abu Dhabi"
3. Click "Save Changes" button
4. **Verify:**
   - Success banner appears: "✓ Profile saved"
   - Button text changes to "✓ Saved" for 2 seconds
   - Refresh page and verify data persists
   - Check localStorage: `JSON.parse(localStorage.getItem('ghoharyCurrentUser'))`

### Scenario 9: Sign Out
**Expected:** User session is cleared and redirected to auth

1. Click "Sign Out" button (if visible) or scroll down
2. Confirm in dialog
3. **Verify:**
   - User is redirected to `auth-gate.html`
   - localStorage for user is cleared
   - Cart is cleared
   - Cannot access account page directly

### Scenario 10: Real Stripe Checkout Flow
**Expected:** Complete end-to-end payment and order creation

**Note:** Uses live Stripe keys - use test card `4242 4242 4242 4242`

1. Navigate to `collections.html`
2. Add a gown to cart
3. Go to `cart.html` and proceed to checkout
4. Fill checkout form with customer details
5. Click "Proceed to Secure Payment"
6. Complete Stripe payment with test card:
   - Card: 4242 4242 4242 4242
   - Date: Any future date (e.g., 12/25)
   - CVC: Any 3 digits
7. **Verify:**
   - Redirected to `success.html?order=success`
   - Shows order confirmation with session ID
   - Click "View Your Account" button
   - Order appears in account dashboard
   - Order contains all customer info and items
   - Status shows "Processing"

## Performance Testing

### Test 1: Large Order List
**Create 50+ test orders and verify page performance:**
```javascript
const user = JSON.parse(localStorage.getItem('ghoharyCurrentUser'));
const orders = [];

for (let i = 0; i < 50; i++) {
  orders.push({
    id: "ORD" + (Date.now() + i),
    ownerEmail: user.email,
    customerName: user.firstName + ' ' + user.lastName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    emirate: user.emirate,
    items: [{
      id: String(i),
      name: `Gown ${i + 1}`,
      size: "Small",
      quantity: 1,
      amount: 30000,
      image: "https://via.placeholder.com/200x300"
    }],
    subtotal: 300.00,
    shipping: 120,
    total: 420.00,
    status: ['pending', 'processing', 'shipped', 'delivered'][i % 4],
    paymentMethod: "Credit Card",
    createdAt: new Date().toISOString(),
    date: new Date().toISOString()
  });
}

localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
console.log('✅ Created 50 test orders');
```

**Verify:**
- Orders load quickly (< 1 second)
- Page scrolling is smooth
- No console errors
- Click events respond immediately

## Mobile Testing

### Test Devices
- iPhone 12/13 Pro (390x844px)
- iPad (768x1024px)
- Galaxy S21 (360x800px)

### Checklist
- [ ] All elements are visible and readable on mobile
- [ ] Order cards stack properly in single column
- [ ] Invoice modal is readable on mobile
- [ ] Tracking timeline displays correctly on narrow screens
- [ ] Buttons are touch-friendly (minimum 44x44px)
- [ ] Scrolling doesn't interfere with page interaction
- [ ] Images scale properly without distortion

## Bug Reporting Template

If you find an issue, use this template:

```
## Bug Title
[Brief description of the issue]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Expected result]

## Actual Result
[What actually happened]

## Environment
- Browser: [Chrome/Safari/Firefox]
- Device: [Desktop/Mobile/Tablet]
- Viewport: [1920x1080/390x844]
- Stripe Mode: [Live/Test]

## Console Errors
[Any JavaScript errors from browser console]

## Screenshot
[Include screenshot if possible]
```

## Success Criteria

All tests should pass for production readiness:
- [ ] All 10 scenarios pass
- [ ] No console errors
- [ ] Mobile responsive on all tested devices
- [ ] Performance adequate with 50+ orders
- [ ] Stripe integration working end-to-end
- [ ] localStorage persists across page refreshes
- [ ] All buttons and links functional
- [ ] Styling matches luxury brand aesthetic
