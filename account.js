// Account Page - Orders, Invoices & Tracking
(function() {
    'use strict';

    window.ACCOUNT_PAGE_HANDLED = true;

    // Get DOM elements
    const accountGrid = document.querySelector('.account-grid');
    const signOutBtn = document.getElementById('signOutBtn');
    const profileForm = document.getElementById('profileForm');
    const navItems = document.querySelectorAll('.account-nav-item:not(.special)');
    const tabs = document.querySelectorAll('.account-tab');
    const ordersContainer = document.getElementById('ordersContainer');
    const successBanner = document.getElementById('successBanner');

    // Get current user from localStorage
    function getCurrentUser() {
        return JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    }

    // Check if user is signed in on page load
    let currentUser = getCurrentUser();
    const params = new URLSearchParams(window.location.search);
    const checkoutSuccess = params.get('checkout') === 'success' || params.get('order') === 'success';
    
    if ((!currentUser || !currentUser.email) && checkoutSuccess) {
        const pendingOrderRaw = localStorage.getItem('ghoharyPendingOrder');
        if (pendingOrderRaw) {
            const pendingOrder = JSON.parse(pendingOrderRaw);
            if (pendingOrder?.customer?.email) {
                const guestUser = {
                    email: pendingOrder.customer.email,
                    firstName: pendingOrder.customer.firstName || '',
                    lastName: pendingOrder.customer.lastName || '',
                    phone: pendingOrder.customer.phone || '',
                    address: pendingOrder.customer.address || '',
                    city: pendingOrder.customer.city || '',
                    emirate: pendingOrder.customer.emirate || ''
                };
                localStorage.setItem('ghoharyCurrentUser', JSON.stringify(guestUser));
                currentUser = guestUser;
                
                // Create order from pending order
                createOrderFromPending(pendingOrder, guestUser);
            }
        }
    }
    
    if (!currentUser || !currentUser.email) {
        window.location.href = 'auth-gate.html';
        return;
    }

    // ===== CREATE ORDER FROM PENDING =====
    function createOrderFromPending(pendingOrder, user) {
        const orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
        
        const newOrder = {
            id: 'ORD' + Date.now(),
            ownerEmail: user.email,
            customerName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city,
            emirate: user.emirate,
            items: pendingOrder.cart || [],
            subtotal: Math.round((pendingOrder.orderTotal - 120) * 100) / 100,
            shipping: 120,
            amount: pendingOrder.orderTotal,
            total: pendingOrder.orderTotal,
            status: 'processing',
            paymentMethod: 'Credit Card (Stripe)',
            createdAt: new Date().toISOString(),
            date: new Date().toISOString()
        };
        
        orders.push(newOrder);
        localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
        
        // Clear pending order
        localStorage.removeItem('ghoharyPendingOrder');
    }

    // ===== SIGN OUT =====
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                localStorage.removeItem('ghoharyCurrentUser');
                localStorage.removeItem('ghoharyCart');
                window.location.href = 'auth-gate.html';
            }
        });
    }

    // ===== RENDER ORDERS =====
    function renderOrders() {
        if (!ordersContainer) return;
        
        const orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
        const userOrders = orders.filter(o => o.ownerEmail === currentUser.email || !o.ownerEmail);
        
        if (userOrders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M9 2L6.46 9H2l5.91 4.287L5.82 21 12 16.44 18.18 21l-2.09-7.713L22 9h-4.46L15 2H9z"/>
                    </svg>
                    <h3>No orders yet</h3>
                    <p>Your orders will appear here once you complete a purchase</p>
                    <a href="collections.html" class="btn btn-primary">
                        <span>Browse Collections</span>
                    </a>
                </div>
            `;
            return;
        }

        let ordersHTML = '';
        userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(order => {
            const orderDate = new Date(order.createdAt);
            const formattedDate = orderDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            const statusClass = (order.status || 'pending').toLowerCase();
            const statusLabel = (order.status || 'Pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1);
            
            ordersHTML += `
                <div class="order-card" data-order-id="${order.id}">
                    <div class="order-header">
                        <div>
                            <div class="order-number">Order #${order.id.substring(3, 11)}</div>
                            <div class="order-date">${formattedDate}</div>
                        </div>
                        <div class="order-status ${statusClass}">${statusLabel}</div>
                    </div>
                    
                    <div class="order-items">
                        ${(order.items || []).map(item => `
                            <div class="order-item">
                                <img src="${item.image || 'https://via.placeholder.com/80x100'}" alt="${item.name}" class="order-item-image">
                                <div class="order-item-details">
                                    <h4>${item.name}</h4>
                                    <p>Size: ${item.size || 'One Size'}</p>
                                    <p>Quantity: ${item.quantity || 1}</p>
                                </div>
                                <div class="order-item-price">AED ${((item.amount || 0) / 100).toLocaleString()}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-summary">
                        <div class="order-summary-row">
                            <span>Subtotal</span>
                            <span>AED ${(order.subtotal || 0).toLocaleString()}</span>
                        </div>
                        <div class="order-summary-row">
                            <span>Shipping</span>
                            <span>AED ${(order.shipping || 120).toLocaleString()}</span>
                        </div>
                        <div class="order-summary-row total">
                            <span>Total</span>
                            <span>AED ${(order.total || order.amount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="order-actions">
                        <button class="btn-view-invoice" data-order-id="${order.id}">📄 View Invoice</button>
                        <button class="btn-track" data-order-id="${order.id}">📍 Track Order</button>
                        ${order.status !== 'cancelled' ? `<button class="btn-reorder" data-order-id="${order.id}">🛍️ Reorder</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        ordersContainer.innerHTML = ordersHTML;
        
        // Attach event listeners
        document.querySelectorAll('.btn-view-invoice').forEach(btn => {
            btn.addEventListener('click', function() {
                showInvoice(this.dataset.orderId, userOrders);
            });
        });
        
        document.querySelectorAll('.btn-track').forEach(btn => {
            btn.addEventListener('click', function() {
                showTracking(this.dataset.orderId, userOrders);
            });
        });
        
        document.querySelectorAll('.btn-reorder').forEach(btn => {
            btn.addEventListener('click', function() {
                reorderItems(this.dataset.orderId, userOrders);
            });
        });
    }

    // ===== SHOW INVOICE =====
    function showInvoice(orderId, userOrders) {
        const order = userOrders.find(o => o.id === orderId);
        if (!order) return;
        
        const invoiceDate = new Date(order.createdAt);
        const invoiceNo = orderId.substring(3, 11);
        
        let invoiceHTML = `
            <div class="invoice-modal active" id="invoiceModal">
                <div class="invoice-container">
                    <div class="invoice-header">
                        <div class="invoice-title">Invoice</div>
                        <button class="invoice-close" id="closeInvoice">&times;</button>
                    </div>
                    
                    <div class="invoice-content">
                        <div class="invoice-branding">
                            <div class="invoice-logo">GHOHARY</div>
                            <div class="invoice-details">
                                <strong>Invoice No:</strong> ${invoiceNo}<br>
                                <strong>Date:</strong> ${invoiceDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                        
                        <div class="invoice-grid">
                            <div class="invoice-section">
                                <h4>Bill To</h4>
                                <p>
                                    ${order.customerName}<br>
                                    ${order.email}<br>
                                    ${order.phone || ''}<br>
                                    ${order.address}<br>
                                    ${order.city}, ${order.emirate}
                                </p>
                            </div>
                            <div class="invoice-section">
                                <h4>Ship To</h4>
                                <p>
                                    ${order.customerName}<br>
                                    ${order.address}<br>
                                    ${order.city}, ${order.emirate}
                                </p>
                            </div>
                        </div>
                        
                        <table class="invoice-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Size</th>
                                    <th>Qty</th>
                                    <th style="text-align: right;">Price</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(order.items || []).map(item => {
                                    const itemTotal = ((item.amount || 0) / 100) * item.quantity;
                                    return `
                                        <tr>
                                            <td>${item.name}</td>
                                            <td>${item.size || 'One Size'}</td>
                                            <td>${item.quantity}</td>
                                            <td style="text-align: right;">AED ${((item.amount || 0) / 100).toLocaleString()}</td>
                                            <td style="text-align: right;">AED ${itemTotal.toLocaleString()}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        
                        <div class="invoice-totals">
                            <div class="totals-box">
                                <div class="totals-row">
                                    <span>Subtotal</span>
                                    <span>AED ${(order.subtotal || 0).toLocaleString()}</span>
                                </div>
                                <div class="totals-row">
                                    <span>Shipping</span>
                                    <span>AED ${(order.shipping || 120).toLocaleString()}</span>
                                </div>
                                <div class="totals-row total">
                                    <span>Total Due</span>
                                    <span>AED ${(order.total || order.amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="invoice-footer">
                            <strong>Payment Method:</strong> ${order.paymentMethod || 'Credit Card'}<br>
                            Thank you for your purchase! Contact us at support@ghohary.ae for inquiries.
                        </div>
                        
                        <div class="invoice-actions">
                            <button class="btn-print" id="printInvoice">🖨️ Print</button>
                            <button class="btn-download" id="downloadInvoice">⬇️ Download</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', invoiceHTML);
        
        const modal = document.getElementById('invoiceModal');
        const closeBtn = document.getElementById('closeInvoice');
        const printBtn = document.getElementById('printInvoice');
        const downloadBtn = document.getElementById('downloadInvoice');
        
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        printBtn.addEventListener('click', () => window.print());
        downloadBtn.addEventListener('click', () => alert('PDF download coming soon!'));
    }

    // ===== SHOW TRACKING =====
    function showTracking(orderId, userOrders) {
        const order = userOrders.find(o => o.id === orderId);
        if (!order) return;
        
        const trackingSteps = getTrackingSteps(order.status);
        const ordersTab = document.getElementById('ordersTab');
        
        let trackingHTML = `
            <h2 class="tab-title">Order Tracking</h2>
            <div class="tracking-container active">
                <div class="tracking-header">
                    <div class="tracking-title">Track Your Order</div>
                    <div class="tracking-number">Order #${orderId.substring(3, 11)}</div>
                </div>
                
                <div class="tracking-timeline">
                    ${trackingSteps.map(step => `
                        <div class="tracking-step ${step.status === 'completed' ? 'completed' : ''} ${step.status === 'current' ? 'current' : ''}">
                            <div class="tracking-dot"></div>
                            <div class="tracking-info">
                                <h4>${step.title}</h4>
                                <p>${step.description}</p>
                                <p style="margin-top: 8px; font-size: 12px; color: #999;">${step.date}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 2rem; text-align: center;">
                    <button class="btn btn-secondary" onclick="document.querySelector('[data-tab=orders]').click()" style="padding: 10px 20px;">← Back to Orders</button>
                </div>
            </div>
        `;
        
        ordersTab.innerHTML = trackingHTML;
    }

    // ===== GET TRACKING STEPS =====
    function getTrackingSteps(status) {
        const baseDate = new Date();
        const steps = [
            { title: 'Order Confirmed', description: 'Your order has been confirmed', date: baseDate.toLocaleDateString(), status: 'confirmed' },
            { title: 'Processing', description: 'Being carefully crafted by our artisans', date: new Date(baseDate.getTime() + 1*24*60*60*1000).toLocaleDateString(), status: 'processing' },
            { title: 'Quality Check', description: 'Final inspection and packaging', date: new Date(baseDate.getTime() + 3*24*60*60*1000).toLocaleDateString(), status: 'quality' },
            { title: 'Shipped', description: 'Shipped via Aramex', date: new Date(baseDate.getTime() + 5*24*60*60*1000).toLocaleDateString(), status: 'shipped' },
            { title: 'In Transit', description: 'On its way to you', date: new Date(baseDate.getTime() + 7*24*60*60*1000).toLocaleDateString(), status: 'transit' },
            { title: 'Out for Delivery', description: 'Will be delivered today', date: new Date(baseDate.getTime() + 10*24*60*60*1000).toLocaleDateString(), status: 'delivery' },
            { title: 'Delivered', description: 'Successfully delivered', date: new Date(baseDate.getTime() + 11*24*60*60*1000).toLocaleDateString(), status: 'delivered' }
        ];
        
        const statusMap = { 'pending': 0, 'processing': 1, 'shipped': 3, 'in-transit': 4, 'out-for-delivery': 5, 'delivered': 6 };
        const currentIndex = statusMap[status] || 0;
        
        return steps.map((step, index) => ({
            ...step,
            status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending'
        }));
    }

    // ===== REORDER ITEMS =====
    function reorderItems(orderId, userOrders) {
        const order = userOrders.find(o => o.id === orderId);
        if (!order) return;
        
        let cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        (order.items || []).forEach(item => {
            const existing = cart.find(c => c.id === item.id && c.size === item.size);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                cart.push({
                    id: item.id,
                    name: item.name,
                    price: (item.amount || 0) / 100,
                    image: item.image,
                    size: item.size,
                    quantity: item.quantity
                });
            }
        });
        
        localStorage.setItem('ghoharyCart', JSON.stringify(cart));
        
        if (successBanner) {
            successBanner.textContent = '✓ Items added to cart!';
            successBanner.style.display = 'flex';
            setTimeout(() => { window.location.href = 'cart.html'; }, 1500);
        }
    }

    // ===== LOAD PROFILE DATA =====
    function loadProfileData(user) {
        document.getElementById('profileFirstName').value = user.firstName || '';
        document.getElementById('profileLastName').value = user.lastName || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileAddress').value = user.address || '';
        document.getElementById('profileCity').value = user.city || '';
        document.getElementById('profileEmirate').value = user.emirate || '';
    }

    // ===== SAVE PROFILE =====
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userData = {
                email: document.getElementById('profileEmail').value,
                firstName: document.getElementById('profileFirstName').value,
                lastName: document.getElementById('profileLastName').value,
                phone: document.getElementById('profilePhone').value,
                address: document.getElementById('profileAddress').value,
                city: document.getElementById('profileCity').value,
                emirate: document.getElementById('profileEmirate').value
            };

            localStorage.setItem('ghoharyCurrentUser', JSON.stringify(userData));
            
            if (successBanner) {
                successBanner.style.display = 'flex';
                setTimeout(() => { successBanner.style.display = 'none'; }, 3000);
            }

            const btn = profileForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>✓ Saved</span>';
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        });
    }

    // ===== TAB NAVIGATION =====
    if (navItems.length > 0) {
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const tabName = this.dataset.tab;
                
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                tabs.forEach(tab => tab.classList.remove('active'));
                document.getElementById(tabName + 'Tab').classList.add('active');
                
                if (tabName === 'orders') renderOrders();
            });
        });
    }

    // ===== INITIALIZE =====
    loadProfileData(currentUser);
    renderOrders();

    console.log('✅ Account page loaded for:', currentUser.email);
})();
