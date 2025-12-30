// Checkout Page Functionality
(function() {
    'use strict';

    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const cardDetails = document.getElementById('cardDetails');

    function renderOrderSummary() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        if (cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        let subtotal = 0;
        let summaryHTML = '<div class="summary-items">';

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            summaryHTML += `
                <div class="summary-item">
                    <img src="${item.image}" alt="${item.name}" class="summary-item-image">
                    <div class="summary-item-details">
                        <h4>${item.name}</h4>
                        <p>Size: ${item.size} × ${item.quantity}</p>
                    </div>
                    <div class="summary-item-price">
                        AED ${itemTotal.toLocaleString()}
                    </div>
                </div>
            `;
        });

        summaryHTML += '</div>';

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        summaryHTML += `
            <div class="summary-totals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="free-shipping">Free</span>
                </div>
                <div class="summary-row">
                    <span>VAT (5%)</span>
                    <span>AED ${tax.toLocaleString()}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>AED ${total.toLocaleString()}</span>
                </div>
            </div>
        `;

        orderSummary.innerHTML = summaryHTML;
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

    // Form submission
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Basic validation
            const firstName = document.getElementById('firstName').value;
            const email = document.getElementById('email').value;

            if (!firstName || !email) {
                alert('Please fill in all required fields');
                return;
            }

            // Simulate order processing
            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<span>Processing...</span>';
            submitBtn.disabled = true;

            setTimeout(() => {
                // Clear cart
                localStorage.removeItem('ghoharyCart');
                
                // Store order confirmation
                const orderNumber = 'GH' + Date.now().toString().slice(-8);
                localStorage.setItem('lastOrder', JSON.stringify({
                    orderNumber,
                    customerName: firstName,
                    email,
                    date: new Date().toISOString()
                }));

                // Redirect to success page or account
                window.location.href = 'account.html?order=success';
            }, 2000);
        });
    }

    // Card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }

    // Expiry date formatting
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }

    renderOrderSummary();

    console.log('Checkout page loaded');
})();
