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

    // ===== LOAD PRODUCTS FROM SERVER API =====
    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            const adminProducts = await response.json();
            console.log('[Collections] Products from API:', adminProducts);
            
            // Filter only visible products
            allProducts = adminProducts.filter(p => p.visible !== false);
            filteredProducts = [...allProducts];
            renderProducts();
        } catch (err) {
            console.warn('[Collections] API not available:', err);
            allProducts = [];
            filteredProducts = [];
            renderProducts();
        }
    }

    // ===== RENDER PRODUCTS =====
    function renderProducts() {
        // Clear existing product cards
        const items = productsGrid.querySelectorAll('.product-card');
        items.forEach(item => item.remove());

        // Use all filtered products (don't filter out those without images)
        // If no products, show message
        if (filteredProducts.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.gridColumn = '1 / -1';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '50px 20px';
            emptyMsg.innerHTML = '<p style="font-size: 18px; color: var(--text-muted);">No products found in this category.</p>';
            productsGrid.appendChild(emptyMsg);
            return;
        }

        // Paginate products
        const startIndex = 0;
        const endIndex = currentPage * itemsPerPage;
        const productsToShow = filteredProducts.slice(startIndex, endIndex);

        // Render visible products
        productsToShow.forEach((product, index) => {
            // Determine filter category value based on product category
            let filterCategory = 'custom';
            if (product.category) {
                const cat = product.category.toLowerCase();
                if (cat.includes('bridal')) filterCategory = 'bridal';
                else if (cat.includes('evening')) filterCategory = 'evening';
                else if (cat.includes('custom')) filterCategory = 'custom';
            }
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card fade-in';
            productCard.dataset.category = filterCategory;
            productCard.dataset.date = product.createdAt || Date.now();
            
            // Get first image or use placeholder
            const productImage = (product.images && product.images.length > 0) 
                ? product.images[0] 
                : '/placeholder.jpg';
            
            console.log('[Collections] Product:', product.name, 'Images:', product.images, 'Using:', productImage);
            
            // Determine ribbon label based on category
            let ribbonLabel = 'Custom';
            const categoryLower = (product.category || '').toLowerCase();
            if (categoryLower.includes('bridal')) ribbonLabel = 'Bridal';
            else if (categoryLower.includes('evening')) ribbonLabel = 'Evening';
            
            productCard.innerHTML = `
                <a href="product.html?id=${product.id}" class="product-link">
                    <div class="product-image-wrapper">
                        <img src="${productImage}" alt="${product.name}" class="product-image" loading="lazy">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-category">${product.category || 'Custom Design'}</p>
                        <p class="product-price">${
                            product.price && product.price !== 'Price Upon Request'
                                ? `${parseFloat(product.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} AED` 
                                : 'Price Upon Request'
                        }</p>
                    </div>
                </a>
            `;
            
            productsGrid.appendChild(productCard);
            
            setTimeout(() => {
                productCard.classList.add('visible');
            }, index * 50);
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
                    const category = (product.category || '').toLowerCase();
                    const filter = currentFilter.toLowerCase();
                    // Check if category contains the filter keyword
                    return category.includes(filter);
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
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // ===== INITIALIZATION =====
    loadProducts();
    updateCartCount();

    console.log('Collections page loaded');
})();
