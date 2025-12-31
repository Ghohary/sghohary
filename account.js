// Account Page Functionality
(function() {
    'use strict';

    // Tab Navigation
    const navItems = document.querySelectorAll('.account-nav-item:not(.special)');
    const tabs = document.querySelectorAll('.account-tab');

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

    // Load and display order history
    function loadOrderHistory() {
        const ordersContainer = document.getElementById('ordersTab');
        if (!ordersContainer) return;

        // Get all orders from localStorage
        let orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
        
        // If no orders array exists, check for lastOrder (backward compatibility)
        if (orders.length === 0) {
            const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
            if (lastOrder) {
                orders = [lastOrder];
                localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
            }
        }

        // Clear existing content
        const existingOrders = ordersContainer.querySelector('.orders-list');
        if (existingOrders) {
            existingOrders.remove();
        }

        // Create orders list
        const ordersList = document.createElement('div');
        ordersList.className = 'orders-list';

        if (orders.length === 0) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No orders yet</p>';
        } else {
            orders.reverse().forEach(order => {
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
                        <p><strong>Email:</strong> ${order.email}</p>
                        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                        <p><strong>Delivery Address:</strong> ${order.address}, ${order.city}, ${order.emirate}</p>
                    </div>
                `;
                ordersList.appendChild(orderElement);
            });
        }

        ordersContainer.appendChild(ordersList);
    }

    // Check for order success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('order') === 'success') {
        const successBanner = document.getElementById('successBanner');
        successBanner.style.display = 'flex';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successBanner.style.display = 'none';
        }, 5000);
        
        // Load last order and add to history
        const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
        if (lastOrder) {
            // Add to orders array
            let orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
            orders.push(lastOrder);
            localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
            console.log('Order saved to history:', lastOrder);
        }
    }

    // Load orders on page load
    loadOrderHistory();

    // Update cart count
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

    console.log('Account page loaded');
})();
