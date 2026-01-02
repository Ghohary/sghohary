// Seed data - initializes with empty products on first visit
// Users can add their own products through the admin panel
window.SEED_PRODUCTS = [];

// Initialize products on first visit
window.initializeSeedData = function() {
    // Always set to empty products on initialization (fresh start)
    const existingProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
    
    // Only override if we have old products to clear
    if (existingProducts.length > 0) {
        localStorage.setItem('ghoharyProducts', JSON.stringify(window.SEED_PRODUCTS));
        console.log('[Seed] Cleared old products - starting fresh');
    }
};

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSeedData);
} else {
    window.initializeSeedData();
}
