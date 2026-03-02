const { trackShipment } = require('./_utils/tracking');
const { readCollection, writeCollection } = require('./_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const orders = await readOrders();
        const pending = orders.filter(order => order.trackingNumber && !order.deliveryNotified);

        const updatedOrders = [...orders];
        const notifications = [];
        const errors = [];

        for (const order of pending) {
            try {
                const tracked = await trackShipment({
                    trackingNumber: order.trackingNumber,
                    carrier: order.trackingCarrier || order.carrier || ''
                });
                const tracking = tracked?.summary || {};
                if (!tracking.delivered) continue;

                order.deliveryNotified = true;
                order.deliveryNotifiedAt = new Date().toISOString();
                order.orderStatus = 'delivered';
                order.status = 'delivered';
                order.deliveryStatus = tracking.status;
                order.deliveryScans = tracking.scans;
                order.deliveryCarrier = tracked?.carrier || order.deliveryCarrier || '';
                notifications.push(order.orderNumber || order.trackingNumber);
            } catch (error) {
                const message = error?.message || 'Unknown error';
                console.error('Delivery notify error:', order.orderNumber, message);
                errors.push({
                    orderNumber: order.orderNumber || null,
                    trackingNumber: order.trackingNumber || null,
                    error: message
                });
            }
        }

        if (notifications.length) {
            await writeOrders(updatedOrders);
        }

        return res.status(200).json({
            success: true,
            notified: notifications,
            errors
        });
    } catch (error) {
        console.error('Delivery notify error:', error);
        return res.status(500).json({ error: error.message || 'Delivery notify failed' });
    }
}
