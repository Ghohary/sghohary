// Seed data - initializes products on first visit
window.SEED_PRODUCTS = [
    {
        id: 1,
        name: 'Ethereal Lace',
        price: 12500,
        description: 'Delicate lace bridal gown with ethereal tulle layers',
        category: 'bridal',
        images: ['https://picsum.photos/800/1200?random=1'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 2,
        name: 'Crystal Romance',
        price: 15000,
        description: 'Stunning crystal-embellished evening gown',
        category: 'evening',
        images: ['https://picsum.photos/800/1200?random=2'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 3,
        name: 'Royal Silk Train',
        price: 18000,
        description: 'Luxurious silk gown with dramatic train',
        category: 'bridal',
        images: ['https://picsum.photos/800/1200?random=3'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 4,
        name: 'Evening Elegance',
        price: 14000,
        description: 'Sophisticated evening wear with timeless style',
        category: 'evening',
        images: ['https://picsum.photos/800/1200?random=4'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 5,
        name: 'Champagne Dreams',
        price: 16500,
        description: 'Romantic champagne-colored bridal gown',
        category: 'bridal',
        images: ['https://picsum.photos/800/1200?random=5'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 6,
        name: 'Sapphire Nights',
        price: 13500,
        description: 'Deep sapphire blue evening gown with beading',
        category: 'evening',
        images: ['https://picsum.photos/800/1200?random=6'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 7,
        name: 'Pearl Perfection',
        price: 17000,
        description: 'Pearl-detailed bridal gown with classic elegance',
        category: 'bridal',
        images: ['https://picsum.photos/800/1200?random=7'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }
];

// Initialize products on first visit
window.initializeSeedData = function() {
    // Only initialize if no products exist
    const existingProducts = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
    if (existingProducts.length === 0) {
        localStorage.setItem('ghoharyProducts', JSON.stringify(window.SEED_PRODUCTS));
        console.log('[Seed] Initialized with 7 default products');
    }
};

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSeedData);
} else {
    window.initializeSeedData();
}
