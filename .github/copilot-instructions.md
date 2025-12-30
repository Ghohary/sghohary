# GHOHARY Haute Couture - AI Development Guide

## Project Overview
A mobile-first, luxury e-commerce website for haute couture bridal gowns and evening wear. Pure client-side implementation with localStorage-based state management.

## Architecture

### File Structure & Responsibilities
- **Multi-script pattern**: Each HTML page has its own JS file (`product.js`, `cart.js`, etc.) + shared `app.js`
- **`app.js`**: Universal script with mobile menu, testimonial sliders, collections filtering/sorting, and shared cart utilities
- **`script.js`**: Legacy homepage-specific functionality (testimonials, smooth scrolling) - partially duplicated in `app.js`
- **Page-specific scripts**: Handle unique page features (product gallery, cart rendering, checkout flow, appointment booking)
- **Single stylesheet**: `styles.css` contains all CSS for entire site (~2000 lines)

### State Management
All data stored in `localStorage` - no backend, no API calls:
- **`ghoharyCart`**: Array of cart items with `{id, name, price, size, customization, image, quantity}`
- **`ghoharyAppointments`**: Array of appointment bookings
- **`lastOrder`**: Most recent order confirmation data

Cart operations are duplicated across files - `updateCartCount()` appears in `app.js`, `product.js`, `cart.js`, `checkout.js`, `appointment.js`, and `account.js`.

## Design System

### CSS Architecture
**Mobile-first with universal fluid scaling** (320px → 2560px):
```css
--spacing-xs: clamp(6px, 1.2vw + 2px, 10px);
--text-base: clamp(13px, 2vw + 4px, 16px);
```

**Luxury color palette** defined in `:root`:
- Gold: `--gold` (#D4AF37), `--gold-light`, `--gold-dark`, `--gold-accent`
- Neutrals: `--champagne`, `--nude`, `--beige`, `--ivory`, `--pearl`, `--cream`
- Darks: `--deep-burgundy`, `--rich-brown`, `--charcoal`
- Typography: `--text-dark`, `--text-mid`, `--text-light`, `--text-muted`

**Typography**:
- Headings: `Cormorant Garamond` (serif, 300 weight, 0.1em letter-spacing)
- Body: `Montserrat` (sans-serif, 300 weight)

**Responsive containers** with viewport-based widths:
- Mobile: `--container-mobile: 94%`
- Tablet: `--container-tablet: 90%`
- Desktop: `--container-desktop: 86%`
- Max width: `1800px`

### UI Patterns
- **Touch-optimized sliders**: Testimonials use touchstart/touchmove/touchend with 15% swipe threshold
- **Sticky navigation**: `.nav-container` with backdrop blur and gradient border
- **Filter buttons**: Active state with smooth fade-in animations (50ms stagger per item)
- **Modal patterns**: Success modals for cart additions, appointment confirmations

## Key Workflows

### Adding to Cart
1. User selects size (required) → `selectedSize` variable updated
2. Optional customization text input
3. Click "Reserve This Gown" → validates size selection
4. Creates product object, checks for duplicates by `id + size`, merges or adds
5. Saves to `localStorage.setItem('ghoharyCart', JSON.stringify(cart))`
6. Calls `updateCartCount()` to update nav badge
7. Shows success modal

### Checkout Flow
1. `checkout.js` redirects to `cart.html` if cart empty
2. Renders order summary from localStorage
3. Payment method toggle shows/hides card details section
4. Form submission → validates required fields → 2-second processing simulation
5. Clears cart, stores `lastOrder` in localStorage
6. Redirects to `account.html?order=success` with success banner

### Collections Filtering
Filter buttons with `data-filter` attributes control product card visibility:
```javascript
filterBtns.forEach(btn => {
  // Toggle active class, filter cards by data-category
  // Staggered fade-in animation (index * 50ms)
});
```

Sort dropdown compares dataset attributes or parsed prices from `.product-price` text content.

## Development Conventions

### JavaScript Style
- **IIFE pattern**: All scripts wrapped in `(function() { 'use strict'; })();`
- **Event listeners**: Prefer `addEventListener` over inline handlers (except cart quantity buttons use `onclick` for simplicity)
- **Null checks**: Always check if DOM elements exist before adding listeners
- **Touch events**: Use `{ passive: true }` for performance on scroll/touch handlers

### HTML Patterns
- **Data attributes**: Products use `data-category`, `data-date`, `data-size`, `data-filter` for filtering/interaction
- **Cart badge**: `<span class="cart-count">` updated globally, hidden when zero
- **URL params**: Product IDs passed via `?id=1`, checkout status via `?order=success`

### Common Anti-Patterns to Avoid
- **Don't** create backend endpoints - this is a client-only SPA
- **Don't** use module bundlers - files loaded directly via `<script>` tags
- **Don't** consolidate scripts - pages expect their specific JS file + app.js
- **Don't** use generic breakpoints - always use fluid `clamp()` values matching design system

## Testing & Debugging
- **Cart persistence**: Check browser localStorage in DevTools → Application → Local Storage
- **Mobile testing**: iOS Safari/Chrome on actual devices (not just DevTools responsive mode) for touch interactions
- **Console logs**: Each page script logs `'[Page] page loaded'` for initialization confirmation
- **Cart count sync**: Verify badge updates across all pages after cart modifications

## External Dependencies
- **Fonts**: Google Fonts (Cormorant Garamond, Montserrat) - preconnected for performance
- **Images**: Placeholder.com with specific dimensions (e.g., `w=1200&h=1600` for product images)
- **No frameworks**: Vanilla JavaScript, no React/Vue/bundlers

## File-Specific Notes
- **index.html**: Contains 1400+ lines of inline CSS (duplicates styles.css) for critical path optimization
- **app.js**: 800+ lines handling multiple page contexts - check page-specific element existence before operations
- **cart.js**: Exposes `updateQuantity()` and `removeItem()` globally for onclick handlers
