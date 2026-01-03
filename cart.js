// Cart Page Functionality
(function() {
    'use strict';

    window.CART_PAGE_HANDLED = true;

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
            // Match IDs as numbers since Date.now() returns number
            const product = products.find(p => {
                const itemId = item.id;
                const productId = p.id;
                return itemId == productId || Number(itemId) === Number(productId);
            });
            
            console.log(`[Cart] Item ID ${item.id}:`, { item, product });
            
            // Use found product or fallback to cart item data
            const productName = product?.name || item.name || 'Unknown Product';
            const productPrice = product ? (parseFloat(product.price) || 0) : (parseFloat(item.price) || 0);
            const productImage = (product?.images && product.images.length > 0) 
                ? product.images[0] 
                : (item.image || '/placeholder.jpg');
            
            if (!product) {
                console.warn(`Product ${item.id} not found in products array. Using fallback data from cart.`, item);
            }
            
            const quantity = Number(item.quantity || 1);
            const itemTotal = productPrice * quantity;
            subtotal += itemTotal;
            
            console.log(`[Cart] Product price for ${productName}:`, productPrice);

            cartHTML += `
                <div class="cart-item" data-index="${index}">
                    <div class="cart-item-image">
                        <img src="${productImage}" alt="${productName}">
                    </div>
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${productName}</h3>
                        <p class="cart-item-meta">Size: ${item.size}</p>
                        ${item.customization ? `<p class="cart-item-meta">Customization: ${item.customization}</p>` : ''}
                        
                        <div class="cart-item-actions-mobile">
                            <div class="quantity-selector">
                                <button class="qty-btn" data-index="${index}" data-change="-1">−</button>
                                <span class="qty-value">${quantity}</span>
                                <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                            </div>
                            <button class="remove-btn" data-index="${index}">Remove</button>
                        </div>
                    </div>
                    <div class="cart-item-price">
                        <span class="item-price">AED ${itemTotal.toLocaleString()}</span>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-selector">
                            <button class="qty-btn" data-index="${index}" data-change="-1">−</button>
                            <span class="qty-value">${quantity}</span>
                            <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                        </div>
                        <button class="remove-btn" data-index="${index}">
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
            </div>
        `;

        cartContent.innerHTML = cartHTML;
    }

    function updateQuantity(index, change) {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        if (cart[index]) {
            const currentQty = Number(cart[index].quantity || 1);
            cart[index].quantity = currentQty + change;
            
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
    }

    function removeItem(index) {
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

    if (cartContent) {
        cartContent.addEventListener('click', (event) => {
            const qtyBtn = event.target.closest('.qty-btn');
            if (qtyBtn) {
                const index = parseInt(qtyBtn.dataset.index, 10);
                const change = parseInt(qtyBtn.dataset.change, 10);
                updateQuantity(index, change);
                return;
            }

            const removeBtn = event.target.closest('.remove-btn');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index, 10);
                removeItem(index);
            }
        });
    }

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
