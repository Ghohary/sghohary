// GHOHARY Wishlist Page
(() => {
    const wishlistKey = 'ghoharyWishlist';
    const wishlistContent = document.getElementById('wishlistContent');
    const emptyState = document.getElementById('emptyWishlist');

    const readWishlist = () => {
        try {
            return JSON.parse(localStorage.getItem(wishlistKey) || '[]');
        } catch (e) {
            return [];
        }
    };

    const saveWishlist = (items) => {
        localStorage.setItem(wishlistKey, JSON.stringify(items));
        window.dispatchEvent(new Event('wishlistUpdated'));
    };

    const removeItem = (id) => {
        const items = readWishlist().filter(item => item.id !== id);
        saveWishlist(items);
        render();
    };

    const render = () => {
        const items = readWishlist();
        if (!wishlistContent || !emptyState) {
            return;
        }

        if (!items.length) {
            wishlistContent.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        wishlistContent.innerHTML = items.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${item.image ? `<img src="${item.image}" alt="${item.name || 'Wishlist item'}">` : '<div class="cart-item-placeholder"></div>'}
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-name">${item.name || 'Wishlist item'}</h3>
                    ${item.category ? `<p class="cart-item-category">${item.category}</p>` : ''}
                    ${item.price ? `<p class="cart-item-price">AED ${item.price}</p>` : ''}
                    <div class="cart-item-actions">
                        <button class="remove-btn" data-id="${item.id}">Remove</button>
                        ${item.id ? `<button class="btn-link" onclick="window.location.href='product.html?id=${item.id}'">View</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        wishlistContent.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => removeItem(btn.dataset.id));
        });
    };

    render();
})();
