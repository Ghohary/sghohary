// Stripe Checkout (Hosted) for Checkout Page
(function() {
    'use strict';

    window.CHECKOUT_PAGE_HANDLED = true;

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    } catch (error) {
        currentUser = null;
    }

    const API_URL = window.location.origin.includes('localhost:8000') 
        ? 'http://localhost:3001'
        : window.location.origin;

    // DOM Elements
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = checkoutForm ? checkoutForm.querySelector('button[type="submit"]') : null;

    // Escape HTML to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Parse price safely — handles "1,600", "1600.00", "AED 1600", etc.
    function parsePrice(value) {
        if (typeof value === 'number') return value;
        const cleaned = String(value || '').replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
    }

    let shippingRegions = [];

    function safeParseArray(storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function loadSavedCheckoutData() {
        let saved = null;
        try {
            saved = JSON.parse(sessionStorage.getItem('ghoharyCheckoutForm') || 'null');
        } catch (error) {
            saved = null;
        }
        const data = saved || currentUser || null;
        if (!data) return;

        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phone');
        const addressEl = document.getElementById('address');
        const address2El = document.getElementById('addressLine2');
        const cityEl = document.getElementById('city');
        const zipEl = document.getElementById('zip');
        const countryEl = document.getElementById('country');

        if (firstNameEl && data.firstName) firstNameEl.value = data.firstName;
        if (lastNameEl && data.lastName) lastNameEl.value = data.lastName;
        if (emailEl && data.email) emailEl.value = data.email;
        if (phoneEl && data.phone) phoneEl.value = data.phone;
        if (addressEl && data.address) addressEl.value = data.address;
        if (address2El && data.addressLine2) address2El.value = data.addressLine2;
        if (cityEl && data.city) cityEl.value = data.city;
        if (zipEl && data.zip) zipEl.value = data.zip;
        if (countryEl && data.country) countryEl.value = data.country;
    }

    async function loadShippingRegions() {
        // Always fetch from the live API (backed by Redis) so admin changes appear immediately
        try {
            const response = await fetch('/api/shipping-regions', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                // API may return { regions: [...] } wrapper or plain array
                const raw = Array.isArray(data) ? data : (Array.isArray(data?.regions) ? data.regions : []);
                shippingRegions = raw;
            }
        } catch (e) {
            console.warn('[Checkout] API fetch failed, trying static fallback', e);
        }

        // Fallback to static file if API failed
        if (!shippingRegions.length) {
            try {
                const response = await fetch('/shipping-regions.json', { cache: 'no-store' });
                if (response.ok) {
                    shippingRegions = await response.json();
                }
            } catch (e) {
                shippingRegions = [];
            }
        }

        populateCountrySelect();
    }

    function populateCountrySelect() {
        const countrySelect = document.getElementById('country');
        if (!countrySelect) return;

        const currentValue = countrySelect.value;
        countrySelect.innerHTML = '';

        // Add placeholder
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select country...';
        placeholder.disabled = true;
        countrySelect.appendChild(placeholder);

        // Group regions by continent for a cleaner dropdown
        const continentLabels = {
            gcc: 'Middle East',
            europe: 'Europe',
            america: 'Americas',
            asia: 'Asia',
            australia: 'Oceania'
        };
        const grouped = {};
        const ungrouped = [];

        shippingRegions.forEach(region => {
            const continent = region.continent || '';
            if (continent && continentLabels[continent]) {
                if (!grouped[continent]) grouped[continent] = [];
                grouped[continent].push(region);
            } else {
                ungrouped.push(region);
            }
        });

        const continentOrder = ['gcc', 'europe', 'america', 'asia', 'australia'];
        const hasGroups = Object.keys(grouped).length > 1;

        if (hasGroups) {
            continentOrder.forEach(key => {
                const regions = grouped[key];
                if (!regions || !regions.length) return;
                const group = document.createElement('optgroup');
                group.label = continentLabels[key] || key;
                regions.forEach(region => {
                    const option = document.createElement('option');
                    option.value = region.id;
                    option.textContent = region.enabled ? region.name : `${region.name} (Not available)`;
                    option.disabled = !region.enabled;
                    group.appendChild(option);
                });
                countrySelect.appendChild(group);
            });
            // Add any ungrouped at the end
            ungrouped.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.enabled ? region.name : `${region.name} (Not available)`;
                option.disabled = !region.enabled;
                countrySelect.appendChild(option);
            });
        } else {
            // No continent data — flat list
            shippingRegions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.enabled ? region.name : `${region.name} (Not available)`;
                option.disabled = !region.enabled;
                countrySelect.appendChild(option);
            });
        }

        if (currentValue && shippingRegions.some(r => r.id === currentValue)) {
            countrySelect.value = currentValue;
        } else {
            const firstEnabled = shippingRegions.find(r => r.enabled);
            if (firstEnabled) {
                countrySelect.value = firstEnabled.id;
            } else {
                countrySelect.value = '';
            }
        }
    }

    function getSelectedRegion() {
        const countryValue = document.getElementById('country')?.value;
        if (!countryValue) return null;
        return shippingRegions.find(r => r.id === countryValue) || null;
    }

    // Render order summary — uses CART DATA DIRECTLY, no products DB lookup needed
    function renderOrderSummary() {
        var cart = safeParseArray('ghoharyCart');
        var selectedRegion = getSelectedRegion();

        if (!orderSummary) return;

        if (!cart.length) {
            window.location.href = 'cart.html';
            return;
        }

        var subtotal = 0;
        var html = '<div class="summary-items">';

        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var name = String(item.name || 'Product');
            var price = parsePrice(item.price);
            var qty = Math.max(1, parseInt(item.quantity) || 1);
            var size = String(item.size || '');
            var image = String(item.image || '');
            var lineTotal = price * qty;
            subtotal += lineTotal;

            html += '<div class="summary-item">';
            if (image) {
                html += '<img src="' + escapeHTML(image) + '" alt="' + escapeHTML(name) + '" class="summary-item-image">';
            } else {
                html += '<div class="summary-item-image" style="background:#f0f0f0;"></div>';
            }
            html += '<div class="summary-item-details">';
            html += '<h4>' + escapeHTML(name) + '</h4>';
            html += '<p>' + (size ? escapeHTML(size) + ' &times; ' : '') + qty + '</p>';
            html += '</div>';
            html += '<div class="summary-item-price">AED ' + lineTotal.toLocaleString() + '</div>';
            html += '</div>';
        }

        html += '</div>';

        var shipping = selectedRegion ? parsePrice(selectedRegion.price) : 0;
        var total = subtotal + shipping;

        html += '<div class="summary-totals">';
        html += '<div class="summary-row"><span>Subtotal</span><span>AED ' + subtotal.toLocaleString() + '</span></div>';
        html += '<div class="summary-row"><span>Shipping</span><span>' + (shipping > 0 ? 'AED ' + shipping.toLocaleString() : 'Select country') + '</span></div>';
        html += '<div class="summary-row summary-total"><span>Total</span><span>AED ' + total.toLocaleString() + '</span></div>';
        html += '</div>';

        orderSummary.innerHTML = html;
        sessionStorage.setItem('orderTotal', String(total));

        // Sync everywhere
        var mob = document.getElementById('orderSummaryMobile');
        if (mob) mob.innerHTML = html;
        var btn = document.getElementById('checkoutSubmitInline');
        if (btn) btn.innerHTML = '<span>Pay AED ' + total.toLocaleString() + '</span>';
        var st = document.getElementById('stickyTotal');
        if (st) st.textContent = 'AED ' + total.toLocaleString();
        var mt = document.getElementById('mobileSummaryTotal');
        if (mt) mt.textContent = 'AED ' + total.toLocaleString();
    }

    function showError(message) {
        const errorDiv = document.getElementById('checkout-errors');
        if (errorDiv) {
            errorDiv.textContent = message;
        }
    }

    async function startCheckoutSession(customer) {
        if (!submitBtn) {
            showError('Checkout form is not available right now.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Redirecting to Stripe...</span>';

        try {
            const cart = safeParseArray('ghoharyCart');
            if (!cart.length) {
                throw new Error('Your cart is empty');
            }

            const lineItems = cart.map(item => {
                const price = parsePrice(item.price);
                
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
            const selectedRegion = shippingRegions.find(r => r.id === customer.country);
            if (!selectedRegion || !selectedRegion.enabled) {
                throw new Error('Shipping is not available for the selected country.');
            }
            const totalShipping = Number(selectedRegion.price || 0);
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

            const items = cart.map(item => ({
                name: item.name || 'GHOHARY Item',
                size: item.size || '',
                quantity: Number(item.quantity || 1),
                unitPrice: parsePrice(item.price),
                image: item.image || ''
            }));

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
            submitBtn.innerHTML = '<span>Continue to secure payment</span>';
        }
    }

    function updateShippingNotice() {
        const notice = document.getElementById('shippingNotice');
        if (!notice) return;
        const region = getSelectedRegion();
        if (region && region.enabled && region.eta) {
            notice.textContent = 'Estimated delivery: ' + region.eta;
        } else if (region && !region.enabled) {
            notice.textContent = 'Shipping not available for this country.';
        } else {
            notice.textContent = '';
        }
    }

    if (checkoutForm) {
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', () => {
                renderOrderSummary();
                updateShippingNotice();
            });
        }

        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Use checkout-ui.js validation if available
            if (window.checkoutUIValidate && !window.checkoutUIValidate()) {
                return;
            }

            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const address = document.getElementById('address').value;

            const customerPayload = {
                firstName,
                lastName,
                email,
                address,
                addressLine2: document.getElementById('addressLine2')?.value || '',
                city: document.getElementById('city').value,
                zip: document.getElementById('zip').value,
                country: document.getElementById('country')?.value || '',
                phone: document.getElementById('phone').value
            };

            const selectedRegion = getSelectedRegion();
            if (!selectedRegion || !selectedRegion.enabled) {
                showError('Shipping is not available for the selected country.');
                return;
            }

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

        const users = safeParseArray('ghoharyUsers');
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
                zip: existing.zip || '',
                country: existing.country || 'uae'
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
            zip: customer.zip || '',
            country: customer.country || 'uae',
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
            zip: newUser.zip,
            country: newUser.country
        }));
        // temp password not stored client-side for security
    }

    function saveAddressIfRequested(customer) {
        const saveAddress = document.getElementById('saveAddress');
        if (!saveAddress || !saveAddress.checked) return;

        const email = (customer.email || '').trim().toLowerCase();
        if (!email) return;

        const users = safeParseArray('ghoharyUsers');
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email);
        if (userIndex === -1) return;

        users[userIndex] = {
            ...users[userIndex],
            address: customer.address || '',
            addressLine2: customer.addressLine2 || '',
            city: customer.city || '',
            zip: customer.zip || '',
            country: customer.country || 'uae',
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
            zip: users[userIndex].zip || '',
            country: users[userIndex].country || 'uae'
        }));
    }

    const checkoutLoginBtn = document.getElementById('checkoutLoginBtn');
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
                zip: document.getElementById('zip')?.value || '',
                country: document.getElementById('country')?.value || 'uae'
            };
            sessionStorage.setItem('ghoharyCheckoutForm', JSON.stringify(formSnapshot));
            window.location.href = 'auth-gate.html?redirect=checkout.html';
        });
    }

    (async function initCheckout() {
        try {
            await loadShippingRegions();
        } catch (e) {
            console.error('[Checkout] loadShippingRegions failed:', e);
        }
        try {
            loadSavedCheckoutData();
        } catch (e) {
            console.error('[Checkout] loadSavedCheckoutData failed:', e);
        }
        try {
            updateShippingNotice();
        } catch (e) {
            // non-critical
        }
        try {
            renderOrderSummary();
        } catch (e) {
            console.error('[Checkout] renderOrderSummary failed:', e);
            if (orderSummary) orderSummary.innerHTML = '<p style="color:red;font-size:13px;padding:12px;">Error: ' + e.message + '</p>';
        }
    })();
})();
