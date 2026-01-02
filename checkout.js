// Stripe Payment Processing for Checkout Page
(function() {
    'use strict';

    // Check if user is logged in, redirect to auth-gate if not
    const currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    if (!currentUser || !currentUser.email) {
        window.location.href = 'auth-gate.html';
        return;
    }

    // Configuration
    // 🔑 IMPORTANT: Replace with your actual Stripe Publishable Key
    // Get from: https://dashboard.stripe.com/apikeys
    // Test Key: pk_test_...
    // Live Key: pk_live_...
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : window.location.origin; // Use Vercel API endpoints in production
    const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_PUBLISHABLE_KEY_HERE'; // Replace with your actual publishable key

    // Initialize Stripe
    if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        console.error('❌ ERROR: Invalid Stripe Publishable Key. Add your key to checkout.js line 8');
    }
    
    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
        style: {
            base: {
                fontFamily: '"Montserrat", sans-serif',
                fontSize: '14px',
                color: '#1F1914',
                '::placeholder': {
                    color: '#9A8F85',
                },
            },
            invalid: {
                color: '#fa755a',
            },
        },
    });

    // Mount card element
    const cardElementContainer = document.getElementById('card-element');
    if (cardElementContainer) {
        cardElement.mount('#card-element');

        // Handle real-time validation errors
        cardElement.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }

    // DOM Elements
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const cardDetails = document.getElementById('cardDetails');
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
            // Find product details from products array
            // Match IDs as numbers since Date.now() returns number
            const product = products.find(p => {
                const itemId = item.id;
                const productId = p.id;
                return itemId == productId || Number(itemId) === Number(productId);
            });
            
            console.log('[Checkout] Looking for product ID:', item.id, 'Found:', product?.name);
            
            // Use found product or fallback to cart item data
            const productName = product?.name || item.name || 'Unknown Product';
            const productPrice = product ? (parseFloat(product.price) || 0) : (parseFloat(item.price) || 0);
            const productImage = (product?.images && product.images.length > 0) 
                ? product.images[0] 
                : '/placeholder.jpg';
            
            if (!product) {
                console.warn(`Product ${item.id} not found in products array. Using fallback data from cart.`, item);
            }
            
            const itemTotal = productPrice * item.quantity;
            subtotal += itemTotal;
            totalQuantity += item.quantity;

            summaryHTML += `
                <div class="summary-item">
                    <img src="${productImage}" alt="${productName}" class="summary-item-image">
                    <div class="summary-item-details">
                        <h4>${productName}</h4>
                        <p>Size: ${item.size} × ${item.quantity}</p>
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
        
        // Store total for payment
        sessionStorage.setItem('orderTotal', total.toString());
    }

    // Payment method toggle
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'card') {
                cardDetails.style.display = 'block';
            } else {
                cardDetails.style.display = 'none';
            }
        });
    });

    // Form submission with Stripe
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get payment method
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

            // Basic validation
            const firstName = document.getElementById('firstName').value;
            const email = document.getElementById('email').value;
            const address = document.getElementById('address').value;

            if (!firstName || !email || !address) {
                showError('Please fill in all required fields');
                return;
            }

            // Handle consultation payment (manual payment)
            if (paymentMethod === 'consultation') {
                processConsultationPayment();
                return;
            }

            // Handle Stripe payment
            if (paymentMethod === 'card') {
                processStripePayment();
            }
        });
    }

    // Process Stripe Payment
    async function processStripePayment() {
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Processing Payment...</span>';

        try {
            // Get order total
            const orderTotal = parseFloat(sessionStorage.getItem('orderTotal') || '0');
            if (orderTotal <= 0) {
                throw new Error('Invalid order total');
            }

            // Step 1: Create payment intent on server
            const paymentIntentResponse = await fetch(`${API_URL}/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: orderTotal,
                    currency: 'aed',
                    metadata: {
                        customer: document.getElementById('firstName').value,
                        email: document.getElementById('email').value
                    }
                })
            });

            if (!paymentIntentResponse.ok) {
                throw new Error('Failed to create payment intent');
            }

            const { clientSecret, paymentIntentId } = await paymentIntentResponse.json();

            // Step 2: Confirm payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: document.getElementById('cardholderName').value || document.getElementById('firstName').value,
                        email: document.getElementById('email').value,
                        address: {
                            line1: document.getElementById('address').value,
                            city: document.getElementById('city').value,
                            state: document.getElementById('emirate').value,
                            country: 'AE'
                        }
                    }
                }
            });

            if (error) {
                // Show error to customer
                showError(error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Complete Order</span>';
                return;
            }

            // Payment succeeded
            if (paymentIntent.status === 'succeeded') {
                completeOrder(paymentIntentId);
            }
        } catch (error) {
            console.error('Payment Error:', error);
            showError(error.message || 'Payment processing failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Complete Order</span>';
        }
    }

    // Process Consultation Payment
    function processConsultationPayment() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Scheduling Consultation...</span>';

        setTimeout(() => {
            completeOrder('CONSULTATION');
        }, 1500);
    }

    // Complete Order
    function completeOrder(paymentId) {
        // Clear cart
        localStorage.removeItem('ghoharyCart');
        
        // Create order record
        const orderNumber = 'GH' + Date.now().toString().slice(-8);
        const orderData = {
            orderNumber,
            paymentId,
            customerName: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            emirate: document.getElementById('emirate').value,
            phone: document.getElementById('phone').value,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value,
            orderTotal: sessionStorage.getItem('orderTotal'),
            date: new Date().toISOString()
        };

        // Save to localStorage
        localStorage.setItem('lastOrder', JSON.stringify(orderData));
        
        // Add to orders array for history
        let orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
        orders.push(orderData);
        localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
        
        // Show success and redirect
        showSuccess('Order placed successfully! Redirecting to confirmation...');
        
        setTimeout(() => {
            window.location.href = 'account.html?order=success';
        }, 2000);
    }

    // Show error message
    function showError(message) {
        const errorDiv = document.getElementById('card-errors');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.color = '#fa755a';
        }
    }

    // Show success message
    function showSuccess(message) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2>Order Confirmed!</h2>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Initialize
    renderOrderSummary();
    console.log('💳 Stripe checkout page loaded');
})();
