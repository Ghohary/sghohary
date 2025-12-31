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
            description: 'Exquisite bridal gown with delicate lace detailing',
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
            description: 'Stunning gown adorned with Swarovski crystals',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '3': {
            id: '3',
            name: 'Silk Dreams',
            price: 22000,
            category: 'Bridal',
            images: [
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop'
            ],
            description: 'Flowing silk gown with timeless elegance',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        },
        '4': {
            id: '4',
            name: 'Golden Elegance',
            price: 26000,
            category: 'Evening',
            images: [
                'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=1600&fit=crop',
                'https://images.unsplash.com/photo-1594552072238-2d8e16ed7b2c?w=1200&h=1600&fit=crop'
            ],
            description: 'Evening gown with luxurious gold details',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom']
        }
    };

    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || '1';
    const product = products[productId];

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

    // Update product price
    const priceEl = document.querySelector('.product-price');
    if (priceEl) priceEl.textContent = `AED ${product.price.toLocaleString()}`;

    // Update images
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (mainImage && product.images.length > 0) {
        mainImage.src = product.images[0];
    }

    thumbnails.forEach((thumb, index) => {
        if (product.images[index]) {
            thumb.src = product.images[index].replace('w=1200&h=1600', 'w=200&h=300');
            thumb.style.display = 'block';
        } else {
            thumb.style.display = 'none';
        }
    });

    // ===== IMAGE GALLERY =====
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            mainImage.src = this.src.replace('w=200&h=300', 'w=1200&h=1600');
        });
    });

    // ===== SIZE SELECTION =====
    const sizeBtns = document.querySelectorAll('.size-btn');
    let selectedSize = null;

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            sizeBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSize = this.dataset.size;
        });
    });

    // ===== ADD TO CART =====
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            if (!selectedSize) {
                alert('Please select a size');
                return;
            }

            const cartProduct = {
                id: product.id,
                name: product.name,
                price: product.price,
                size: selectedSize,
                customization: document.getElementById('customization').value,
                image: mainImage.src,
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

            // Update cart count
            updateCartCount();

            // Show success modal
            const modal = document.getElementById('successModal');
            if (modal) modal.style.display = 'flex';

            // Add animation
            this.innerHTML = '<span>✓ Added to Cart</span>';
            setTimeout(() => {
                this.innerHTML = '<span>Reserve This Gown</span>';
            }, 2000);
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
