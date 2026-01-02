// Seed data - initializes with empty products on first visit
// Users can add their own products through the admin panel
window.SEED_PRODUCTS = [];

// Initialize products on first visit
window.initializeSeedData = function() {
    // Only initialize if no products exist
    const existingProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
    if (existingProducts.length === 0) {
        localStorage.setItem('ghoharyProducts', JSON.stringify(window.SEED_PRODUCTS));
        console.log('[Seed] Initialized with custom products');
    }
};

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSeedData);
} else {
    window.initializeSeedData();
}
