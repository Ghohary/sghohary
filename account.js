// Account Page Functionality
(function() {
    'use strict';

    // Get DOM elements
    const accountGrid = document.querySelector('.account-grid');
    const signOutBtn = document.getElementById('signOutBtn');
    const profileForm = document.getElementById('profileForm');
    const navItems = document.querySelectorAll('.account-nav-item:not(.special)');
    const tabs = document.querySelectorAll('.account-tab');

    // Get current user from localStorage
    function getCurrentUser() {
        return JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    }

    // Check if user is signed in on page load
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.email) {
        // Redirect to auth-gate if not logged in
        window.location.href = 'auth-gate.html';
        return; // Stop execution
    }

    // ===== SIGN OUT =====
    signOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('ghoharyCurrentUser');
            window.location.href = 'auth-gate.html';
        }
    });

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
        
        // Show success
        const successBanner = document.getElementById('successBanner');
        if (successBanner) {
            successBanner.style.display = 'flex';
            setTimeout(() => {
                successBanner.style.display = 'none';
            }, 3000);
        }

        const btn = profileForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>✓ Saved</span>';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });

    // ===== LOAD ORDERS =====
    function loadOrderHistory(email) {
        const ordersTab = document.getElementById('ordersTab');
        ordersTab.innerHTML = '<h2 class="tab-title">My Orders</h2>';
        
        let orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
        
        // Filter orders by user email
        let userOrders = orders.filter(order => !order.email || order.email === email);

        const ordersList = document.createElement('div');
        ordersList.className = 'orders-list';

        if (userOrders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                    </svg>
                    <h3>No Orders Yet</h3>
                    <p>Start your journey to finding the perfect gown</p>
                    <a href="collections.html" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">
                        <span>Browse Collections</span>
                    </a>
                </div>
            `;
        } else {
            userOrders.reverse().forEach(order => {
                const orderDate = new Date(order.date).toLocaleDateString('en-AE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const orderElement = document.createElement('div');
                orderElement.className = 'order-card';
                orderElement.innerHTML = `
                    <div class="order-header">
                        <div>
                            <h3>${order.orderNumber}</h3>
                            <p class="order-date">${orderDate}</p>
                        </div>
                        <div class="order-total">
                            <span class="order-amount">AED ${parseFloat(order.orderTotal || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="order-details">
                        <p><strong>Customer:</strong> ${order.customerName}</p>
                        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                        <p><strong>Delivery Address:</strong> ${order.address}, ${order.city}, ${order.emirate}</p>
                    </div>
                `;
                ordersList.appendChild(orderElement);
            });
        }

        ordersTab.appendChild(ordersList);
    }

    // ===== LOAD APPOINTMENTS =====
    function loadAppointments() {
        const appointmentsTab = document.getElementById('appointmentsTab');
        if (!appointmentsTab) return;

        let appointments = JSON.parse(localStorage.getItem('ghoharyAppointments') || '[]');

        const appointmentsList = document.createElement('div');
        appointmentsList.className = 'appointments-list';

        if (appointments.length === 0) {
            appointmentsList.innerHTML = `
                <div class="cta-card">
                    <h3>Ready for Your First Visit?</h3>
                    <p>Book a consultation to discuss your dream gown</p>
                    <a href="appointment.html" class="btn btn-primary">
                        <span>Schedule Appointment</span>
                    </a>
                </div>
            `;
        } else {
            appointments.forEach(apt => {
                const aptDate = new Date(apt.date).toLocaleDateString('en-AE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const aptElement = document.createElement('div');
                aptElement.className = 'appointment-card';
                aptElement.innerHTML = `
                    <div class="appointment-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <div class="appointment-details">
                        <h4>${apt.serviceType || 'Consultation'}</h4>
                        <p class="appointment-date">${aptDate}</p>
                        <p class="appointment-location">${apt.location || 'GHOHARY Atelier'}</p>
                    </div>
                `;
                appointmentsList.appendChild(aptElement);
            });
        }

        appointmentsTab.innerHTML = '<h2 class="tab-title">My Appointments</h2>';
        appointmentsTab.appendChild(appointmentsList);
    }

    // ===== TAB NAVIGATION =====
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const tabName = this.dataset.tab;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab
            tabs.forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

    // ===== UPDATE CART COUNT =====
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    updateCartCount();

    // ===== INITIALIZE =====
    loadProfileData(currentUser);
    loadOrderHistory(currentUser.email);
    loadAppointments();

    console.log('🔐 Account page loaded for:', currentUser.email);
})();
