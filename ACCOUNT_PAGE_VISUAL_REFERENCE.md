# Account Page - Visual Reference & Quick Tips

## Page Layout Structure

```
┌─────────────────────────────────────────┐
│  GHOHARY LOGO  |  Account  |  Cart (3)  │  ← Header
├─────────────────────────────────────────┤
│ 👤 Profile | 📦 Orders | 📅 Appointments │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│  [TAB CONTENT AREA]                    │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Order #12345678    Processing    │  │  ← Order Card
│  │ Jan 15, 2024                      │  │
│  │                                   │  │
│  │ 🖼️ Luxury Bridal Gown             │  │
│  │    Size: Small | Qty: 1           │  │
│  │                                   │  │
│  │ Subtotal:    AED 500.00          │  │
│  │ Shipping:    AED 120.00          │  │
│  │ ────────────────────────────      │  │
│  │ Total:       AED 620.00          │  │
│  │                                   │  │
│  │ [📄 View] [📍 Track] [🛍️ Reorder] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [More orders...]                      │
│                                         │
└─────────────────────────────────────────┘
```

## Order Status Color Codes

| Status | Color | Hex | Meaning |
|--------|-------|-----|---------|
| Pending | Gray | #999999 | Waiting to start processing |
| Processing | Orange | #E8A860 | Being crafted |
| Shipped | Blue | #6BA3D4 | On the way |
| Delivered | Green | #7AB47D | Successfully arrived |
| Cancelled | Red | #D27D7D | Order cancelled |

## Invoice Modal Layout

```
┌────────────────────────────────────────┐
│ Invoice                            ✕   │
├────────────────────────────────────────┤
│                                        │
│ GHOHARY              Invoice No: 12345 │
│                      Date: Jan 15, 2024│
│                                        │
│ Bill To              Ship To           │
│ John Doe             John Doe          │
│ john@example.com     Villa 123, Dubai  │
│ +971 50 123 4567     Dubai, UAE        │
│ Villa 123, Dubai                       │
│ Dubai, UAE                             │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Item │ Size │ Qty │ Price │Total│  │
│ ├──────────────────────────────────┤  │
│ │ Gown │ S    │  1  │ 500   │ 500 │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Subtotal:        AED 500.00           │
│ Shipping:        AED 120.00           │
│ ────────────────────────────────────  │
│ Total Due:       AED 620.00           │
│                                        │
│ Payment: Credit Card (Stripe)         │
│ Thank you for your purchase!          │
│                                        │
│ [🖨️ Print]  [⬇️ Download]             │
│                                        │
└────────────────────────────────────────┘
```

## Tracking Timeline

```
Order Confirmed ✓
    ↓
Processing ⭐ (Current)
    ↓
Quality Check
    ↓
Shipped
    ↓
In Transit
    ↓
Out for Delivery
    ↓
Delivered

Legend:
✓ = Completed (Green)
⭐ = Current Step (Gold)
○ = Pending (Gray)
```

## Tab Navigation

### My Orders Tab
Shows:
- All customer orders sorted by most recent first
- Order header with number, date, status badge
- Item list with images, sizes, quantities
- Price breakdown
- Three action buttons

Empty state shows when:
- Customer has no orders yet
- First-time visitors
- After sign out

### Profile Tab
Shows:
- First Name
- Last Name
- Email (read-only)
- Phone
- Address
- City
- Emirates (dropdown)
- Save Changes button

### Appointments Tab
Shows:
- Booked consultations (future phase)
- Book appointment link
- Schedule information

## Button Reference

| Button | Icon | Function |
|--------|------|----------|
| View Invoice | 📄 | Opens invoice modal |
| Track Order | 📍 | Shows tracking timeline |
| Reorder | 🛍️ | Adds items to cart |
| Print | 🖨️ | Browser print dialog |
| Download | ⬇️ | PDF download (placeholder) |
| Save Changes | 💾 | Saves profile data |
| Sign Out | 🚪 | Clears session |

## Responsive Breakpoints

### Mobile (320px - 768px)
- Single column layout for orders
- Full-width modals and forms
- Stacked form fields
- Touch-friendly button sizes (44x44px minimum)
- Larger text for readability

### Tablet (768px - 1200px)
- 2-column grid for multiple items
- Optimized modal width
- Side-by-side form sections
- Better spacing

### Desktop (1200px+)
- Full responsive grid
- Centered content with max-width
- Hover effects on interactive elements
- Optimal spacing and typography

## JavaScript Functions Reference

### Core Functions

**renderOrders()**
- Fetches orders from localStorage
- Filters by user email
- Renders order cards with event listeners
- Shows empty state if no orders

**showInvoice(orderId, userOrders)**
- Opens modal with invoice details
- Includes print and download buttons
- Click outside to close

**showTracking(orderId, userOrders)**
- Switches view to tracking timeline
- Shows 7-step workflow
- Includes back button

