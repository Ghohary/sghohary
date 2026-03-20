(function() {
    'use strict';
    const SEARCH_OVERLAY_OPEN_CLASS = 'is-open';

    function loadHeader() {
        fetch('header.html')
            .then(response => response.text())
            .then(html => {
                let headerContainer = document.querySelector('header');
                if (!headerContainer) {
                    headerContainer = document.createElement('header');
                    document.body.insertBefore(headerContainer, document.body.firstChild);
                }
                headerContainer.innerHTML = html;

                initializeMobileNav();
                updateCartCountBadge();
                window.addEventListener('cartUpdated', updateCartCountBadge);
                document.dispatchEvent(new Event('header:loaded'));
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Mobile nav overlay (new)
    function initializeMobileNav() {
        const menuBtn = document.getElementById('mobileMenuBtn');
        const overlay = document.getElementById('mobileNavOverlay');
        const closeBtn = document.getElementById('mobileNavClose');

        function open() {
            if (overlay) {
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
        function close() {
            if (overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        if (menuBtn) menuBtn.addEventListener('click', open);
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (overlay) overlay.addEventListener('click', function(e) {
            if (e.target === overlay) close();
        });
        document.querySelectorAll('.mobile-nav-links a').forEach(function(link) {
            link.addEventListener('click', close);
        });
    }



    // Cart count badge
    function updateCartCountBadge() {
        if (window.updateCartCount) {
            window.updateCartCount();
        } else {
            var badge = document.querySelector('.cart-count');
            if (badge) {
                var cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
                var total = cart.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
                if (total > 0) {
                    badge.textContent = total;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    }

    // Load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }

    // ── Search overlay ──

    function openSiteSearch() {
        var overlay = document.getElementById('siteSearchOverlay');
        if (!overlay) return;
        overlay.classList.add(SEARCH_OVERLAY_OPEN_CLASS);
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeSiteSearch() {
        var overlay = document.getElementById('siteSearchOverlay');
        if (!overlay) return;
        overlay.classList.remove(SEARCH_OVERLAY_OPEN_CLASS);
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function emitSiteSearch(detail) {
        var trimmed = typeof detail?.query === 'string' ? detail.query.trim() : '';
        var eventDetail = {
            query: trimmed || '',
            minPrice: detail?.minPrice || '',
            maxPrice: detail?.maxPrice || ''
        };
        if (window.__ghoharyApplySearch && typeof window.__ghoharyApplySearch === 'function') {
            window.__ghoharyApplySearch(eventDetail);
        }
        window.dispatchEvent(new CustomEvent('ghohary:search', { detail: eventDetail }));
    }

    function handleSearchSubmit(event) {
        event.preventDefault();
        var query = document.getElementById('siteSearchInput')?.value || '';
        emitSiteSearch({ query: query });
        if (!window.location.pathname.includes('collections.html')) {
            window.location.href = 'collections.html?q=' + encodeURIComponent((query || '').trim());
            return;
        }
        closeSiteSearch();
    }

    function hydrateSearchFromUrl() {
        var overlay = document.getElementById('siteSearchOverlay');
        if (!overlay) return;
        var params = new URLSearchParams(window.location.search);
        var query = params.get('q') || '';
        var input = document.getElementById('siteSearchInput');
        if (input) input.value = query;
        if (query) {
            emitSiteSearch({ query: query });
            if (window.location.pathname.includes('collections.html')) {
                var closeBtn = document.querySelector('[data-site-search-close]');
                if (closeBtn) closeBtn.click();
            }
        }
    }

    function initializeSiteSearch() {
        var openBtn = document.getElementById('openSearchBtn');
        var overlay = document.getElementById('siteSearchOverlay');
        var closeButtons = document.querySelectorAll('[data-site-search-close]');
        var form = document.getElementById('siteSearchForm');
        var clearBtn = document.getElementById('siteSearchClear');

        if (!openBtn || !overlay || !form) return;

        openBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openSiteSearch();
        });
        closeButtons.forEach(function(btn) {
            btn.addEventListener('click', closeSiteSearch);
        });
        form.addEventListener('submit', handleSearchSubmit);
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                var input = document.getElementById('siteSearchInput');
                if (input) input.value = '';
                emitSiteSearch({ query: '' });
                closeSiteSearch();
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') {
                closeSiteSearch();
            }
        });
        hydrateSearchFromUrl();
    }

    document.addEventListener('header:loaded', initializeSiteSearch);
})();
