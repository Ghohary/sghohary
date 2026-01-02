// Collections Page Functionality
(function() {
    'use strict';

    const productsGrid = document.querySelector('.products-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sortSelect');
    const loadMoreBtn = document.querySelector('.load-more-btn');
    
    let allProducts = [];
    let filteredProducts = [];
    let currentFilter = 'all';
    const itemsPerPage = 12;
    let currentPage = 1;

    // ===== LOAD PRODUCTS FROM LOCALSTORAGE =====
    function loadProducts() {
        // Get admin products
        const adminProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        
        // Filter only visible products
        allProducts = adminProducts.filter(p => p.visible !== false);
        
        filteredProducts = [...allProducts];
        renderProducts();
    }

    // ===== RENDER PRODUCTS =====
    function renderProducts() {
        // Clear grid except load more container
        const items = productsGrid.querySelectorAll('.product-card');
        items.forEach(item => item.remove());

        // Paginate products
        const startIndex = 0;
        const endIndex = currentPage * itemsPerPage;
        const productsToShow = filteredProducts.slice(startIndex, endIndex);

        // Render visible products
        productsToShow.forEach((product, index) => {
            const category = product.category ? product.category.toLowerCase().replace(/\s+/g, '') : 'custom';
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card fade-in';
            productCard.dataset.category = category;
            productCard.dataset.date = product.createdAt || Date.now();
            
            // Get first image or use placeholder
            const productImage = product.images && product.images[0] 
                ? product.images[0] 
                : 'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=800&h=1200&fit=crop';
            
            productCard.innerHTML = `
                <a href="product.html?id=${product.id}" class="product-link">
                    <div class="product-image-wrapper">
                        <img src="${productImage}" alt="${product.name}" class="product-image" loading="lazy">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-category">${product.category || 'Custom Design'}</p>
                        <p class="product-price">${
                            typeof product.price === 'number' 
                                ? `AED ${product.price.toLocaleString()}` 
                                : (product.price || 'Price Upon Request')
                        }</p>
                    </div>
                </a>
            `;
            
            setTimeout(() => {
                productCard.classList.add('visible');
            }, index * 50);
            
            productsGrid.insertBefore(productCard, loadMoreBtn?.parentElement);
        });

        // Update load more button visibility
        if (loadMoreBtn) {
            if (endIndex >= filteredProducts.length) {
                loadMoreBtn.innerHTML = '<span>All Gowns Loaded</span>';
                loadMoreBtn.disabled = true;
                loadMoreBtn.style.opacity = '0.5';
            } else {
                loadMoreBtn.innerHTML = '<span>Load More Gowns</span>';
                loadMoreBtn.disabled = false;
                loadMoreBtn.style.opacity = '1';
            }
        }
    }

    // ===== FILTER PRODUCTS =====
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            currentFilter = this.dataset.filter;
            currentPage = 1; // Reset pagination

            // Filter products
            if (currentFilter === 'all') {
                filteredProducts = [...allProducts];
            } else {
                filteredProducts = allProducts.filter(product => {
                    const category = (product.category || '').toLowerCase().replace(/\s+/g, '');
                    return category === currentFilter;
                });
            }

            renderProducts();
        });
    });

    // ===== SORT PRODUCTS =====
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            
            if (sortValue === 'newest') {
                filteredProducts.sort((a, b) => {
                    return (b.createdAt || 0) - (a.createdAt || 0);
                });
            } else if (sortValue === 'price-low') {
                filteredProducts.sort((a, b) => {
                    const priceA = typeof a.price === 'number' ? a.price : Infinity;
                    const priceB = typeof b.price === 'number' ? b.price : Infinity;
                    return priceA - priceB;
                });
            } else if (sortValue === 'price-high') {
                filteredProducts.sort((a, b) => {
                    const priceA = typeof a.price === 'number' ? a.price : 0;
                    const priceB = typeof b.price === 'number' ? b.price : 0;
                    return priceB - priceA;
                });
            }
            
            currentPage = 1; // Reset pagination
            renderProducts();
        });
    }

    // ===== LOAD MORE FUNCTIONALITY =====
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!this.disabled) {
                this.innerHTML = '<span>Loading...</span>';
                this.disabled = true;
                
                // Simulate loading with slight delay
                setTimeout(() => {
                    currentPage++;
                    renderProducts();
                }, 500);
            }
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

    // ===== INITIALIZATION =====
    loadProducts();
    updateCartCount();

    console.log('Collections page loaded');
})();
