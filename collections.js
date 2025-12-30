// Collections Page Functionality
(function() {
    'use strict';

    // ===== FILTER PRODUCTS =====
    const filterBtns = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;

            // Filter products with animation
            productCards.forEach((card, index) => {
                const category = card.dataset.category;
                
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, index * 50);
                } else {
                    card.classList.remove('visible');
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // ===== SORT PRODUCTS =====
    const sortSelect = document.getElementById('sortSelect');
    const productsGrid = document.querySelector('.products-grid');

    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            const products = Array.from(productCards);

            products.sort((a, b) => {
                if (sortValue === 'newest') {
                    return b.dataset.date - a.dataset.date;
                } else if (sortValue === 'price-low') {
                    const priceA = parseFloat(a.querySelector('.product-price').textContent.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.querySelector('.product-price').textContent.replace(/[^0-9.-]+/g, ''));
                    return priceA - priceB;
                } else if (sortValue === 'price-high') {
                    const priceA = parseFloat(a.querySelector('.product-price').textContent.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.querySelector('.product-price').textContent.replace(/[^0-9.-]+/g, ''));
                    return priceB - priceA;
                }
                return 0;
            });

            products.forEach(product => {
                productsGrid.appendChild(product);
            });
        });
    }

    // ===== LOAD MORE =====
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            this.innerHTML = '<span>Loading...</span>';
            
            // Simulate loading
            setTimeout(() => {
                this.innerHTML = '<span>All Gowns Loaded</span>';
                this.disabled = true;
                this.style.opacity = '0.5';
            }, 1000);
        });
    }

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

    console.log('Collections page loaded');
})();
