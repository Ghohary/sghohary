// Stripe Checkout (Hosted) for Checkout Page
(function() {
    'use strict';

    window.CHECKOUT_PAGE_HANDLED = true;

    const currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');

    const API_URL = window.location.origin.includes('localhost:8000') 
        ? 'http://localhost:3001'
        : window.location.origin;

    // DOM Elements
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = checkoutForm ? checkoutForm.querySelector('button[type="submit"]') : null;
    const checkoutLoginBtn = document.getElementById('checkoutLoginBtn');

    function loadSavedCheckoutData() {
        const saved = JSON.parse(sessionStorage.getItem('ghoharyCheckoutForm') || 'null');
        const data = saved || currentUser || null;
        if (!data) return;

        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phone');
        const addressEl = document.getElementById('address');
        const address2El = document.getElementById('addressLine2');
        const cityEl = document.getElementById('city');
        const stateEl = document.getElementById('state');
        const zipEl = document.getElementById('zip');
        const countryEl = document.getElementById('country');

        if (firstNameEl && data.firstName) firstNameEl.value = data.firstName;
        if (lastNameEl && data.lastName) lastNameEl.value = data.lastName;
        if (emailEl && data.email) emailEl.value = data.email;
        if (phoneEl && data.phone) phoneEl.value = data.phone;
        if (addressEl && data.address) addressEl.value = data.address;
        if (address2El && data.addressLine2) address2El.value = data.addressLine2;
        if (cityEl && data.city) cityEl.value = data.city;
        if (stateEl && data.state) stateEl.value = data.state;
        if (zipEl && data.zip) zipEl.value = data.zip;
        if (countryEl && data.country) countryEl.value = data.country;
    }


    // Render order summary
    function renderOrderSummary() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        const countryValue = document.getElementById('country')?.value || 'uae';
        
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
        const isUaeAddress = countryValue === 'uae';
        const totalShipping = isUaeAddress ? 0 : totalQuantity * shippingPerItem;
        const total = subtotal + totalShipping;

        summaryHTML += `
            <div class="summary-totals">
                <div class="summary-row">
                    <span>${isUaeAddress ? 'Subtotal (incl. VAT)' : 'Subtotal (VAT exempt)'}</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>${isUaeAddress ? 'Shipping (UAE)' : `Shipping (120 AED × ${totalQuantity} items)`}</span>
                    <span>${isUaeAddress ? 'Complimentary' : `AED ${totalShipping.toLocaleString()}`}</span>
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
        localStorage.setItem('ghoharyShippingCountry', isUaeAddress ? 'UAE' : 'International');
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
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            
            if (cart.length === 0) {
                throw new Error('Your cart is empty');
            }

            // Get products to lookup actual prices
            const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
            
            const lineItems = cart.map(item => {
                // Try to get price from products database first
                const product = products.find(p => p.id == item.id);
                const price = product ? parseFloat(product.price) : parseFloat(item.price || 0);
                
                if (isNaN(price) || price <= 0) {
                    throw new Error(`Invalid price for ${item.name}`);
                }

                return {
                    name: item.name || 'GHOHARY Item',
                    amount: Math.round(price * 100), // Convert AED to cents
                    quantity: Number(item.quantity || 1),
                    size: item.size,
                    image: item.image || ''
                };
            }).filter(item => item.amount > 0);

            if (lineItems.length === 0) {
                throw new Error('No valid items found in cart');
            }

            // Calculate total with shipping (free for UAE)
            const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0) / 100;
            const shippingPerItem = 120;
            const isUaeAddress = customer.country === 'uae';
            const totalShipping = isUaeAddress ? 0 : lineItems.reduce((sum, item) => sum + item.quantity, 0) * shippingPerItem;
            const orderTotalValue = subtotal + totalShipping;
            if (orderTotalValue < 2) {
                throw new Error('Minimum order total is AED 2.00.');
            }
            const orderTotal = Math.round(orderTotalValue * 100); // in cents for Stripe

            if (totalShipping > 0) {
                lineItems.push({
                    name: 'Shipping',
                    amount: Math.round(totalShipping * 100),
                    quantity: 1,
                    size: '',
                    image: ''
                });
            }

            const items = cart.map(item => {
                const product = products.find(p => p.id == item.id);
                const unitPrice = product ? parseFloat(product.price) : parseFloat(item.price || 0);
                return {
                    name: item.name || product?.name || 'GHOHARY Item',
                    size: item.size || '',
                    quantity: Number(item.quantity || 1),
                    unitPrice: Number(unitPrice || 0),
                    image: item.image || product?.images?.[0] || ''
                };
            });

            const response = await fetch(`${API_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineItems,
                    customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
                    email: customer.email,
                    amount: orderTotal / 100 // Send amount in AED
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to start checkout');
            }

            const data = await response.json();
            const { url } = data;
            
            if (!url) {
                throw new Error('Checkout URL missing from server');
            }

            localStorage.setItem('ghoharyPendingOrder', JSON.stringify({
                customer,
                orderTotal: orderTotal / 100, // Store in AED
                subtotal: subtotal,
                totalShipping: totalShipping,
                items,
                createdAt: new Date().toISOString()
            }));

            window.location.href = url;
        } catch (error) {
            console.error('Payment Error:', error);
            console.error('Error message:', error.message);
            showError(error.message || 'Payment processing failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Proceed to Secure Payment</span>';
        }
    }

    if (checkoutForm) {
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', () => {
                renderOrderSummary();
            });
        }

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

            const customerPayload = {
                firstName,
                lastName,
                email,
                address,
                addressLine2: document.getElementById('addressLine2')?.value || '',
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zip: document.getElementById('zip').value,
                country: document.getElementById('country')?.value || 'uae',
                emirate: document.getElementById('state').value,
                phone: document.getElementById('phone').value
            };

            ensureUserAccount(customerPayload);
            saveAddressIfRequested(customerPayload);
            await startCheckoutSession(customerPayload);
        });
    }

    function generateTempPassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function ensureUserAccount(customer) {
        const email = (customer.email || '').trim().toLowerCase();
        if (!email) return;

        const users = JSON.parse(localStorage.getItem('ghoharyUsers') || '[]');
        const existing = users.find(u => u.email.toLowerCase() === email);
        if (existing) {
            localStorage.setItem('ghoharyCurrentUser', JSON.stringify({
                email: existing.email,
                firstName: existing.firstName,
                lastName: existing.lastName,
                phone: existing.phone || '',
                address: existing.address || '',
                addressLine2: existing.addressLine2 || '',
                city: existing.city || '',
                state: existing.state || '',
                zip: existing.zip || '',
                country: existing.country || 'uae',
                emirate: existing.emirate || ''
            }));
            return;
        }

        const tempPassword = generateTempPassword();
        const newUser = {
            email,
            password: tempPassword,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phone: customer.phone || '',
            address: customer.address || '',
            addressLine2: customer.addressLine2 || '',
            city: customer.city || '',
            state: customer.state || '',
            zip: customer.zip || '',
            country: customer.country || 'uae',
            emirate: customer.emirate || '',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('ghoharyUsers', JSON.stringify(users));
        localStorage.setItem('ghoharyCurrentUser', JSON.stringify({
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
            address: newUser.address,
            addressLine2: newUser.addressLine2,
            city: newUser.city,
            state: newUser.state,
            zip: newUser.zip,
            country: newUser.country,
            emirate: newUser.emirate
        }));
        localStorage.setItem('ghoharyTempPassword', tempPassword);
    }

    function saveAddressIfRequested(customer) {
        const saveAddress = document.getElementById('saveAddress');
        if (!saveAddress || !saveAddress.checked) return;

        const email = (customer.email || '').trim().toLowerCase();
        if (!email) return;

        const users = JSON.parse(localStorage.getItem('ghoharyUsers') || '[]');
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email);
        if (userIndex === -1) return;

        users[userIndex] = {
            ...users[userIndex],
            address: customer.address || '',
            addressLine2: customer.addressLine2 || '',
            city: customer.city || '',
            state: customer.state || '',
            zip: customer.zip || '',
            country: customer.country || 'uae',
            emirate: customer.emirate || ''
        };

        localStorage.setItem('ghoharyUsers', JSON.stringify(users));
        localStorage.setItem('ghoharyCurrentUser', JSON.stringify({
            email: users[userIndex].email,
            firstName: users[userIndex].firstName,
            lastName: users[userIndex].lastName,
            phone: users[userIndex].phone || '',
            address: users[userIndex].address || '',
            addressLine2: users[userIndex].addressLine2 || '',
            city: users[userIndex].city || '',
            state: users[userIndex].state || '',
            zip: users[userIndex].zip || '',
            country: users[userIndex].country || 'uae',
            emirate: users[userIndex].emirate || ''
        }));
    }

    if (checkoutLoginBtn) {
        checkoutLoginBtn.addEventListener('click', () => {
            const formSnapshot = {
                firstName: document.getElementById('firstName')?.value || '',
                lastName: document.getElementById('lastName')?.value || '',
                email: document.getElementById('email')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                address: document.getElementById('address')?.value || '',
                addressLine2: document.getElementById('addressLine2')?.value || '',
                city: document.getElementById('city')?.value || '',
                state: document.getElementById('state')?.value || '',
                zip: document.getElementById('zip')?.value || '',
                country: document.getElementById('country')?.value || 'uae'
            };
            sessionStorage.setItem('ghoharyCheckoutForm', JSON.stringify(formSnapshot));
            window.location.href = 'auth-gate.html?redirect=checkout.html';
        });
    }

    loadSavedCheckoutData();
    renderOrderSummary();
    console.log('💳 Stripe Checkout (hosted) page loaded');
})();
