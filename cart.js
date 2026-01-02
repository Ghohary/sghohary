// Cart Page Functionality
(function() {
    'use strict';

    const cartContent = document.getElementById('cartContent');
    const emptyCart = document.getElementById('emptyCart');

    function renderCart() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');

        console.log('[Cart] Cart items:', cart);
        console.log('[Cart] Available products:', products);

        if (cart.length === 0) {
            cartContent.style.display = 'none';
            emptyCart.style.display = 'flex';
            return;
        }

        cartContent.style.display = 'grid';
        emptyCart.style.display = 'none';

        let subtotal = 0;
        let cartHTML = '<div class="cart-items">';

        cart.forEach((item, index) => {
            // Find product details from products array
            const product = products.find(p => p.id === item.id);
            
            console.log(`[Cart] Item ${item.id}:`, { item, product });
            
            if (!product) {
                console.warn(`Product ${item.id} not found in products array`);
                return; // Skip if product not found
            }
            
            // Ensure price is a number, default to 0 if not set
            const productPrice = parseFloat(product.price) || 0;
            const itemTotal = productPrice * item.quantity;
            subtotal += itemTotal;
            
            // Get first image from product
            const productImage = product.images && product.images.length > 0 
                ? product.images[0] 
                : '/placeholder.jpg';
            
            console.log(`[Cart] Product price for ${product.name}:`, productPrice);

            cartHTML += `
                <div class="cart-item" data-index="${index}">
                    <div class="cart-item-image">
                        <img src="${productImage}" alt="${product.name}">
                    </div>
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${product.name}</h3>
                        <p class="cart-item-meta">Size: ${item.size}</p>
                        ${item.customization ? `<p class="cart-item-meta">Customization: ${item.customization}</p>` : ''}
                        
                        <div class="cart-item-actions-mobile">
                            <div class="quantity-selector">
                                <button class="qty-btn" onclick="updateQuantity(${index}, -1)">−</button>
                                <span class="qty-value">${item.quantity}</span>
                                <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                            </div>
                            <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
                        </div>
                    </div>
                    <div class="cart-item-price">
                        <span class="item-price">AED ${itemTotal.toLocaleString()}</span>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-selector">
                            <button class="qty-btn" onclick="updateQuantity(${index}, -1)">−</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                        </div>
                        <button class="remove-btn" onclick="removeItem(${index})">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });

        cartHTML += '</div>';

        // Cart Summary
        const tax = subtotal * 0.05; // 5% VAT
        const total = subtotal + tax;

        cartHTML += `
            <div class="cart-summary">
                <h3 class="summary-title">Order Summary</h3>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                
                <div class="summary-row">
                    <span>VAT (5%)</span>
                    <span>AED ${tax.toLocaleString()}</span>
                </div>
                
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="free-shipping">Free</span>
                </div>
                
                <div class="summary-divider"></div>
                
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>AED ${total.toLocaleString()}</span>
                </div>
                
                <button class="btn btn-primary btn-full" onclick="window.location.href='checkout.html'">
                    <span>Proceed to Checkout</span>
                </button>
                
                <a href="collections.html" class="continue-shopping">
                    Continue Shopping
                </a>
                
                <div class="payment-icons">
                    <p class="payment-text">We accept</p>
                    <div class="payment-methods">
                        <span class="payment-icon">💳</span>
                        <span class="payment-icon">🏦</span>
                        <span class="payment-icon">💰</span>
                    </div>
                </div>
            </div>
        `;

        cartContent.innerHTML = cartHTML;
    }

    // Make functions global
    window.updateQuantity = function(index, change) {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        if (cart[index]) {
            cart[index].quantity += change;
            
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));
            renderCart();
            
            // Update cart count
            const updateBadge = () => {
                const cartCountElement = document.querySelector('.cart-count');
                if (cartCountElement) {
                    const cartData = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
                    const totalItems = cartData.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    cartCountElement.textContent = totalItems;
                    cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
                }
            };
            updateBadge();
            if (window.updateCartCount) window.updateCartCount();
        }
    };

    window.removeItem = function(index) {
        if (confirm('Remove this item from your cart?')) {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            cart.splice(index, 1);
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));
            renderCart();
            
            // Update cart count
            const updateBadge = () => {
                const cartCountElement = document.querySelector('.cart-count');
                if (cartCountElement) {
                    const cartData = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
                    const totalItems = cartData.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    cartCountElement.textContent = totalItems;
                    cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
                }
            };
            updateBadge();
            if (window.updateCartCount) window.updateCartCount();
        }
    };

    // Use global updateCartCount if available, otherwise define locally
    if (!window.updateCartCount) {
        window.updateCartCount = function() {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                cartCount.textContent = totalItems;
                cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
            }
        };
    }

    // Initial render
    renderCart();

    // Wait for header to be loaded before calling updateCartCount
    function initializeCartCount() {
        if (window.updateCartCount) {
            window.updateCartCount();
        } else {
            // Retry after 100ms if header hasn't loaded yet
            setTimeout(initializeCartCount, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCartCount);
    } else {
        initializeCartCount();
    }

    console.log('Cart page loaded');
})();
