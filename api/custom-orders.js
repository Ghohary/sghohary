import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { requireAdmin } = require('./_utils/admin-auth');
const { readCollection, writeCollection, isRedisConfigured } = require('./_utils/json-store');
const CUSTOM_ORDERS_STORE_KEY = 'ghohary:custom-orders';

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

function normalizeNumber(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.round(Math.max(0, numeric) * 100) / 100;
}

function sanitizeStatus(value) {
    const status = String(value || '').toLowerCase();
    if (status === 'fully_paid' || status === 'partially_paid' || status === 'unpaid') {
        return status;
    }
    return 'unpaid';
}

function sanitizeOrder(order, index) {
    if (!order || typeof order !== 'object') return null;

    const id = String(order.id || `custom_${Date.now()}_${index}`).trim();
    if (!id) return null;

    const total = normalizeNumber(order?.payment?.total, 0);
    const advance = normalizeNumber(order?.payment?.advance, 0);
    const fallbackBalance = Math.max(total - advance, 0);
    const balance = normalizeNumber(order?.payment?.balance, fallbackBalance);
    const status = sanitizeStatus(order?.payment?.status);
    const productImage = typeof order?.product?.image === 'string'
        ? String(order.product.image)
        : '';

    return {
        id,
        isDraft: Boolean(order?.isDraft),
        client: {
            title: String(order?.client?.title || '').trim(),
            name: String(order?.client?.name || '').trim(),
            phoneCode: String(order?.client?.phoneCode || '').trim(),
            phone: String(order?.client?.phone || '').trim()
        },
        product: {
            name: String(order?.product?.name || '').trim(),
            colorNumber: String(order?.product?.colorNumber || '').trim(),
            imageKey: String(order?.product?.imageKey || '').trim(),
            imageName: String(order?.product?.imageName || '').trim(),
            ...(productImage ? { image: productImage } : {})
        },
        measurements: {
            height: String(order?.measurements?.height || '').trim(),
            shoulder: String(order?.measurements?.shoulder || '').trim(),
            chest: String(order?.measurements?.chest || '').trim(),
            waist: String(order?.measurements?.waist || '').trim(),
            hip: String(order?.measurements?.hip || '').trim(),
            sleeves: String(order?.measurements?.sleeves || '').trim()
        },
        order: {
            orderDate: String(order?.order?.orderDate || '').trim(),
            expectedDeliveryDate: String(order?.order?.expectedDeliveryDate || '').trim()
        },
        payment: {
            total,
            advance,
            balance,
            status
        },
        createdAt: String(order?.createdAt || order?.updatedAt || new Date().toISOString()),
        updatedAt: String(order?.updatedAt || new Date().toISOString())
    };
}

function sanitizeOrders(input) {
    if (!Array.isArray(input)) return [];
    const sanitized = input
        .map((order, index) => sanitizeOrder(order, index))
        .filter(Boolean);

    return sanitized.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
    });
}

async function readStoredOrders() {
    const payload = await readCollection(CUSTOM_ORDERS_STORE_KEY, {
        collectionKeys: ['orders'],
        fallback: []
    });
    return sanitizeOrders(payload);
}

async function writeStoredOrders(orders) {
    await writeCollection(CUSTOM_ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) {
        return;
    }

    if (req.method === 'GET') {
        const orders = await readStoredOrders();
        return res.status(200).json({ orders, source: 'redis' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isRedisConfigured()) {
        return res.status(500).json({ error: 'Custom order storage is not configured.' });
    }

    const body = parseBody(req);
    const candidateOrders = Array.isArray(body) ? body : body?.orders;
        const orders = sanitizeOrders(candidateOrders);

    try {
        await writeStoredOrders(orders);
        return res.status(200).json({ success: true, orders, source: 'redis' });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to save custom orders.' });
    }
}
