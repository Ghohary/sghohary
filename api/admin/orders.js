const { requireAdmin } = require('../_utils/admin-auth');
const { readCollection } = require('../_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';
const BLOBSOURCE_URL_PATTERN = /(?:^|[./-])(vercel-storage\.com|public\.blob\.vercel-storage\.com|blob\.vercel-storage)(?:[/?#]|$)/i;
const {
    GOLD_FRINGES_SKU,
    isGoldenFringesAlias
} = require('../_utils/order-matching');

function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function isOrderLike(value) {
    if (!value || typeof value !== 'object') return false;
    return 'orderNumber' in value || 'paymentIntentId' in value || 'createdAt' in value || 'totalAmount' in value;
}

function normalizeOrderList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((entry) => isOrderLike(entry));
}

function collectOrders(value) {
    if (!isPlainObject(value) && !Array.isArray(value)) return [];

    const asArray = normalizeOrderList(value);
    if (asArray.length > 0) return asArray;

    if (!isPlainObject(value)) return [];

    const childValues = Object.values(value);
    const nested = childValues.flatMap(collectOrders);
    if (nested.length > 0) return nested;

    const direct = childValues.filter(isOrderLike);
    if (direct.length > 0) return direct;

    return [];
}

function extractOrdersFromPayload(payload) {
    const rootCandidates = [payload, isPlainObject(payload) ? payload.orders : undefined, payload?.orders];
    for (const candidate of rootCandidates) {
        const normalized = collectOrders(candidate);
        if (normalized.length > 0) return normalized;
    }

    if (payload?.data) {
        const normalized = collectOrders(payload.data);
        if (normalized.length > 0) return normalized;
    }
    if (payload?.items) {
        const normalized = collectOrders(payload.items);
        if (normalized.length > 0) return normalized;
    }
    if (payload?.result) {
        const normalized = collectOrders(payload.result);
        if (normalized.length > 0) return normalized;
    }

    if (!isPlainObject(payload)) return [];

    const nestedValues = Object.values(payload).flatMap(collectOrders);

    if (nestedValues.length > 0) return nestedValues;

    return [];
}

async function readOrders() {
    const data = await readCollection(ORDERS_STORE_KEY, {
        collectionKeys: ['orders', 'payload.orders', 'data.orders']
    });
    return extractOrdersFromPayload(data);
}

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeTrackingNumber(order = {}) {
    return normalizeText(order?.trackingNumber || order?.tracking || order?.tracking_number);
}

function sanitizeOrderImageValue(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (BLOBSOURCE_URL_PATTERN.test(url)) return '';
    return url;
}

function normalizeOrderItem(item = {}) {
    const name = normalizeText(item.name || item.productName || item.title);
    const rawName = normalizeText(item.name || name || 'GHOHARY Item');
    const cleanName = rawName.replace(/\s*\([^)]+\)\s*$/i, '').trim() || rawName;

    if (isGoldenFringesAlias(cleanName) || isGoldenFringesAlias(rawName)) {
        return {
            ...item,
            name: 'Gold Fringes',
            sku: normalizeText(item.sku) || GOLD_FRINGES_SKU
        };
    }

    return {
        ...item,
        image: sanitizeOrderImageValue(item.image),
        imageUrl: sanitizeOrderImageValue(item.imageUrl),
        thumbnail: sanitizeOrderImageValue(item.thumbnail),
        name: rawName || cleanName
    };
}

function normalizeOrder(order = {}) {
    const items = Array.isArray(order.items) ? order.items : [];
    const normalizedTracking = normalizeTrackingNumber(order);
    return {
        ...order,
        items: items.map((item) => normalizeOrderItem(item)),
        trackingNumber: normalizedTracking
    };
}

function isIncompleteOrder(order) {
    const status = (order?.orderStatus || order?.status || '').toString().toLowerCase();
    return status === 'pending' || status === 'unpaid';
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    const orders = await readOrders();
    const limit = Number(req.query?.limit || 50);
    const includeIncomplete = String(req.query?.includeIncomplete || '').toLowerCase();
    const showAll = includeIncomplete === '1' || includeIncomplete === 'true' || includeIncomplete === 'yes';
    const scopedOrders = showAll ? orders : orders.filter(order => !isIncompleteOrder(order));
    const sortedOrders = [...scopedOrders].sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.date || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.date || 0).getTime();
        return bDate - aDate;
    });
    const resolvedLimit = Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : sortedOrders.length;
    const limited = sortedOrders.slice(0, resolvedLimit).map((order) => normalizeOrder(order));
    res.status(200).json({
        orders: limited,
        pagination: { total: scopedOrders.length, limit: limited.length }
    });
}
