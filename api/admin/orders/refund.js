const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe secret key is not configured.' });
    }

    const body = parseBody(req);
    const orderNumber = safeText(body?.orderNumber);
    const paymentIntentIdFromBody = safeText(body?.paymentIntentId);

    if (!orderNumber && !paymentIntentIdFromBody) {
        return res.status(400).json({ error: 'Order number or payment intent ID is required.' });
    }

    try {
        const orders = await readOrders();
        const index = orders.findIndex((order) => (
            (orderNumber && safeText(order?.orderNumber) === orderNumber)
            || (paymentIntentIdFromBody && safeText(order?.paymentIntentId) === paymentIntentIdFromBody)
        ));

        if (index === -1) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = { ...orders[index] };
        const paymentIntentId = safeText(paymentIntentIdFromBody || order.paymentIntentId);
        if (!paymentIntentId) {
            return res.status(400).json({ error: 'No payment intent is attached to this order.' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['charges.data']
        });
        if (!paymentIntent) {
            return res.status(404).json({ error: 'Payment intent not found on Stripe.' });
        }

        const charge = paymentIntent.charges?.data?.[0];
        const chargeAmount = asNumber(charge?.amount);
        const alreadyRefunded = asNumber(charge?.amount_refunded);
        const refundable = Math.max(0, chargeAmount - alreadyRefunded);

        if (refundable <= 0) {
            return res.status(400).json({ error: 'This order has no refundable amount left.' });
        }

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            amount: refundable
        });

        const refundedAt = new Date().toISOString();
        order.orderStatus = 'refunded';
        order.status = 'refunded';
        order.refundedAt = refundedAt;
        order.refundedAmount = asNumber(refund.amount) / 100;
        order.refundId = safeText(refund.id);
        order.updatedAt = refundedAt;

        orders[index] = order;
        await writeOrders(orders);

        return res.status(200).json({
            success: true,
            refund: {
                id: safeText(refund.id),
                status: safeText(refund.status),
                amount: asNumber(refund.amount) / 100,
                currency: safeText(refund.currency).toUpperCase() || 'AED'
            }
        });
    } catch (error) {
        console.error('Order refund error:', error);
        return res.status(500).json({ error: error?.message || 'Failed to refund order.' });
    }
}
