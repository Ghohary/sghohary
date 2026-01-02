(function() {
    'use strict';
    
    // Load header.html into the page
    function loadHeader() {
        fetch('header.html')
            .then(response => response.text())
            .then(html => {
                // Find or create header container
                let headerContainer = document.querySelector('header');
                if (!headerContainer) {
                    headerContainer = document.createElement('header');
                    document.body.insertBefore(headerContainer, document.body.firstChild);
                }
                headerContainer.innerHTML = html;
                
                // Re-initialize mobile menu functionality
                initializeMobileMenu();
                updateCartCount();
                window.addEventListener('cartUpdated', updateCartCount);
            })
            .catch(error => console.error('Error loading header:', error));
    }
    
    // Initialize mobile menu toggle
    function initializeMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
            
            // Close menu when a link is clicked
            const links = navLinks.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', function() {
                    mobileMenuBtn.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }
    }
    
    // Update cart count badge
    function updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            if (totalItems > 0) {
                cartCountElement.textContent = totalItems;
                cartCountElement.style.display = 'flex';
            } else {
                cartCountElement.style.display = 'none';
            }
        }
    }
    
    // Load header when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }
})();
