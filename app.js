// GHOHARY Haute Couture - Universal Application Script
// Consolidated from all page-specific scripts with fixes
// Mobile-first, touch-optimized, all-device responsive

(function() {
    'use strict';

    // ===== UTILITY FUNCTIONS =====
    
    // Update cart count across all pages - exposed globally
    window.updateCartCount = function() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===== MOBILE MENU =====
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-links a');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Close menu when clicking a link
        navLinkItems.forEach(link => {
            link.addEventListener('click', function() {
                if (mobileMenuBtn && navLinks) {
                    mobileMenuBtn.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navContainer = document.querySelector('.nav-container');
                    const navHeight = navContainer ? navContainer.offsetHeight : 0;
                    const targetPosition = target.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ===== TESTIMONIALS SLIDER (Homepage) =====
    const testimonialsTrack = document.querySelector('.testimonials-track');
    const testimonialDots = document.querySelectorAll('.testimonial-dot');
    let currentTestimonial = 0;
    let testimonialStartX = 0;
    let testimonialCurrentX = 0;
    let isDraggingTestimonial = false;
    let autoPlayInterval;

    function updateTestimonial(index, animate = true) {
        if (!testimonialsTrack) return;
        
        const testimonials = document.querySelectorAll('.testimonial-card');
        if (testimonials.length === 0) return;
        
        const maxIndex = testimonials.length - 1;
        currentTestimonial = Math.max(0, Math.min(index, maxIndex));
        
        const offset = -currentTestimonial * 100;
        testimonialsTrack.style.transition = animate ? 'transform 0.5s ease' : 'none';
        testimonialsTrack.style.transform = `translateX(${offset}%)`;
        
        testimonialDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentTestimonial);
        });
    }

    if (testimonialsTrack) {
        testimonialsTrack.addEventListener('touchstart', function(e) {
            isDraggingTestimonial = true;
            testimonialStartX = e.touches[0].clientX;
            testimonialsTrack.style.transition = 'none';
            clearInterval(autoPlayInterval);
        }, { passive: true });

        testimonialsTrack.addEventListener('touchmove', function(e) {
            if (!isDraggingTestimonial) return;
            testimonialCurrentX = e.touches[0].clientX;
            const diff = testimonialCurrentX - testimonialStartX;
            const offset = -currentTestimonial * 100 + (diff / window.innerWidth) * 100;
            testimonialsTrack.style.transform = `translateX(${offset}%)`;
        }, { passive: true });

        testimonialsTrack.addEventListener('touchend', function() {
            if (!isDraggingTestimonial) return;
            isDraggingTestimonial = false;
            
            const diff = testimonialCurrentX - testimonialStartX;
            const threshold = window.innerWidth * 0.15;
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    updateTestimonial(currentTestimonial - 1);
                } else {
                    updateTestimonial(currentTestimonial + 1);
                }
            } else {
                updateTestimonial(currentTestimonial);
            }
            
            startAutoPlay();
        });

        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                clearInterval(autoPlayInterval);
                updateTestimonial(index);
                startAutoPlay();
            });
        });

        function startAutoPlay() {
            clearInterval(autoPlayInterval);
            const testimonials = document.querySelectorAll('.testimonial-card');
            if (testimonials.length > 0) {
                autoPlayInterval = setInterval(function() {
                    const nextIndex = (currentTestimonial + 1) % testimonials.length;
                    updateTestimonial(nextIndex);
                }, 5000);
            }
        }

        updateTestimonial(0, false);
        startAutoPlay();

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                clearInterval(autoPlayInterval);
            } else {
                startAutoPlay();
            }
        });
    }

    // ===== COLLECTIONS PAGE - FILTER & SORT =====
    const filterBtns = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;

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

    const sortSelect = document.getElementById('sortSelect');
    const productsGrid = document.querySelector('.products-grid');

    if (sortSelect && productsGrid) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            const products = Array.from(productCards);

            products.sort((a, b) => {
                if (sortValue === 'newest') {
                    return (b.dataset.date || 0) - (a.dataset.date || 0);
                } else if (sortValue === 'price-low') {
                    const priceA = parseFloat(a.querySelector('.product-price')?.textContent.replace(/[^0-9.-]+/g, '') || 0);
                    const priceB = parseFloat(b.querySelector('.product-price')?.textContent.replace(/[^0-9.-]+/g, '') || 0);
                    return priceA - priceB;
                } else if (sortValue === 'price-high') {
                    const priceA = parseFloat(a.querySelector('.product-price')?.textContent.replace(/[^0-9.-]+/g, '') || 0);
                    const priceB = parseFloat(b.querySelector('.product-price')?.textContent.replace(/[^0-9.-]+/g, '') || 0);
                    return priceB - priceA;
                }
                return 0;
            });

            products.forEach(product => {
                productsGrid.appendChild(product);
            });
        });
    }

    // ===== PRODUCT PAGE - IMAGE GALLERY =====
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (mainImage) {
                mainImage.src = this.src.replace('w=200&h=300', 'w=1200&h=1600');
            }
        });
    });

    // ===== PRODUCT PAGE - SIZE SELECTION =====
    const sizeBtns = document.querySelectorAll('.size-btn');
    let selectedSize = null;

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            sizeBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSize = this.dataset.size;
        });
    });

    // ===== CART PAGE - RENDER CART =====
    const cartContent = document.getElementById('cartContent');
    const emptyCart = document.getElementById('emptyCart');

    function renderCart() {
        if (!cartContent) return;
        
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');

        if (cart.length === 0) {
            cartContent.style.display = 'none';
            if (emptyCart) emptyCart.style.display = 'flex';
            return;
        }

        cartContent.style.display = 'grid';
        if (emptyCart) emptyCart.style.display = 'none';

        let subtotal = 0;
        let cartHTML = '<div class="cart-items">';

        cart.forEach((item, index) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            subtotal += itemTotal;

            cartHTML += `
                <div class="cart-item" data-index="${index}">
                    <div class="cart-item-image">
                        <img src="${item.image || ''}" alt="${item.name || 'Product'}">
                    </div>
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${item.name || 'Product'}</h3>
                        <p class="cart-item-meta">Size: ${item.size || 'N/A'}</p>
                        ${item.customization && item.customization !== 'standard' ? `<p class="cart-item-meta">Customization: ${item.customization}</p>` : ''}
                        
                        <div class="cart-item-actions-mobile">
                            <div class="quantity-selector">
                                <button class="qty-btn" data-index="${index}" data-change="-1">−</button>
                                <span class="qty-value">${item.quantity || 1}</span>
                                <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                            </div>
                            <button class="remove-btn" data-index="${index}">Remove</button>
                        </div>
                    </div>
                    <div class="cart-item-price">
                        <span class="item-price">AED ${itemTotal.toLocaleString()}</span>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-selector">
                            <button class="qty-btn" data-index="${index}" data-change="-1">−</button>
                            <span class="qty-value">${item.quantity || 1}</span>
                            <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                        </div>
                        <button class="remove-btn" data-index="${index}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });

        cartHTML += '</div>';

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        cartHTML += `
            <div class="cart-summary">
                <h3 class="summary-title">Order Summary</h3>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                
                <div class="summary-row">
                    <span>VAT (5%)</span>
                    <span>AED ${tax.toLocaleString()}</span>
                </div>
                
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="free-shipping">Free</span>
                </div>
                
                <div class="summary-divider"></div>
                
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>AED ${total.toLocaleString()}</span>
                </div>
                
                <button class="btn btn-primary btn-full" onclick="window.location.href='checkout.html'">
                    <span>Proceed to Checkout</span>
                </button>
                
                <a href="collections.html" class="continue-shopping">
                    Continue Shopping
                </a>
                
                <div class="payment-icons">
                    <p class="payment-text">We accept</p>
                    <div class="payment-methods">
                        <span class="payment-icon">💳</span>
                        <span class="payment-icon">🏦</span>
                        <span class="payment-icon">💰</span>
                    </div>
                </div>
            </div>
        `;

        cartContent.innerHTML = cartHTML;
        
        // Attach event listeners after rendering
        attachCartEventListeners();
    }

    function attachCartEventListeners() {
        // Quantity buttons
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const change = parseInt(this.dataset.change);
                updateQuantity(index, change);
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removeItem(index);
            });
        });
    }

    function updateQuantity(index, change) {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        if (cart[index]) {
            cart[index].quantity += change;
            
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));
            renderCart();
            updateCartCount();
        }
    }

    function removeItem(index) {
        if (confirm('Remove this item from your cart?')) {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            cart.splice(index, 1);
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));
            renderCart();
            updateCartCount();
        }
    }

    // ===== CHECKOUT PAGE =====
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const cardDetails = document.getElementById('cardDetails');

    function renderOrderSummary() {
        if (!orderSummary) return;
        
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        
        if (cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        let subtotal = 0;
        let summaryHTML = '<div class="summary-items">';

        cart.forEach(item => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            subtotal += itemTotal;

            summaryHTML += `
                <div class="summary-item">
                    <img src="${item.image || ''}" alt="${item.name || 'Product'}" class="summary-item-image">
                    <div class="summary-item-details">
                        <h4>${item.name || 'Product'}</h4>
                        <p>Size: ${item.size || 'N/A'} × ${item.quantity || 1}</p>
                    </div>
                    <div class="summary-item-price">
                        AED ${itemTotal.toLocaleString()}
                    </div>
                </div>
            `;
        });

        summaryHTML += '</div>';

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        summaryHTML += `
            <div class="summary-totals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span class="free-shipping">Free</span>
                </div>
                <div class="summary-row">
                    <span>VAT (5%)</span>
                    <span>AED ${tax.toLocaleString()}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>AED ${total.toLocaleString()}</span>
                </div>
            </div>
        `;

        orderSummary.innerHTML = summaryHTML;
    }

    // Payment method toggle
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (cardDetails) {
                cardDetails.style.display = this.value === 'card' ? 'block' : 'none';
            }
        });
    });

    // Checkout form submission
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const firstName = document.getElementById('firstName');
            const email = document.getElementById('email');

            if (!firstName || !firstName.value || !email || !email.value) {
                alert('Please fill in all required fields');
                return;
            }

            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<span>Processing...</span>';
                submitBtn.disabled = true;

                setTimeout(() => {
                    localStorage.removeItem('ghoharyCart');
                    
                    const orderNumber = 'GH' + Date.now().toString().slice(-8);
                    localStorage.setItem('lastOrder', JSON.stringify({
                        orderNumber,
                        customerName: firstName.value,
                        email: email.value,
                        date: new Date().toISOString()
                    }));

                    window.location.href = 'account.html?order=success';
                }, 2000);
            }
        });
    }

    // Card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }

    // Expiry date formatting
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }

    // ===== ACCOUNT PAGE - TAB NAVIGATION =====
    const accountNavItems = document.querySelectorAll('.account-nav-item:not(.special)');
    const accountTabs = document.querySelectorAll('.account-tab');

    accountNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const tabName = this.dataset.tab;
            
            accountNavItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            accountTabs.forEach(tab => tab.classList.remove('active'));
            const targetTab = document.getElementById(tabName + 'Tab');
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });

    // Check for order success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('order') === 'success') {
        const successBanner = document.getElementById('successBanner');
        if (successBanner) {
            successBanner.style.display = 'flex';
            setTimeout(() => {
                successBanner.style.display = 'none';
            }, 5000);
        }
    }

    // ===== APPOINTMENT PAGE =====
    const dateInput = document.getElementById('apptDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    const timeSlots = document.querySelectorAll('.time-slot');
    let selectedTime = null;

    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            timeSlots.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            selectedTime = this.dataset.time;
        });
    });

    const appointmentForm = document.getElementById('appointmentForm');
    
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!selectedTime) {
                alert('Please select a preferred time slot');
                return;
            }

            const apptFirstName = document.getElementById('apptFirstName');
            const apptEmail = document.getElementById('apptEmail');
            const consultationType = document.querySelector('input[name="consultationType"]:checked');
            
            if (!apptFirstName || !apptEmail || !consultationType) {
                alert('Please fill in all required fields');
                return;
            }

            const formData = {
                firstName: apptFirstName.value,
                lastName: document.getElementById('apptLastName')?.value || '',
                email: apptEmail.value,
                phone: document.getElementById('apptPhone')?.value || '',
                type: consultationType.value,
                date: dateInput?.value || '',
                time: selectedTime,
                eventDate: document.getElementById('eventDate')?.value || '',
                budget: document.getElementById('budget')?.value || '',
                message: document.getElementById('message')?.value || '',
                timestamp: new Date().toISOString()
            };

            const appointments = JSON.parse(localStorage.getItem('ghoharyAppointments') || '[]');
            appointments.push(formData);
            localStorage.setItem('ghoharyAppointments', JSON.stringify(appointments));

            const appointmentModal = document.getElementById('appointmentModal');
            if (appointmentModal) {
                appointmentModal.style.display = 'flex';
            }

            appointmentForm.reset();
            timeSlots.forEach(s => s.classList.remove('selected'));
            selectedTime = null;
        });
    }

    // ===== MODAL HANDLERS =====
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        const modals = ['successModal', 'appointmentModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(element => {
        observer.observe(element);
    });

    // ===== STICKY NAV ENHANCEMENT =====
    const navContainer = document.querySelector('.nav-container');
    
    if (navContainer) {
        const handleScroll = debounce(function() {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 50) {
                navContainer.style.boxShadow = '0 4px 24px rgba(212, 175, 55, 0.08), 0 2px 8px rgba(0,0,0,0.02)';
            } else {
                navContainer.style.boxShadow = '0 4px 24px rgba(212, 175, 55, 0.08), 0 2px 8px rgba(0,0,0,0.02)';
            }
        }, 10);

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // ===== TOUCH FEEDBACK FOR INTERACTIVE ELEMENTS =====
    const interactiveElements = document.querySelectorAll('.collection-card, .instagram-item, .product-card');
    
    interactiveElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        element.addEventListener('touchend', function() {
            this.style.transform = '';
        });

        element.addEventListener('touchcancel', function() {
            this.style.transform = '';
        });
    });

    // ===== RESIZE HANDLER =====
    const handleResize = debounce(function() {
        if (testimonialsTrack) {
            updateTestimonial(currentTestimonial, false);
        }
    }, 250);

    window.addEventListener('resize', handleResize, { passive: true });

    // ===== INITIALIZATION =====
    // Update cart count on page load
    updateCartCount();

    // Render cart if on cart page
    if (cartContent) {
        renderCart();
    }

    // Render order summary if on checkout page
    if (orderSummary) {
        renderOrderSummary();
    }

    // Set smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    console.log('GHOHARY - Universal app loaded successfully');
})();
