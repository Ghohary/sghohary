const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';

function parseBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (error) {
            return {};
        }
    }
    return req.body;
}

function safeText(value, fallback = '') {
    return String(value ?? fallback).trim();
}

function resolveTrackingNumber(order) {
    return safeText(order?.trackingNumber || order?.tracking || order?.tracking_number);
}

function extractOrders(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    if (Array.isArray(data?.payload?.orders)) return data.payload.orders;
    return [];
}

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders', 'payload.orders'] });
    return extractOrders(payload);
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

async function notifyShippingWebhook(order) {
    const webhookUrl = safeText(process.env.SHIPPING_CONFIRMATION_WEBHOOK_URL);
    if (!webhookUrl) return { via: 'recorded' };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'shipping_confirmation',
            orderNumber: safeText(order?.orderNumber),
            paymentIntentId: safeText(order?.paymentIntentId),
            trackingNumber: resolveTrackingNumber(order),
            customerName: safeText(order?.customerName),
            email: safeText(order?.email)
        })
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || 'Shipping webhook returned a non-success status.');
    }

    return { via: 'webhook' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    const body = parseBody(req);
    const orderNumber = safeText(body?.orderNumber);
    const paymentIntentId = safeText(body?.paymentIntentId);
    const orderId = safeText(body?.orderId || body?.id || body?.order_id);
    if (!orderNumber && !paymentIntentId && !orderId) {
        return res.status(400).json({ error: 'Order number, payment intent ID, or order ID is required.' });
    }

    try {
        const orders = await readOrders();
        const index = orders.findIndex((order) => (
            (orderNumber && safeText(order?.orderNumber) === orderNumber)
            || (paymentIntentId && safeText(order?.paymentIntentId) === paymentIntentId)
            || (orderId && safeText(order?.id || order?.orderId || order?.order_id) === orderId)
        ));

        if (index === -1) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = { ...orders[index] };
        if (!safeText(order.email)) {
            return res.status(400).json({ error: 'Customer email is missing on this order.' });
        }
        if (!resolveTrackingNumber(order)) {
            return res.status(400).json({ error: 'Add a tracking number before sending shipping confirmation.' });
        }

        const webhookResult = await notifyShippingWebhook(order);

        const sentAt = new Date().toISOString();
        order.shippingConfirmationSent = true;
        order.shippingConfirmationSentAt = sentAt;
        order.updatedAt = sentAt;

        orders[index] = order;
        await writeOrders(orders);

        return res.status(200).json({
            success: true,
            via: webhookResult.via,
            sentAt
        });
    } catch (error) {
        console.error('Send shipping confirmation error:', error);
        return res.status(500).json({ error: error?.message || 'Failed to send shipping confirmation.' });
    }
}