**getTrackingSteps(status)**
- Maps order status to timeline position
- Generates step array
- Returns with completed/current/pending states

**reorderItems(orderId, userOrders)**
- Adds order items to cart
- Merges duplicate items
- Shows success message
- Redirects to cart

**loadProfileData(user)**
- Populates form fields with user data
- Called on page load

### Event Listeners

```javascript
// Tab switching
document.querySelectorAll('.account-nav-item').addEventListener('click')

// Order actions
document.querySelectorAll('.btn-view-invoice').addEventListener('click')
document.querySelectorAll('.btn-track').addEventListener('click')
document.querySelectorAll('.btn-reorder').addEventListener('click')

// Form submission
document.getElementById('profileForm').addEventListener('submit')

// Sign out
document.getElementById('signOutBtn').addEventListener('click')

// Modal interactions
document.getElementById('invoiceModal').addEventListener('click')
```

## localStorage Data Keys

### User Data
```javascript
// Current logged-in user
localStorage.ghoharyCurrentUser = JSON.stringify({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+971...",
  address: "...",
  city: "Dubai",
  emirate: "Dubai"
})
```

### Orders
```javascript
// Array of all orders
localStorage.ghoharyOrders = JSON.stringify([
  { id, ownerEmail, customerName, items[], total, status, ... }
])
```

### Cart
```javascript
// Shopping cart items
localStorage.ghoharyCart = JSON.stringify([
  { id, name, price, size, quantity, image, ... }
])
```

## Common Issues & Solutions

### Orders Not Showing
**Check:**
1. User email matches `order.ownerEmail` in localStorage
2. ghoharyOrders exists in localStorage
3. Browser DevTools: `JSON.parse(localStorage.getItem('ghoharyOrders'))`
4. Console for JavaScript errors

### Invoice Modal Not Opening
**Check:**
1. Order ID is valid
2. ordersContainer exists in DOM
3. showInvoice function is called
4. Check network tab for blocked resources

### Tracking Not Displaying
**Check:**
1. Order status is valid (pending, processing, shipped, etc.)
2. getTrackingSteps returns array with 7 items
3. ordersTab exists in DOM
4. Click event listener is attached

### Profile Not Saving
**Check:**
1. profileForm exists in DOM
2. Form fields have correct IDs
3. localStorage has write permission
4. Success banner appears

## Styling Classes Hierarchy

```
.account-page
├── .account-header
├── .account-nav
│   ├── .account-nav-item (active)
│   └── ...
├── .account-tabs
│   ├── .account-tab (active)
│   │   ├── .orders-container
│   │   │   ├── .order-card
│   │   │   │   ├── .order-header
│   │   │   │   ├── .order-items
│   │   │   │   │   └── .order-item
│   │   │   │   ├── .order-summary
│   │   │   │   └── .order-actions
│   │   │   └── .empty-state
│   │   ├── .profile-form
│   │   └── .appointments-list
│   └── ...
└── .invoice-modal
    └── .invoice-container
        ├── .invoice-header
        └── .invoice-content
```

## Color Scheme

```css
/* Primary Colors */
--burgundy: #8B2652
--gold: #D4AF37
--champagne: #F4E8D8

/* Neutrals */
--ivory: #FFFEF0
--pearl: #F5F3F0
--cream: #FAF9F6
--text-dark: #2C2C2C
--text-mid: #666666
--text-light: #999999
--text-muted: #AAAAAA

/* Status Colors */
--status-pending: #999999
--status-processing: #E8A860
--status-shipped: #6BA3D4
--status-delivered: #7AB47D
--status-cancelled: #D27D7D
```

## Testing Console Commands

### Create Test Order
```javascript
const orders = [];
orders.push({
  id: "ORD" + Date.now(),
  ownerEmail: "test@example.com",
  status: "processing",
  items: [{name: "Test Gown", size: "S", quantity: 1, amount: 50000}],
  total: 620,
  createdAt: new Date().toISOString()
});
localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
```

### Check Current User
```javascript
JSON.parse(localStorage.getItem('ghoharyCurrentUser'))
```

### View All Orders
```javascript
JSON.parse(localStorage.getItem('ghoharyOrders'))
```

### Clear All Data
```javascript
localStorage.clear()
```

### Manually Update Order Status
```javascript
const orders = JSON.parse(localStorage.getItem('ghoharyOrders'));
orders[0].status = 'delivered';
localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
location.reload();
```

## Quick Links

- **Implementation Docs:** ACCOUNT_PAGE_IMPLEMENTATION.md
- **Testing Guide:** ACCOUNT_PAGE_TESTING.md
- **Completion Report:** ACCOUNT_PAGE_COMPLETE.md
- **Live Stripe Keys:** .env file
- **Server Code:** server.js (port 3001)
- **Frontend:** account.html, account.js, styles.css
