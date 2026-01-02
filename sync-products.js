// Product Sync Utility
// This script helps sync products from localStorage to the central database

window.GHOHARY_SYNC = {
    // Export products from localStorage to central database
    exportProducts: function() {
        const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        const dbContent = {
            products: products,
            lastUpdated: new Date().toISOString()
        };
        
        // Create and download JSON file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(dbContent, null, 2)));
        element.setAttribute('download', 'products-db.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        console.log('Exported', products.length, 'products to products-db.json');
        alert('Exported ' + products.length + ' products! Replace the products-db.json file on server with this file.');
    },

    // View current products in localStorage
    viewProducts: function() {
        const products = JSON.parse(localStorage.getItem('ghoharyProducts') || '[]');
        console.table(products);
        return products;
    },

    // Clear all products (use with caution!)
    clearProducts: function() {
        if (confirm('Are you sure? This will delete all products from this device!')) {
            localStorage.setItem('ghoharyProducts', JSON.stringify([]));
            console.log('All products cleared');
        }
    },

    // Sync instruction
    syncInstructions: function() {
        const instructions = `
PRODUCT SYNC INSTRUCTIONS:

1. On your primary device (iMac):
   - Go to admin page
   - Add/edit your products
   - Run in console: GHOHARY_SYNC.exportProducts()
   - Download the JSON file

2. Upload to server:
   - Replace products-db.json file on server with downloaded file
   - All devices will now see the same products

3. On other devices (iPhone):
   - Visit collections page
   - Products will auto-load from central database
   - Hard refresh if needed (Cmd+Shift+R or Ctrl+Shift+R)

Usage:
- GHOHARY_SYNC.exportProducts() - Download current products
- GHOHARY_SYNC.viewProducts() - View all products
- GHOHARY_SYNC.clearProducts() - Delete all products
- GHOHARY_SYNC.syncInstructions() - Show this help
        `;
        console.log(instructions);
        alert('Sync instructions copied to console. Type GHOHARY_SYNC.syncInstructions() to see again.');
    }
};

console.log('GHOHARY Sync loaded! Commands:');
console.log('- GHOHARY_SYNC.exportProducts()');
console.log('- GHOHARY_SYNC.viewProducts()');
console.log('- GHOHARY_SYNC.clearProducts()');
console.log('- GHOHARY_SYNC.syncInstructions()');
