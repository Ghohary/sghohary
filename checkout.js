// Stripe Checkout (Hosted) for Checkout Page
(function() {
    'use strict';

    window.CHECKOUT_PAGE_HANDLED = true;

    // Check if user is logged in, redirect to auth-gate if not
    const currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    if (!currentUser || !currentUser.email) {
        window.location.href = 'auth-gate.html';
        return;
    }

    const API_URL = window.location.origin;

    // DOM Elements
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = checkoutForm ? checkoutForm.querySelector('button[type="submit"]') : null;

    // Render order summary
    function renderOrderSummary() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');

        if (cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        let subtotal = 0;
        let totalQuantity = 0;
        let summaryHTML = '<div class="summary-items">';

        cart.forEach(item => {
            const product = products.find(p => {
                const itemId = item.id;
                const productId = p.id;
                return itemId == productId || Number(itemId) === Number(productId);
            });

            const productName = product?.name || item.name || 'Unknown Product';
            const productPrice = product ? (parseFloat(product.price) || 0) : (parseFloat(item.price) || 0);
            const productImage = (product?.images && product.images.length > 0)
                ? product.images[0]
                : (item.image || '/placeholder.jpg');
            const quantity = Number(item.quantity || 1);

            const itemTotal = productPrice * quantity;
            subtotal += itemTotal;
            totalQuantity += quantity;

            summaryHTML += `
                <div class="summary-item">
                    <img src="${productImage}" alt="${productName}" class="summary-item-image">
                    <div class="summary-item-details">
                        <h4>${productName}</h4>
                        <p>Size: ${item.size} × ${quantity}</p>
                    </div>
                    <div class="summary-item-price">
                        AED ${itemTotal.toLocaleString()}
                    </div>
                </div>
            `;
        });

        summaryHTML += '</div>';

        const shippingPerItem = 120;
        const totalShipping = totalQuantity * shippingPerItem;
        const total = subtotal + totalShipping;

        summaryHTML += `
            <div class="summary-totals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping (120 AED × ${totalQuantity} items)</span>
                    <span>AED ${totalShipping.toLocaleString()}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>AED ${total.toLocaleString()}</span>
                </div>
            </div>
        `;

        orderSummary.innerHTML = summaryHTML;
        sessionStorage.setItem('orderTotal', total.toString());
    }

    function showError(message) {
        const errorDiv = document.getElementById('checkout-errors');
        if (errorDiv) {
            errorDiv.textContent = message;
        }
    }

    async function startCheckoutSession(customer) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Redirecting to Stripe...</span>';

        try {
            const orderTotal = parseFloat(sessionStorage.getItem('orderTotal') || '0');
            if (orderTotal <= 0) {
                throw new Error('Invalid order total');
            }

            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            const lineItems = cart.map(item => ({
                name: item.name || 'GHOHARY Item',
                amount: Math.round(Number(item.price || 0) * 100),
                quantity: Number(item.quantity || 1),
                image: item.image || ''
            })).filter(item => item.amount > 0);

            if (lineItems.length === 0) {
                throw new Error('No valid items found in cart');
            }

            localStorage.setItem('ghoharyPendingOrder', JSON.stringify({
                customer,
                orderTotal,
                cart,
                createdAt: new Date().toISOString()
            }));

            const response = await fetch(`${API_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineItems,
                    customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
                    email: customer.email,
                    amount: orderTotal
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start checkout');
            }

            const { url } = await response.json();
            if (!url) {
                throw new Error('Checkout URL missing');
            }

            window.location.href = url;
        } catch (error) {
            console.error('Payment Error:', error);
            showError(error.message || 'Payment processing failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Proceed to Secure Payment</span>';
        }
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const address = document.getElementById('address').value;

            if (!firstName || !email || !address) {
                showError('Please fill in all required fields');
                return;
            }

            await startCheckoutSession({
                firstName,
                lastName,
                email,
                address,
                city: document.getElementById('city').value,
                emirate: document.getElementById('emirate').value,
                phone: document.getElementById('phone').value
            });
        });
    }

    renderOrderSummary();
    console.log('💳 Stripe Checkout (hosted) page loaded');
})();
