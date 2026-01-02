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
        let adminProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        
        // Filter only visible products
        allProducts = adminProducts.filter(p => p.visible !== false);
        
        // If no admin products, use fallback hardcoded products
        if (allProducts.length === 0) {
            allProducts = [
                {
                    id: 1,
                    name: 'Ethereal Lace',
                    price: 25000,
                    category: 'Bridal Couture',
                    images: ['https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 2,
                    name: 'Crystal Romance',
                    price: 28000,
                    category: 'Bridal Couture',
                    images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 3,
                    name: 'Royal Silk Train',
                    price: 32000,
                    category: 'Bridal Couture',
                    images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 4,
                    name: 'Champagne Elegance',
                    price: 16000,
                    category: 'Evening Wear',
                    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 5,
                    name: 'Pearl Embellished',
                    price: 28500,
                    category: 'Bridal Couture',
                    images: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 6,
                    name: 'Bespoke Creation',
                    price: 35000,
                    category: 'Custom Design',
                    images: ['https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 7,
                    name: 'Golden Hour',
                    price: 19500,
                    category: 'Evening Wear',
                    images: ['https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 8,
                    name: 'Cathedral Dreams',
                    price: 30000,
                    category: 'Bridal Couture',
                    images: ['https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: 9,
                    name: 'Couture Atelier',
                    price: 40000,
                    category: 'Custom Design',
                    images: ['https://images.unsplash.com/photo-1624626699269-7a8a2d0f7d0e?w=800&h=1200&fit=crop'],
                    visible: true,
                    createdAt: Date.now() - 86400000
                }
            ];
        }
        
        filteredProducts = [...allProducts];
        renderProducts();
    }

    // ===== RENDER PRODUCTS =====
    function renderProducts() {
        // Clear existing product cards
        const items = productsGrid.querySelectorAll('.product-card');
        items.forEach(item => item.remove());

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
