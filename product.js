// Product Page Functionality
(function() {
    'use strict';

    // Product database
    const products = {
        '1': {
            id: '1',
            name: 'Ethereal Lace',
            price: 25000,
            category: 'Bridal',
            images: [
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop'
            ],
            description: 'A breathtaking masterpiece featuring delicate French lace overlay with hand-sewn pearl embellishments. This timeless gown combines classic elegance with modern sophistication, perfect for the bride who dreams of fairy-tale romance.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '2': {
            id: '2',
            name: 'Crystal Romance',
            price: 28000,
            category: 'Bridal',
            images: [
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop'
            ],
            description: 'An enchanting bridal gown adorned with Swarovski crystals that catch and reflect light beautifully. Perfect for the modern bride seeking sparkle and glamour.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '3': {
            id: '3',
            name: 'Royal Silk Train',
            price: 32000,
            category: 'Bridal',
            images: [
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop'
            ],
            description: 'A luxurious bridal masterpiece featuring flowing silk with an majestic train. This stunning gown exudes elegance and timeless beauty.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '4': {
            id: '4',
            name: 'Champagne Elegance',
            price: 16000,
            category: 'Evening',
            images: [
                'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop'
            ],
            description: 'An elegant evening gown in champagne tones with sophisticated draping. Perfect for formal occasions and special events.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '5': {
            id: '5',
            name: 'Pearl Embellished',
            price: 28500,
            category: 'Bridal',
            images: [
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop'
            ],
            description: 'A stunning bridal gown with intricate pearl embellishments throughout. Each pearl is hand-sewn to create a shimmering, luxurious effect.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '6': {
            id: '6',
            name: 'Bespoke Creation',
            price: 35000,
            category: 'Custom',
            images: [
                'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop'
            ],
            description: 'Create your own custom haute couture gown. Our master designers will work with you to bring your vision to life with bespoke craftsmanship.',
            sizes: ['Custom']
        },
        '7': {
            id: '7',
            name: 'Golden Hour',
            price: 19500,
            category: 'Evening',
            images: [
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop'
            ],
            description: 'A breathtaking evening gown with golden accents. Perfect for sunset celebrations and evening affairs.',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        }
    };

    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productIdParam = urlParams.get('id');
    
    // ALWAYS prioritize admin products from localStorage
    let product = null;
    const adminProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
    const visibleAdminProducts = adminProducts.filter(p => p.visible !== false);
    
    console.log('Requested product ID:', productIdParam);
    console.log('Admin products available:', visibleAdminProducts.length);
    if (visibleAdminProducts.length > 0) {
        console.log('Admin product IDs:', visibleAdminProducts.map(p => p.id));
    }
    
    // If there are admin products, use them exclusively
    if (visibleAdminProducts.length > 0) {
        if (productIdParam) {
            // Try to find in admin products by ID (handle both string and numeric)
            product = visibleAdminProducts.find(p => {
                return p.id == productIdParam || p.id === parseInt(productIdParam) || p.id === productIdParam.toString();
            });
            
            // If not found by ID, try by numeric index
            if (!product) {
                const index = parseInt(productIdParam);
                if (!isNaN(index) && index > 0 && index <= visibleAdminProducts.length) {
                    product = visibleAdminProducts[index - 1];
                    console.log('Found product by numeric index:', product.name);
                }
            }
            
            if (product) {
                console.log('Found admin product:', product.name);
            }
        }
        
        // If still no product, use the first admin product
        if (!product) {
            product = visibleAdminProducts[0];
            console.log('No specific product found, using first admin product:', product.name);
        }
    } else {
        // Only use hardcoded products if NO admin products exist
        if (productIdParam) {
            product = products[productIdParam];
            if (product) {
                console.log('No admin products, using hardcoded product:', product.name);
            }
        }
        
        // Fallback to first hardcoded product
        if (!product) {
            product = products['1'];
            console.log('No products found, using default product:', product?.name);
        }
    }

    if (!product) {
        document.body.innerHTML = '<div style="text-align:center; padding: 50px;"><h2>Product not found</h2></div>';
        return;
    }

    // Update breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb span:last-child');
    if (breadcrumb) breadcrumb.textContent = product.name;

    // Update product title
    const titleEl = document.querySelector('.product-title');
    if (titleEl) titleEl.textContent = product.name;

    // Update product subtitle
    const subtitleEl = document.querySelector('.product-subtitle');
    if (subtitleEl) subtitleEl.textContent = product.category + ' Collection';

    // Update product description
    const descriptionEl = document.querySelector('.product-description p');
    if (descriptionEl) descriptionEl.textContent = product.description;

    // Update product price
    const priceEl = document.querySelector('.price-amount');
    if (priceEl) {
        if (typeof product.price === 'number') {
            priceEl.textContent = product.price.toLocaleString();
        } else {
            priceEl.textContent = product.price || 'Price Upon Request';
        }
    }

    // Update images
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (mainImage && product.images && product.images.length > 0) {
        mainImage.src = product.images[0];
        mainImage.alt = product.name;
    }

    if (thumbnails.length > 0 && product.images && product.images.length > 0) {
        thumbnails.forEach((thumb, index) => {
            if (product.images[index]) {
                const imageUrl = product.images[index];
                // Only modify unsplash URLs, leave admin images as-is
                if (imageUrl.includes('unsplash.com')) {
                    thumb.src = imageUrl.replace('w=1200&h=1600', 'w=200&h=300');
                } else {
                    thumb.src = imageUrl;
                }
                thumb.style.display = 'block';
                thumb.alt = product.name + ' - View ' + (index + 1);
            } else {
                thumb.style.display = 'none';
            }
        });
    }

    // ===== IMAGE GALLERY =====
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Get the full resolution image
            const thumbSrc = this.src;
            if (thumbSrc.includes('unsplash.com')) {
                // For unsplash URLs, replace the dimensions
                mainImage.src = thumbSrc.replace('w=200&h=300', 'w=1200&h=1600');
            } else {
                // For admin images, use as-is
                mainImage.src = thumbSrc;
            }
        });
    });

    // ===== SIZE SELECTION =====
    const sizeSelector = document.querySelector('.size-selector');
    const sizeBtns = document.querySelectorAll('.size-btn');
    const inventoryStatus = document.getElementById('inventoryStatus');
    const inventoryText = inventoryStatus?.querySelector('.inventory-text');
    let selectedSize = null;

    // If product has sizes array from admin, render them dynamically
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        if (sizeSelector) {
            sizeSelector.innerHTML = '';
            
            // Extract size values from admin product format [{size, inventory}, ...]
            const sizesArray = product.sizes.map(s => {
                if (typeof s === 'string') return s;
                if (s && typeof s === 'object' && s.size) return s.size;
                return s;
            });
            
            sizesArray.forEach(size => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'size-btn';
                btn.dataset.size = size;
                btn.textContent = size;
                
                // Store inventory data on button if available
                const sizeData = product.sizes.find(s => {
                    if (typeof s === 'string') return s === size;
                    if (s && typeof s === 'object') return s.size === size;
                    return false;
                });
                
                if (sizeData && typeof sizeData === 'object' && sizeData.inventory !== undefined) {
                    btn.dataset.inventory = sizeData.inventory;
                }
                
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedSize = this.dataset.size;
                    
                    // Display inventory information
                    if (inventoryStatus && inventoryText) {
                        const inventory = parseInt(this.dataset.inventory) || 0;
                        
                        if (inventory > 10) {
                            inventoryText.innerHTML = `<span class="in-stock">✓ In Stock</span> — ${inventory} available`;
                            inventoryStatus.classList.remove('low-stock', 'out-of-stock');
                            inventoryStatus.classList.add('in-stock');
                        } else if (inventory > 0 && inventory <= 10) {
                            inventoryText.innerHTML = `<span class="low-stock">⚠ Limited Stock</span> — Only ${inventory} available`;
                            inventoryStatus.classList.remove('in-stock', 'out-of-stock');
                            inventoryStatus.classList.add('low-stock');
                        } else {
                            inventoryText.innerHTML = `<span class="out-of-stock">✕ Out of Stock</span> — Contact us for custom options`;
                            inventoryStatus.classList.remove('in-stock', 'low-stock');
                            inventoryStatus.classList.add('out-of-stock');
                        }
                        
                        inventoryStatus.style.display = 'block';
                    }
                });
                sizeSelector.appendChild(btn);
            });
        }
    } else {
        // Use existing hardcoded size buttons
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                sizeBtns.forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedSize = this.dataset.size;
                
                // Hide inventory for hardcoded products
                if (inventoryStatus) {
                    inventoryStatus.style.display = 'none';
                }
            });
        });
    }

    // ===== ADD TO CART =====
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    let modalTimeoutId = null;
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            if (!selectedSize) {
                alert('Please select a size');
                return;
            }

            const customizationField = document.getElementById('customization');
            const cartProduct = {
                id: product.id,
                name: product.name,
                price: product.price,
                size: selectedSize,
                customization: customizationField ? customizationField.value : '',
                image: mainImage ? mainImage.src : '',
                quantity: 1
            };

            // Get cart from localStorage
            let cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            
            // Check if item already exists
            const existingIndex = cart.findIndex(item => 
                item.id === cartProduct.id && item.size === cartProduct.size
            );

            if (existingIndex > -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push(cartProduct);
            }

            // Save to localStorage
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));

            // Update cart count - use direct function call
            const updateBadge = () => {
                const cartCountElement = document.querySelector('.cart-count');
                if (cartCountElement) {
                    const cartData = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
                    const totalItems = cartData.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    cartCountElement.textContent = totalItems;
                    cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
                }
            };
            
            updateBadge();
            
            // Also call window.updateCartCount if available
            if (window.updateCartCount) {
                window.updateCartCount();
            }
            
            window.dispatchEvent(new Event('cartUpdated'));

            // Show success modal (if present) and auto-hide after 10s
            const modal = document.getElementById('successModal');
            if (modal) {
                modal.style.display = 'flex';
                if (modalTimeoutId) {
                    clearTimeout(modalTimeoutId);
                }
                modalTimeoutId = setTimeout(() => {
                    modal.style.display = 'none';
                }, 10000);
            }
        });
    }

    // ===== UPDATE CART COUNT =====
    // Use global updateCartCount if available, otherwise define locally
    if (!window.updateCartCount) {
        window.updateCartCount = function() {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                cartCount.textContent = totalItems;
                cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
            }
        };
    }

    // Wait for header to be loaded before calling updateCartCount
    function initializeCartCount() {
        if (window.updateCartCount) {
            window.updateCartCount();
        } else {
            // Retry after 100ms if header hasn't loaded yet
            setTimeout(initializeCartCount, 100);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCartCount);
    } else {
        initializeCartCount();
    }

    // ===== ZOOM FUNCTIONALITY =====
    const zoomBtn = document.querySelector('.zoom-btn');
    if (zoomBtn && mainImage) {
        zoomBtn.addEventListener('click', function() {
            mainImage.classList.toggle('zoomed');
            if (mainImage.classList.contains('zoomed')) {
                mainImage.style.cursor = 'zoom-out';
            } else {
                mainImage.style.cursor = 'zoom-in';
            }
        });
    }

    // ===== CLOSE MODAL ON OUTSIDE CLICK =====
    const modal = document.getElementById('successModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    console.log('🛍️ Product page loaded:', product.name);
})();
