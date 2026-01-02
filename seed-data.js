// Seed data - initializes with empty products on first visit
// Only your own products will show in collections
window.SEED_PRODUCTS = [];

// Initialize products on first visit only
window.initializeSeedData = function() {
    // Only set empty products if ghoharyProducts key doesn't exist yet
    if (!localStorage.getItem('ghoharyProducts')) {
        localStorage.setItem('ghoharyProducts', JSON.stringify(window.SEED_PRODUCTS));
        console.log('[Seed] First visit - initialized empty products array');
    } else {
        console.log('[Seed] Products already exist - skipping initialization');
    }
};

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSeedData);
} else {
    window.initializeSeedData();
}
