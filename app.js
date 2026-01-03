// GHOHARY Haute Couture - Universal Application Script
// Consolidated from all page-specific scripts with fixes
// Mobile-first, touch-optimized, all-device responsive

(function() {
    'use strict';

    // ===== PAGE TRANSITION SETUP =====
    // Add page transition overlay to body
    if (!document.querySelector('.page-transition')) {
        const transitionOverlay = document.createElement('div');
        transitionOverlay.className = 'page-transition';
        document.body.appendChild(transitionOverlay);
    }

    // Handle page transitions on link clicks
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && !link.target && !link.href.includes('#')) {
            const isExternal = link.hostname !== window.location.hostname;
            const isDownload = link.download;
            
            if (!isExternal && !isDownload) {
                // Internal navigation - seamless elegant transition
                e.preventDefault();
                
                const transition = document.querySelector('.page-transition');
                
                // Fade out
                transition.style.opacity = '1';
                transition.style.pointerEvents = 'auto';
                document.body.style.animation = 'pageExit 0.4s ease-in forwards';
                
                // Navigate after fade out
                setTimeout(() => {
                    window.location.href = link.href;
                }, 400);
            }
        }
    }, true);

    // ===== UTILITY FUNCTIONS =====
    
    // Clean up storage - remove bloated old cart data to prevent quota issues
    window.cleanupStorage = function() {
        try {
            const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
            
            // Filter out items with bloated fields and keep only essential data
            const cleaned = cart
                .map(item => ({
                    id: item.id,
                    size: item.size,
                    customization: item.customization || '',
                    quantity: item.quantity || 1
                }))
                .filter(item => item.id) // Remove any invalid items
                .slice(-50); // Keep only last 50 items
            
            if (cleaned.length !== cart.length) {
                localStorage.setItem('ghoharyCart', JSON.stringify(cleaned));
                console.log('[Cleanup] Optimized cart storage');
            }
        } catch (e) {
            console.error('[Cleanup] Error cleaning storage:', e);
        }
    }

    // Call cleanup on page load to ensure we don't have bloated data
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.cleanupStorage);
    } else {
        window.cleanupStorage();
    }

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
        let totalQuantity = 0;
        let cartHTML = '<div class="cart-items">';

        cart.forEach((item, index) => {
            const quantity = Number(item.quantity || 1);
            const itemTotal = (item.price || 0) * quantity;
            subtotal += itemTotal;
            totalQuantity += quantity;

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
                                <span class="qty-value">${quantity}</span>
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
                            <span class="qty-value">${quantity}</span>
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

        const shippingPerItem = 120;
        const totalShipping = totalQuantity * shippingPerItem;
        const total = subtotal + totalShipping;

        cartHTML += `
            <div class="cart-summary">
                <h3 class="summary-title">Order Summary</h3>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                
                <div class="summary-row">
                    <span>Shipping (120 AED × ${totalQuantity} items)</span>
                    <span>AED ${totalShipping.toLocaleString()}</span>
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
            const currentQty = Number(cart[index].quantity || 1);
            cart[index].quantity = currentQty + change;
            
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            
            localStorage.setItem('ghoharyCart', JSON.stringify(cart));
            renderCart();
            updateCartCount();
        }
    }

    function removeItem(index) {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('ghoharyCart', JSON.stringify(cart));
        renderCart();
        updateCartCount();
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
        let totalQuantity = 0;
        let summaryHTML = '<div class="summary-items">';

        cart.forEach(item => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            subtotal += itemTotal;
            totalQuantity += (item.quantity || 1);

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

        const shippingPerItem = 120;
        const totalShipping = totalQuantity * shippingPerItem;
        const total = subtotal + totalShipping;

        summaryHTML += `
            <div class="summary-totals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>AED ${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping (120 AED × ${totalQuantity} items)</span>
                    <span>AED ${totalShipping.toLocaleString()}</span>
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

    if (!window.CHECKOUT_PAGE_HANDLED) {
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
                        
                        const currentCount = parseInt(localStorage.getItem('ghoharyOrderCounter') || '0', 10) + 1;
                        localStorage.setItem('ghoharyOrderCounter', currentCount.toString());
                        const orderNumber = `GH313-${currentCount}`;
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
    }

    // Finalize Stripe Checkout on return
    const checkoutParams = new URLSearchParams(window.location.search);
    const checkoutSuccess = checkoutParams.get('checkout') === 'success' || checkoutParams.get('order') === 'success';
    const checkoutSessionId = checkoutParams.get('session_id');
    if (checkoutSuccess) {
        const pendingOrderRaw = localStorage.getItem('ghoharyPendingOrder');
        if (pendingOrderRaw) {
            const pendingOrder = JSON.parse(pendingOrderRaw);
            let currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
            if ((!currentUser || !currentUser.email) && pendingOrder.customer?.email) {
                const guestUser = {
                    email: pendingOrder.customer.email,
                    firstName: pendingOrder.customer.firstName || '',
                    lastName: pendingOrder.customer.lastName || '',
                    phone: pendingOrder.customer.phone || '',
                    address: pendingOrder.customer.address || '',
                    city: pendingOrder.customer.city || '',
                    emirate: pendingOrder.customer.emirate || ''
                };
                localStorage.setItem('ghoharyCurrentUser', JSON.stringify(guestUser));
                currentUser = guestUser;
            }
            const ownerEmail = currentUser?.email || pendingOrder.customer.email || '';
            const currentCount = parseInt(localStorage.getItem('ghoharyOrderCounter') || '0', 10) + 1;
            localStorage.setItem('ghoharyOrderCounter', currentCount.toString());
            const orderNumber = `GH313-${currentCount}`;
            const isUaeAddress = pendingOrder.customer?.country === 'uae';
            const normalizedSubtotal = Number(pendingOrder.subtotal || 0);
            const normalizedShipping = isUaeAddress ? 0 : Number(pendingOrder.totalShipping || 0);
            const normalizedTotal = normalizedSubtotal ? (normalizedSubtotal + normalizedShipping) : Number(pendingOrder.orderTotal || 0);
            const orderData = {
                orderNumber,
                paymentId: checkoutSessionId || 'stripe_checkout',
                sessionId: checkoutSessionId || '',
                customerName: `${pendingOrder.customer.firstName} ${pendingOrder.customer.lastName || ''}`.trim(),
                ownerEmail: ownerEmail,
                email: pendingOrder.customer.email || ownerEmail,
                address: pendingOrder.customer.address,
                city: pendingOrder.customer.city,
                emirate: pendingOrder.customer.emirate,
                phone: pendingOrder.customer.phone,
                paymentMethod: 'stripe_checkout',
                orderTotal: normalizedTotal,
                subtotal: normalizedSubtotal || Number(pendingOrder.orderTotal || 0),
                totalShipping: normalizedShipping,
                items: pendingOrder.items || [],
                date: new Date().toISOString()
            };

            let orders = JSON.parse(localStorage.getItem('ghoharyOrders') || '[]');
            const existing = checkoutSessionId
                ? orders.find(order => order.sessionId === checkoutSessionId)
                : null;

            if (!existing) {
                orders.push(orderData);
                localStorage.setItem('ghoharyOrders', JSON.stringify(orders));
                localStorage.setItem('lastOrder', JSON.stringify(orderData));
                localStorage.removeItem('ghoharyCart');
            }

            localStorage.removeItem('ghoharyPendingOrder');
        }
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

    // Render cart if on cart page and not handled by cart.js
    if (cartContent && !window.CART_PAGE_HANDLED) {
        renderCart();
    }

    // Render order summary if on checkout page and not handled by checkout.js
    if (orderSummary && !window.CHECKOUT_PAGE_HANDLED) {
        renderOrderSummary();
    }

    // Set smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    console.log('GHOHARY - Universal app loaded successfully');
})();
