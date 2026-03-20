// Collections Page Functionality
(function() {
    'use strict';

    const stripCollectionWords = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/\b(Evening|Abaya|Bridal|Couture|Luxury|Custom|Design|evening|abaya|bridal|couture|luxury|custom|design)\b/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s*-\s*|\s*-\s*$/g, '')
            .trim();
    };

    const productsGrid = document.querySelector('.products-grid');
    const sortSelect = document.getElementById('sortSelect');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let sentinel = document.getElementById('products-infinite-sentinel');

    let allProducts = [];
    let filteredProducts = [];
    const itemsPerPage = 16;
    let visibleCount = 0;
    let isLoading = false;
    let hasMoreProducts = true;
    let activeCategory = 'all';
    let renderedIds = new Set();

    const searchState = {
        query: '',
        category: 'all',
        minPrice: '',
        maxPrice: ''
    };

    function ensureSentinel() {
        if (!productsGrid) {
            return null;
        }

        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.id = 'products-infinite-sentinel';
            sentinel.setAttribute('aria-hidden', 'true');
            productsGrid.insertAdjacentElement('afterend', sentinel);
        }

        return sentinel;
    }

    function normalizePrice(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed || trimmed.toLowerCase() === 'price upon request') {
                return null;
            }
            const num = Number(trimmed.replace(/[^0-9.]/g, ''));
            return Number.isFinite(num) ? num : null;
        }
        if (typeof value === 'bigint') {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }
        return null;
    }

    function dedupeProductsById(products) {
        if (!Array.isArray(products)) {
            return [];
        }

        const map = new Map();

        products.forEach((product) => {
            if (!product || !product.id) {
                return;
            }

            const key = String(product.id);
            const current = map.get(key);
            if (!current) {
                map.set(key, product);
                return;
            }

            const nextDate = Date.parse(product.createdAt || '') || 0;
            const currentDate = Date.parse(current.createdAt || '') || 0;

            if (nextDate > currentDate) {
                map.set(key, product);
            }
        });

        // Also de-duplicate by SKU — if two products share the same SKU,
        // keep the one with the shorter (non-numeric) ID (file DB product)
        // since it carries the latest admin-edited overrides
        const skuMap = new Map();
        const result = [];
        for (const product of map.values()) {
            const sku = String(product.sku || '').trim().toLowerCase();
            if (!sku) { result.push(product); continue; }
            const existing = skuMap.get(sku);
            if (!existing) {
                skuMap.set(sku, product);
                continue;
            }
            // Prefer the product whose ID matches the SKU pattern (file DB)
            // over long numeric IDs (Stripe/Shopify legacy)
            const existingIsNumeric = /^\d+$/.test(String(existing.id));
            const currentIsNumeric = /^\d+$/.test(String(product.id));
            if (existingIsNumeric && !currentIsNumeric) {
                skuMap.set(sku, product);
            } else if (!existingIsNumeric && currentIsNumeric) {
                // keep existing
            } else {
                const nextDate = Date.parse(product.createdAt || '') || 0;
                const existDate = Date.parse(existing.createdAt || '') || 0;
                if (nextDate > existDate) skuMap.set(sku, product);
            }
        }
        result.push(...skuMap.values());
        return result;
    }

    function normalizeFilterNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const parsed = typeof value === 'number' ? value : Number(String(value).trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getCategory(product) {
        let category = 'all';
        if (product.category) {
            const cat = String(product.category).toLowerCase();
            if (cat.includes('bridal')) category = 'bridal';
            else if (cat.includes('evening')) category = 'evening';
            else if (cat.includes('custom') || cat.includes('bespoke')) category = 'custom';
        } else if (product.collection) {
            const collectionText = String(product.collection).toLowerCase();
            if (collectionText.includes('bridal')) category = 'bridal';
            else if (collectionText.includes('evening')) category = 'evening';
            else if (collectionText.includes('custom') || collectionText.includes('bespoke')) category = 'custom';
        }
        return category;
    }

    function matchesCategory(product, filterValue) {
        const productCategory = getCategory(product);
        return filterValue === 'all' || productCategory === filterValue;
    }

    function getSearchHaystack(product) {
        const name = stripCollectionWords(product.name || '').toLowerCase();
        const category = (product.category || product.collection || '').toLowerCase();
        const desc = (product.description || product.desc || product.details || '').toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        return `${name} ${category} ${desc} ${sku}`;
    }

    function matchesSearch(product) {
        const query = searchState.query.trim().toLowerCase();
        const inSearch = query ? getSearchHaystack(product).includes(query) : true;

        const categoryToMatch = searchState.category && searchState.category !== 'all'
            ? searchState.category
            : activeCategory;
        const inCategory = matchesCategory(product, categoryToMatch);

        const priceValue = normalizePrice(product.price);
        const minPrice = normalizeFilterNumber(searchState.minPrice);
        const maxPrice = normalizeFilterNumber(searchState.maxPrice);

        const inMin = minPrice === null || priceValue === null ? true : priceValue >= minPrice;
        const inMax = maxPrice === null || priceValue === null ? true : priceValue <= maxPrice;

        return inSearch && inCategory && inMin && inMax;
    }

    function applySort(products) {
        const sortValue = sortSelect ? sortSelect.value : 'featured';

        if (sortValue === 'newest') {
            return products.sort((a, b) => {
                return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
            });
        }
        if (sortValue === 'price-low') {
            return products.sort((a, b) => {
                const priceA = normalizePrice(a.price);
                const priceB = normalizePrice(b.price);
                const safeA = priceA === null ? Number.MAX_VALUE : priceA;
                const safeB = priceB === null ? Number.MAX_VALUE : priceB;
                return safeA - safeB;
            });
        }
        if (sortValue === 'price-high') {
            return products.sort((a, b) => {
                const priceA = normalizePrice(a.price);
                const priceB = normalizePrice(b.price);
                const safeA = priceA === null ? -1 : priceA;
                const safeB = priceB === null ? -1 : priceB;
                return safeB - safeA;
            });
        }

        return products;
    }

    function rebuildProducts() {
        filteredProducts = allProducts.filter(matchesSearch);
        filteredProducts = applySort([...filteredProducts]);
        renderProducts(true);
    }

    function clearProductCards() {
        if (!productsGrid) {
            return;
        }
        const items = productsGrid.querySelectorAll('.product-card, [data-empty-message]');
        items.forEach(item => item.remove());
    }

    function formatPrice(price) {
        const numericPrice = normalizePrice(price);
        if (numericPrice === null) {
            return 'Price Upon Request';
        }
        return `${numericPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
    }

    function renderProductCard(product) {
        const filterCategory = getCategory(product);
        const productCard = document.createElement('div');
        productCard.className = 'product-card fade-in';
        productCard.dataset.category = filterCategory;
        productCard.dataset.date = product.createdAt || Date.now();

        const productImage = (product.images && product.images.length > 0)
            ? product.images[0]
            : '/placeholder.jpg';

        const safeName = stripCollectionWords(product.name) || 'Collection';
        const safeCategory = stripCollectionWords(product.category) || 'Collection';

        productCard.innerHTML = `
            <a href="product.html?id=${product.id}" class="product-link">
                <div class="product-image-wrapper">
                    <img src="${productImage}" alt="${product.name}" class="product-image" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-meta">
                        <h3 class="product-name">${safeName || product.name}</h3>
                        <p class="product-category">${safeCategory}</p>
                    </div>
                    <p class="product-price">${formatPrice(product.price)}</p>
                </div>
            </a>
        `;

        productsGrid.appendChild(productCard);
        productCard.classList.add('visible');
    }

    function renderProducts(reset = false) {
        const activeSentinel = ensureSentinel();
        if (!productsGrid) {
            return;
        }

        if (reset) {
            clearProductCards();
            visibleCount = 0;
            hasMoreProducts = true;
            renderedIds.clear();
        }

        if (filteredProducts.length === 0) {
            clearProductCards();
            if (activeSentinel) {
                activeSentinel.style.display = 'none';
            }

            const emptyMsg = document.createElement('div');
            emptyMsg.style.gridColumn = '1 / -1';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '50px 20px';
            emptyMsg.dataset.emptyMessage = '1';
            emptyMsg.innerHTML = '<p style="font-size: 18px; color: var(--text-muted);">No products found in this category.</p>';
            productsGrid.appendChild(emptyMsg);
            return;
        }

        const startIndex = visibleCount;
        const endIndex = Math.min(visibleCount + itemsPerPage, filteredProducts.length);
        const productsToShow = filteredProducts.slice(startIndex, endIndex);

        productsToShow.forEach((product) => {
            const key = String(product?.id || '').trim();
            if (!key || renderedIds.has(key)) {
                return;
            }
            renderProductCard(product);
            renderedIds.add(key);
        });

        visibleCount = endIndex;
        hasMoreProducts = visibleCount < filteredProducts.length;
        if (activeSentinel) {
            activeSentinel.style.display = hasMoreProducts ? 'block' : 'none';
        }
    }

    function applySearchState(partialState) {
        if (typeof partialState !== 'object' || partialState === null) {
            return;
        }

        if (typeof partialState.query === 'string') {
            searchState.query = partialState.query.trim();
        }
        if (partialState.category) {
            searchState.category = partialState.category;
        }
        if (partialState.minPrice !== undefined) {
            const normalizedMin = normalizeFilterNumber(partialState.minPrice);
            searchState.minPrice = normalizedMin === null ? '' : normalizedMin;
        }
        if (partialState.maxPrice !== undefined) {
            const normalizedMax = normalizeFilterNumber(partialState.maxPrice);
            searchState.maxPrice = normalizedMax === null ? '' : normalizedMax;
        }

        if (searchState.category && searchState.category !== 'all') {
            activeCategory = searchState.category;
        } else {
            activeCategory = 'all';
        }

        setFilterUIState();
        rebuildProducts();
    }

    function loadMoreProducts() {
        if (isLoading || !hasMoreProducts || !sentinel) {
            return;
        }

        isLoading = true;
        setTimeout(() => {
            renderProducts(false);
            isLoading = false;
        }, 180);
    }

    function hydrateSearchFromURL() {
        const params = new URLSearchParams(window.location.search);
        const query = (params.get('q') || '').trim();

        const payload = {
            query,
            category: 'all',
            minPrice: '',
            maxPrice: ''
        };
        applySearchState(payload);
    }

    function setFilterUIState() {
        filterButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === activeCategory);
        });
    }

    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeCategory = this.dataset.filter || 'all';
                rebuildProducts();
                setFilterUIState();
            });
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            rebuildProducts();
        });
    }

    window.addEventListener('ghohary:search', function(event) {
        applySearchState(event && event.detail ? event.detail : {});
    });

    window.__ghoharyApplySearch = applySearchState;

    window.addEventListener('scroll', function() {
        const activeSentinel = ensureSentinel();
        if (!activeSentinel || !hasMoreProducts) {
            return;
        }

        const scrollBottom = window.innerHeight + window.scrollY;
        const triggerPoint = document.documentElement.scrollHeight - 240;

        if (scrollBottom >= triggerPoint) {
            loadMoreProducts();
        }
    });

    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            const adminProducts = await response.json();
            const uniqueProducts = dedupeProductsById(adminProducts);
            console.log('[Collections] Products from API:', adminProducts);

            allProducts = uniqueProducts.filter(p => p.visible !== false);
            hydrateSearchFromURL();
            setFilterUIState();
            rebuildProducts();
        } catch (err) {
            console.warn('[Collections] API not available:', err);
            allProducts = [];
            filteredProducts = [];
            hydrateSearchFromURL();
            setFilterUIState();
            renderProducts(true);
        }
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
    hydrateSearchFromURL();
    setFilterUIState();
    loadProducts();
    updateCartCount();

    console.log('Collections page loaded');
})();
