const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

function isIncompleteOrder(order) {
    const status = (order?.orderStatus || order?.status || '').toString().toLowerCase();
    return status === 'pending' || status === 'unpaid';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    const orders = await readOrders();
    const remaining = orders.filter(order => !isIncompleteOrder(order));
    const removed = orders.length - remaining.length;

    if (removed > 0) {
        await writeOrders(remaining);
    }

    res.status(200).json({
        removed,
        remaining: remaining.length
    });
}
