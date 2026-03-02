const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';

function safeText(value, fallback = '') {
    return String(value || '').trim();
}

function asDigits(value) {
    return String(value || '')
        .replace(/[^0-9]/g, '')
        .trim();
}

function normalizeIdentifier(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function normalizeCompact(value) {
    return String(value || '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .trim();
}

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, {
        collectionKeys: ['orders', 'payload.orders']
    });
    if (Array.isArray(payload)) return payload;
    return [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

const ALLOWED_FIELDS = new Set([
    'orderNumber',
    'orderStatus',
    'trackingNumber',
    'tracking',
    'tracking_number',
    'customerName',
    'email',
    'phone',
    'address',
    'city',
    'zip',
    'country',
    'subtotal',
    'totalShipping'
]);

function normalizeOrderNumber(value) {
    return String(value || '')
        .replace(/[^0-9]/g, '')
        .trim();
}

function normalizePaymentIdentifier(value) {
    return String(value || '').trim();
}

function normalizeIdentifierSet(values = []) {
    const normalized = values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase());
    const compact = normalized.map((value) => value.replace(/[^a-z0-9]/g, ''));
    const digits = normalized.map((value) => value.replace(/[^0-9]/g, ''));
    return {
        normalized,
        compact: compact.filter(Boolean),
        digits: digits.filter(Boolean),
    };
}

function safeTextLower(value) {
    return String(value || '').trim().toLowerCase();
}

function matchesRequestedOrder(order = {}, requested = {}) {
    const candidateValues = [
        order.orderNumber,
        order.order_number,
        order.paymentIntentId,
        order.payment_intent_id,
        order.paymentIntent,
        order.id,
        order.orderId,
        order.order_id,
        order.orderRef,
        order.order_reference,
        order.reference,
    ];
    const orderSet = normalizeIdentifierSet(candidateValues);

    const hintSet = normalizeIdentifierSet([
        requested.order,
        requested.orderNumber,
        requested.order_number,
        requested.orderRef,
        requested.order_reference,
        requested.reference,
        requested.payment_intent_id,
        requested.paymentIntentId,
        requested.paymentIntent,
        requested.orderId,
        requested.id,
    ]);

    const requestedRaw = safeTextLower(requested.hint || '');
    if (!requestedRaw) return false;

    const exactFound = orderSet.normalized.some((candidate) => candidate === requestedRaw);
    if (exactFound) return true;
    if (orderSet.normalized.some((candidate) => requested.hints && candidate === requested.hints)) return true;

    const requestedCompact = requestedRaw.replace(/[^a-z0-9]/g, '');
    const requestedDigits = requestedRaw.replace(/[^0-9]/g, '');
    if (requestedCompact && orderSet.compact.some((candidate) => candidate === requestedCompact)) return true;
    if (requestedDigits && orderSet.digits.some((candidate) => candidate === requestedDigits)) return true;

    return false;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    const {
        orderNumber,
        paymentIntentId,
        payment_intent_id: paymentIntentAlias,
        orderId,
        id,
        order,
        order_number,
        orderRef,
        order_reference,
        reference,
        updates,
    } = req.body || {};
    const requestedOrderHint = normalizePaymentIdentifier(order || orderRef || order_reference || reference || order_number);
    const providedOrderId = normalizePaymentIdentifier(orderId || id);
    if (!orderNumber && !order_number && !paymentIntentId && !paymentIntentAlias && !providedOrderId && !requestedOrderHint) {
        return res.status(400).json({ error: 'Order number, payment intent, order ID, or order reference required' });
    }
    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Updates payload required' });
    }

    const orders = await readOrders();
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
    const normalizedOrderNumberAlt = normalizeOrderNumber(order_number);
    const normalizedPaymentIntent = normalizePaymentIdentifier(paymentIntentId || paymentIntentAlias);
    const normalizedRequestedOrderHint = normalizePaymentIdentifier(requestedOrderHint);
    const normalizedOrderId = safeText(providedOrderId);
    const normalizedRequestedOrderDigits = asDigits(normalizedRequestedOrderHint);
    const normalizedRequestedOrderCompact = normalizeCompact(normalizedRequestedOrderHint);
    const requested = {
        order,
        orderNumber,
        order_number,
        payment_intent_id: paymentIntentAlias,
        paymentIntentId,
        orderId,
        id: providedOrderId,
        orderRef,
        order_reference: order_reference,
        reference,
        hint: safeText(normalizedRequestedOrderHint),
    };

    const matchingIndexes = orders
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => matchesRequestedOrder(candidate, requested))
        .map(({ index }) => index);

    if (matchingIndexes.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (matchingIndexes.length > 1) {
        return res.status(409).json({ error: 'Order reference is ambiguous. Provide orderNumber or paymentIntentId.' });
    }

    const index = matchingIndexes[0];

    const nextOrder = { ...orders[index] };
    if (Object.prototype.hasOwnProperty.call(updates, 'orderNumber')) {
        const nextNumber = String(updates.orderNumber || '').trim();
        if (!nextNumber) {
            return res.status(400).json({ error: 'Order number cannot be empty' });
        }
        const nextNormalized = normalizeOrderNumber(nextNumber);
        const duplicate = orders.find((order, orderIndex) => {
            if (orderIndex === index) return false;
            if (!nextNormalized) return false;
            return normalizeOrderNumber(order.orderNumber) === nextNormalized;
        });
        if (duplicate) {
            return res.status(400).json({ error: 'Order number already exists' });
        }
    }

    const normalizedUpdates = {
        ...updates,
        trackingNumber: safeText(
            updates.trackingNumber || updates.tracking || updates.tracking_number,
        ),
    };

    const resolveTrackingNumber = (value) => safeText(value);
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
        if (!ALLOWED_FIELDS.has(key)) return;
        if (value === undefined) return;
        if (key === 'orderNumber') {
            const nextNumber = String(value || '').trim();
            if (!nextNumber) return;
            nextOrder.orderNumber = nextNumber;
            return;
        }
        if (key === 'tracking' || key === 'tracking_number' || key === 'trackingNumber') {
            const nextTracking = resolveTrackingNumber(value);
            nextOrder.trackingNumber = nextTracking;
            nextOrder.tracking = nextTracking;
            nextOrder.tracking_number = nextTracking;
            return;
        }
        nextOrder[key] = value;
        if (key === 'orderStatus') {
            nextOrder.status = value;
        }
    });

    nextOrder.updatedAt = new Date().toISOString();
    orders[index] = nextOrder;
    await writeOrders(orders);

    res.status(200).json({ success: true, order: nextOrder });
}
