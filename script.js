// GHOHARY Haute Couture - Mobile-First Interactive Experience
// Optimized for touch interactions and smooth mobile performance

(function() {
    'use strict';

    // ===== MOBILE MENU =====
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-links a');

    if (mobileMenuBtn) {
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
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
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
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const navHeight = document.querySelector('.nav-container').offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ===== TESTIMONIALS SLIDER - MOBILE OPTIMIZED =====
    const testimonialsTrack = document.querySelector('.testimonials-track');
    const testimonialDots = document.querySelectorAll('.testimonial-dot');
    let currentTestimonial = 0;
    let testimonialStartX = 0;
    let testimonialCurrentX = 0;
    let isDragging = false;
    let autoPlayInterval;

    function updateTestimonial(index, animate = true) {
        if (!testimonialsTrack) return;
        
        const testimonials = document.querySelectorAll('.testimonial-card');
        const maxIndex = testimonials.length - 1;
        
        // Clamp index
        currentTestimonial = Math.max(0, Math.min(index, maxIndex));
        
        // Update transform
        const offset = -currentTestimonial * 100;
        testimonialsTrack.style.transition = animate ? 'transform 0.5s ease' : 'none';
        testimonialsTrack.style.transform = `translateX(${offset}%)`;
        
        // Update dots
        testimonialDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentTestimonial);
        });
    }

    // Touch events for testimonial slider
    if (testimonialsTrack) {
        testimonialsTrack.addEventListener('touchstart', function(e) {
            isDragging = true;
            testimonialStartX = e.touches[0].clientX;
            testimonialsTrack.style.transition = 'none';
            clearInterval(autoPlayInterval);
        }, { passive: true });

        testimonialsTrack.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            testimonialCurrentX = e.touches[0].clientX;
            const diff = testimonialCurrentX - testimonialStartX;
            const offset = -currentTestimonial * 100 + (diff / window.innerWidth) * 100;
            testimonialsTrack.style.transform = `translateX(${offset}%)`;
        }, { passive: true });

        testimonialsTrack.addEventListener('touchend', function() {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = testimonialCurrentX - testimonialStartX;
            const threshold = window.innerWidth * 0.15; // 15% swipe threshold
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    // Swipe right - previous
                    updateTestimonial(currentTestimonial - 1);
                } else {
                    // Swipe left - next
                    updateTestimonial(currentTestimonial + 1);
                }
            } else {
                // Snap back
                updateTestimonial(currentTestimonial);
            }
            
            startAutoPlay();
        });

        // Dot navigation
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                clearInterval(autoPlayInterval);
                updateTestimonial(index);
                startAutoPlay();
            });
        });

        // Auto-play
        function startAutoPlay() {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(function() {
                const testimonials = document.querySelectorAll('.testimonial-card');
                const nextIndex = (currentTestimonial + 1) % testimonials.length;
                updateTestimonial(nextIndex);
            }, 5000);
        }

        // Initialize
        updateTestimonial(0, false);
        startAutoPlay();

        // Pause auto-play when page is not visible
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                clearInterval(autoPlayInterval);
            } else {
                startAutoPlay();
            }
        });
    }

    // ===== INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS =====
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(element => {
        observer.observe(element);
    });

    // ===== LAZY LOADING IMAGES =====
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.src = img.src; // Trigger loading
        });
    } else {
        // Fallback for older browsers
        const imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.src;
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // ===== STICKY NAV ENHANCEMENT =====
    let lastScroll = 0;
    const navContainer = document.querySelector('.nav-container');

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll
        if (currentScroll > 50) {
            navContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        } else {
            navContainer.style.boxShadow = '0 2px 20px rgba(0,0,0,0.03)';
        }
        
        lastScroll = currentScroll;
    }, { passive: true });

    // ===== PERFORMANCE OPTIMIZATIONS =====
    // Debounce resize events
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // Recalculate any position-dependent elements
            if (testimonialsTrack) {
                updateTestimonial(currentTestimonial, false);
            }
        }, 250);
    }, { passive: true });

    // ===== INSTAGRAM GRID INTERACTION =====
    const instagramItems = document.querySelectorAll('.instagram-item');
    instagramItems.forEach(item => {
        // Add ripple effect on touch for better feedback
        item.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        item.addEventListener('touchend', function() {
            this.style.transform = '';
        });

        item.addEventListener('touchcancel', function() {
            this.style.transform = '';
        });
    });

    // ===== COLLECTION CARDS INTERACTION =====
    const collectionCards = document.querySelectorAll('.collection-card');
    collectionCards.forEach(card => {
        card.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        card.addEventListener('touchend', function() {
            this.style.transform = '';
        });

        card.addEventListener('touchcancel', function() {
            this.style.transform = '';
        });
    });

    // ===== ACCESSIBILITY ENHANCEMENTS =====
    // Trap focus in mobile menu when open
    const focusableElements = 'a[href], button:not([disabled])';
    
    document.addEventListener('keydown', function(e) {
        if (!navLinks.classList.contains('active')) return;
        
        const focusable = navLinks.querySelectorAll(focusableElements);
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });

    // ===== PRELOAD CRITICAL IMAGES =====
    // Preload first collection image for better performance
    window.addEventListener('load', function() {
        const firstCollectionImage = document.querySelector('.collection-card img');
        if (firstCollectionImage && firstCollectionImage.dataset.src) {
            firstCollectionImage.src = firstCollectionImage.dataset.src;
        }
    });

    // ===== TOUCH MOMENTUM FOR SMOOTH SCROLLING =====
    // Most modern browsers handle this well, but we ensure smooth behavior
    document.documentElement.style.scrollBehavior = 'smooth';

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

    // Initial cart count update
    updateCartCount();

    // ===== LOG READY STATE (Remove in production) =====
    console.log('GHOHARY Haute Couture - Website loaded and optimized for mobile');
})();
