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

    // Check for order success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('order') === 'success') {
        const successBanner = document.getElementById('successBanner');
        successBanner.style.display = 'flex';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successBanner.style.display = 'none';
        }, 5000);
        
        // Load last order if exists
        const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
        if (lastOrder) {
            // Could display order confirmation here
            console.log('Last order:', lastOrder);
        }
    }

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
