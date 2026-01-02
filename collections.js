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

    // ===== INITIALIZE SEED DATA IF EMPTY =====
    function initializeSeedData() {
        let stored = localStorage.getItem('ghoharyProducts');
        
        // Only initialize if localStorage is completely empty
        if (!stored || stored === '[]' || JSON.parse(stored).length === 0) {
            const seedProducts = [
                {
                    id: 1,
                    name: 'Ethereal Lace Couture',
                    category: 'Bridal Couture',
                    price: 15000,
                    sku: 'EL-001',
                    description: 'Exquisite bridal gown with delicate lace details and flowing train. Perfect for the modern bride seeking timeless elegance.',
                    sizes: [{size: '32', inventory: 2}, {size: '34', inventory: 3}, {size: '36', inventory: 2}, {size: '38', inventory: 1}],
                    colors: ['White', 'Ivory', 'Champagne'],
                    images: ['https://picsum.photos/1200/1600?random=1'],
                    visible: true,
                    createdAt: new Date('2025-01-01').toISOString()
                },
                {
                    id: 2,
                    name: 'Crystal Romance',
                    category: 'Bridal Couture',
                    price: 18500,
                    sku: 'CR-002',
                    description: 'Stunning crystal-embellished bridal masterpiece with hand-sewn Swarovski crystals and silk organza base.',
                    sizes: [{size: '34', inventory: 1}, {size: '36', inventory: 2}, {size: '38', inventory: 2}, {size: '40', inventory: 1}],
                    colors: ['White', 'Ivory'],
                    images: ['https://picsum.photos/1200/1600?random=2'],
                    visible: true,
                    createdAt: new Date('2025-01-02').toISOString()
                },
                {
                    id: 3,
                    name: 'Royal Silk Train',
                    category: 'Bridal Couture',
                    price: 22000,
                    sku: 'RST-003',
                    description: 'Majestic bridal gown with opulent silk train, featuring intricate beadwork and classic silhouette.',
                    sizes: [{size: '36', inventory: 1}, {size: '38', inventory: 2}, {size: '40', inventory: 1}],
                    colors: ['White', 'Ivory', 'Champagne'],
                    images: ['https://picsum.photos/1200/1600?random=3'],
                    visible: true,
                    createdAt: new Date('2025-01-03').toISOString()
                },
                {
                    id: 4,
                    name: 'Evening Elegance',
                    category: 'Evening Wear',
                    price: 12000,
                    sku: 'EE-004',
                    description: 'Sophisticated evening gown in luxurious silk with draped details and elegant neckline.',
                    sizes: [{size: '32', inventory: 2}, {size: '34', inventory: 2}, {size: '36', inventory: 3}],
                    colors: ['Black', 'Navy', 'Burgundy', 'Gold'],
                    images: ['https://picsum.photos/1200/1600?random=4'],
                    visible: true,
                    createdAt: new Date('2025-01-04').toISOString()
                },
                {
                    id: 5,
                    name: 'Champagne Dreams',
                    category: 'Bridal Couture',
                    price: 16500,
                    sku: 'CD-005',
                    description: 'Enchanting champagne-toned bridal gown with pearl accents and flowing cape detail.',
                    sizes: [{size: '34', inventory: 1}, {size: '36', inventory: 2}, {size: '38', inventory: 2}],
                    colors: ['Champagne', 'Ivory'],
                    images: ['https://picsum.photos/1200/1600?random=5'],
                    visible: true,
                    createdAt: new Date('2025-01-05').toISOString()
                }
            ];
            
            localStorage.setItem('ghoharyProducts', JSON.stringify(seedProducts));
            console.log('[Collections] Initialized seed data with 5 products');
        }
    }

    // ===== LOAD PRODUCTS FROM LOCALSTORAGE =====
    function loadProducts() {
        // Initialize seed data if localStorage is empty
        initializeSeedData();
        
        // Get admin products
        let adminProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        
        console.log('[Collections] Admin products from localStorage:', adminProducts);
        
        // Filter only visible products
        allProducts = adminProducts.filter(p => p.visible !== false);
        
        // Use ONLY admin products - no fallback stock images
        // If no admin products exist, collections will show empty message
        
        filteredProducts = [...allProducts];
        renderProducts();
    }

    // ===== RENDER PRODUCTS =====
    function renderProducts() {
        // Clear existing product cards
        const items = productsGrid.querySelectorAll('.product-card');
        items.forEach(item => item.remove());

        // Filter products with images only
        const productsWithImages = filteredProducts.filter(p => p.images && p.images.length > 0 && p.images[0]);

        // If no products, show message
        if (productsWithImages.length === 0) {
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
        const productsToShow = productsWithImages.slice(startIndex, endIndex);

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
            
            // Get first image
            const productImage = product.images[0];
            
            console.log('[Collections] Product:', product.name, 'Images:', product.images, 'Using:', productImage);
            
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
            
            productsGrid.appendChild(productCard);
            
            setTimeout(() => {
                productCard.classList.add('visible');
            }, index * 50);
        });

        // Update load more button visibility
        if (loadMoreBtn) {
            if (endIndex >= productsWithImages.length) {
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
