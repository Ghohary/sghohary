// Product Page Functionality
(function() {
    'use strict';

    // ===== IMAGE GALLERY =====
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            // Remove active from all
            thumbnails.forEach(t => t.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            // Update main image
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

            const product = {
                id: new URLSearchParams(window.location.search).get('id') || '1',
                name: document.querySelector('.product-title').textContent,
                price: 25000,
                size: selectedSize,
                customization: document.getElementById('customization').value,
                image: mainImage.src,
                quantity: 1
            };

            // Get cart from localStorage
            let cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            
            // Check if item already exists
            const existingIndex = cart.findIndex(item => 
                item.id === product.id && item.size === product.size
            );

            if (existingIndex > -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push(product);
            }

            // Save to localStorage
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));

            // Update cart count
            updateCartCount();

            // Show success modal
            document.getElementById('successModal').style.display = 'flex';

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
    if (zoomBtn) {
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

    console.log('Product page loaded');
})();
