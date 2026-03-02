const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('redis');
const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');
const {
    normalizeSkuValue,
    resolveAliasSku,
    stripSizeFromName,
    findFallbackMatchByTokens
} = require('../../_utils/order-matching');

const redisUrl = process.env.ghohary_REDIS_URL;
let redisClient = null;
let redisConnecting = null;

const ORDERS_STORE_KEY = 'ghohary:orders';

async function getRedisClient() {
    if (!redisUrl) {
        return null;
    }
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }
    if (!redisConnecting) {
        redisClient = createClient({ url: redisUrl });
        redisConnecting = redisClient.connect().catch((error) => {
            redisConnecting = null;
            throw error;
        });
    }
    await redisConnecting;
    return redisClient;
}

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

async function readProducts() {
    try {
        const client = await getRedisClient();
        if (!client) return [];
        const raw = await client.get('ghohary:products');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function getNextOrderNumber(orders) {
    const base = 313000;
    let max = base;
    orders.forEach(order => {
        const match = String(order.orderNumber || '').match(/GH(\d+)/i);
        if (!match) return;
        const value = parseInt(match[1], 10);
        if (Number.isFinite(value) && value > max) {
            max = value;
        }
    });
    const next = max + 1;
    return `GH${String(next).padStart(6, '0')}`;
}

function parseOrderNumber(text) {
    if (!text) return '';
    const match = text.match(/(GH\d{6,})/i);
    return match ? match[1].toUpperCase() : '';
}

function normalizeLookupName(value) {
    return String(value || '').trim().toLowerCase();
}

function extractSizeFromText(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(/\b(?:size|sz)\s*[:\-]?\s*([^)]+?)\)?$/i);
    return match ? String(match[1]).replace(/[)\]]+$/g, '').trim() : '';
}


function buildProductLookup(products) {
    const byId = new Map();
    const byName = new Map();
    const bySku = new Map();

    (Array.isArray(products) ? products : []).forEach((product) => {
        const id = String(product?.id || '').trim();
        const sku = normalizeSkuValue(product?.sku || '');
        const name = String(product?.name || '').trim();
        const price = Number(product?.price);
        const record = { id, sku, name, price };
        if (id) {
            byId.set(id, record);
        }
        if (sku) {
            bySku.set(sku, record);
        }
        const key = normalizeLookupName(name);
        if (key) {
            if (!byName.has(key)) byName.set(key, []);
            byName.get(key).push(record);
        }
    });

    return { byId, byName, bySku };
}

function parseRecoveredItems(raw, productLookup) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(String(raw));
        if (!Array.isArray(parsed)) return [];
        return parsed.map((entry) => {
            const quantityRaw = Number(entry?.q || entry?.quantity || 1);
            const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.round(quantityRaw) : 1;
            const rawName = String(entry?.n || entry?.name || '').trim() || 'GHOHARY Item';
            const name = stripSizeFromName(rawName);
            const directSku = String(entry?.sku || entry?.s || '').trim();
            const directProductId = String(entry?.pid || entry?.productId || '').trim();
            const itemPrice = Number(entry?.p || entry?.price || 0);
            const normalizedSku = normalizeSkuValue(directSku);
            const aliasSku = resolveAliasSku(rawName) || resolveAliasSku(name);
            let match = directProductId ? productLookup?.byId?.get(directProductId) : null;
            if (!match && normalizedSku) {
                match = productLookup?.bySku?.get(normalizedSku);
            }
            if (!match && aliasSku) {
                match = productLookup?.bySku?.get(normalizeSkuValue(aliasSku));
            }
            if (!match) {
                const nameKey = normalizeLookupName(name);
                const nameMatches = nameKey ? (productLookup?.byName?.get(nameKey) || []) : [];
                if (nameMatches.length === 1) {
                    match = nameMatches[0];
                } else if (nameMatches.length > 1 && Number.isFinite(itemPrice) && itemPrice > 0) {
                    match = nameMatches.find((candidate) => Number.isFinite(candidate?.price) && Math.abs(candidate.price - itemPrice) < 0.01) || null;
                } else {
                    match = findFallbackMatchByTokens(name, itemPrice, productLookup);
                }
            }
            return {
                name: String(match?.name || name).trim(),
                sku: directSku || String(match?.sku || '').trim(),
                productId: directProductId || String(match?.id || '').trim(),
                size: String(entry?.z || entry?.size || extractSizeFromText(rawName) || '').trim(),
                quantity,
                unitPrice: Number.isFinite(itemPrice) && itemPrice >= 0 ? itemPrice : 0
            };
        });
    } catch (error) {
        return [];
    }
}

function toSafeMoney(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
}

function toPositiveInteger(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(1, Math.round(parsed));
}

function hasOrderCoreData(order) {
    const total = Number(order?.totalAmount || 0);
    const subtotal = Number(order?.subtotal || 0);
    const shipping = Number(order?.totalShipping || 0);
    const items = Array.isArray(order?.items) ? order.items : [];
    const hasPricedItems = items.some((item) => Number(item?.unitPrice || item?.amount || 0) > 0);
    const hasAddress = Boolean(
        String(order?.address || '').trim()
        || String(order?.city || '').trim()
        || String(order?.country || '').trim()
    );

    return total > 0 && (subtotal > 0 || shipping > 0) && hasPricedItems && hasAddress;
}

async function fetchCheckoutFallback(paymentIntentId) {
    try {
        const sessionList = await stripe.checkout.sessions.list({
            payment_intent: paymentIntentId,
            limit: 1
        });
        const session = Array.isArray(sessionList?.data) ? sessionList.data[0] : null;
        if (!session?.id) return null;

        const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
            expand: ['data.price.product']
        });

        const rawItems = Array.isArray(lineItemsResponse?.data) ? lineItemsResponse.data : [];
        const isShippingItem = (name, kind) => {
            const normalizedKind = String(kind || '').trim().toLowerCase();
            if (normalizedKind === 'shipping') return true;
            return /^shipping\b/i.test(String(name || '').trim());
        };

        const items = [];
        let shippingFromLines = 0;
        rawItems.forEach((lineItem) => {
            const quantity = toPositiveInteger(lineItem?.quantity, 1);
            const name = String(
                lineItem?.description
                || lineItem?.price?.nickname
                || lineItem?.price?.product?.name
                || ''
            ).trim() || 'GHOHARY Item';
            const productMetadata = lineItem?.price?.product?.metadata || {};
            const lineTotal = toSafeMoney(Number(lineItem?.amount_total || 0) / 100, 0);
            const unitPrice = quantity > 0
                ? toSafeMoney(lineTotal / quantity, 0)
                : toSafeMoney(Number(lineItem?.amount_subtotal || 0) / 100, 0);

            if (isShippingItem(name, productMetadata?.kind)) {
                shippingFromLines += lineTotal;
                return;
            }

            items.push({
                name,
                sku: String(productMetadata?.sku || '').trim(),
                productId: String(productMetadata?.productId || '').trim(),
                size: String(productMetadata?.size || '').trim(),
                quantity,
                unitPrice
            });
        });

        const sessionShipping = toSafeMoney(Number(session?.total_details?.amount_shipping || 0) / 100, 0);
        const subtotal = items.reduce((sum, item) => sum + (toSafeMoney(item.unitPrice) * toPositiveInteger(item.quantity, 1)), 0);
        const total = toSafeMoney(Number(session?.amount_total || 0) / 100, 0);
        const shipping = sessionShipping > 0 ? sessionShipping : shippingFromLines;
        const customerDetails = session?.customer_details || {};
        const customerAddress = customerDetails?.address || session?.shipping_details?.address || {};

        return {
            items,
            subtotal,
            shipping,
            total,
            customer: {
                name: String(customerDetails?.name || session?.shipping_details?.name || '').trim(),
                email: String(customerDetails?.email || '').trim(),
                phone: String(customerDetails?.phone || '').trim(),
                address: String(customerAddress?.line1 || '').trim(),
                city: String(customerAddress?.city || '').trim(),
                zip: String(customerAddress?.postal_code || '').trim(),
                country: String(customerAddress?.country || '').trim()
            }
        };
    } catch (error) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const { paymentIntentId, chargeId } = req.body || {};
    let resolvedPaymentIntentId = paymentIntentId;

    try {
        if (!resolvedPaymentIntentId && chargeId) {
            const charge = await stripe.charges.retrieve(chargeId);
            if (!charge?.payment_intent) {
                return res.status(400).json({ error: 'Charge is missing payment intent' });
            }
            resolvedPaymentIntentId = typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent.id;
        }

        if (!resolvedPaymentIntentId) {
            return res.status(400).json({ error: 'Payment Intent ID or Charge ID required' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(resolvedPaymentIntentId, {
            expand: ['charges.data']
        });

        if (!paymentIntent) {
            return res.status(404).json({ error: 'Payment intent not found' });
        }

        const orders = await readOrders();
        const charge = paymentIntent.charges?.data?.[0];
        const billing = charge?.billing_details || {};
        const shipping = paymentIntent.shipping || charge?.shipping || {};
        const address = shipping.address || billing.address || {};
        const metadata = paymentIntent.metadata || {};
        const productLookup = buildProductLookup(await readProducts());
        const checkoutFallback = await fetchCheckoutFallback(paymentIntent.id);
        const metadataItems = parseRecoveredItems(metadata.orderItems, productLookup);
        const checkoutItems = Array.isArray(checkoutFallback?.items) ? checkoutFallback.items : [];
        const resolvedItems = checkoutItems.length ? checkoutItems : metadataItems;
        const computedSubtotalFromItems = resolvedItems.reduce(
            (sum, item) => sum + (toSafeMoney(item?.unitPrice) * toPositiveInteger(item?.quantity, 1)),
            0
        );
        const resolvedSubtotal = toSafeMoney(
            Number(metadata.orderSubtotal || metadata.summarySubtotal || checkoutFallback?.subtotal || computedSubtotalFromItems || 0),
            computedSubtotalFromItems
        );
        const resolvedShipping = toSafeMoney(
            Number(metadata.orderShipping || metadata.summaryShipping || checkoutFallback?.shipping || 0),
            0
        );
        const resolvedTotal = toSafeMoney(
            Number(checkoutFallback?.total || paymentIntent.amount_received || paymentIntent.amount || 0) / (checkoutFallback?.total ? 1 : 100),
            Number(paymentIntent.amount || 0) / 100
        );
        const fallbackCustomer = checkoutFallback?.customer || {};

        const existingIndex = orders.findIndex((order) => order.paymentIntentId === paymentIntent.id);
        if (existingIndex >= 0) {
            const existing = orders[existingIndex] || {};
            if (!hasOrderCoreData(existing)) {
                const enriched = {
                    ...existing,
                    orderStatus: existing.orderStatus || (paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status),
                    paidAt: existing.paidAt || (paymentIntent.status === 'succeeded' ? new Date().toISOString() : null),
                    totalAmount: Number(existing.totalAmount || 0) > 0 ? Number(existing.totalAmount) : resolvedTotal,
                    subtotal: Number(existing.subtotal || 0) > 0 ? Number(existing.subtotal) : resolvedSubtotal,
                    totalShipping: Number(existing.totalShipping || 0) > 0 ? Number(existing.totalShipping) : resolvedShipping,
                    customerName: String(existing.customerName || '').trim()
                        || shipping.name
                        || billing.name
                        || String(metadata.customerName || '').trim()
                        || String(fallbackCustomer.name || '').trim(),
                    email: String(existing.email || '').trim()
                        || billing.email
                        || String(metadata.email || '').trim()
                        || paymentIntent.receipt_email
                        || String(fallbackCustomer.email || '').trim(),
                    phone: String(existing.phone || '').trim()
                        || billing.phone
                        || shipping.phone
                        || String(fallbackCustomer.phone || '').trim(),
                    address: String(existing.address || '').trim()
                        || address.line1
                        || String(fallbackCustomer.address || '').trim(),
                    city: String(existing.city || '').trim()
                        || address.city
                        || String(fallbackCustomer.city || '').trim(),
                    zip: String(existing.zip || '').trim()
                        || address.postal_code
                        || String(fallbackCustomer.zip || '').trim(),
                    country: String(existing.country || '').trim()
                        || address.country
                        || String(fallbackCustomer.country || '').trim(),
                    items: (Array.isArray(existing.items) && existing.items.some((item) => Number(item?.unitPrice || item?.amount || 0) > 0))
                        ? existing.items
                        : resolvedItems,
                    source: existing.source || 'recovery',
                    updatedAt: new Date().toISOString()
                };
                orders[existingIndex] = enriched;
                await writeOrders(orders);
                return res.status(200).json({ restored: true, updated: true, order: enriched });
            }
            return res.status(200).json({ restored: false, order: existing });
        }

        const orderNumber = metadata.orderNumber
            || parseOrderNumber(paymentIntent.description)
            || parseOrderNumber(charge?.description)
            || getNextOrderNumber(orders);

        const newOrder = {
            orderNumber,
            paymentIntentId: paymentIntent.id,
            orderStatus: paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status,
            paidAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
            totalAmount: resolvedTotal,
            subtotal: resolvedSubtotal,
            totalShipping: resolvedShipping,
            customerName: shipping.name || billing.name || metadata.customerName || fallbackCustomer.name || '',
            email: billing.email || metadata.email || paymentIntent.receipt_email || fallbackCustomer.email || '',
            phone: billing.phone || shipping.phone || fallbackCustomer.phone || '',
            address: address.line1 || fallbackCustomer.address || '',
            city: address.city || fallbackCustomer.city || '',
            zip: address.postal_code || fallbackCustomer.zip || '',
            country: address.country || fallbackCustomer.country || '',
            items: resolvedItems,
            source: 'recovery',
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);
        await writeOrders(orders);

        return res.status(200).json({ restored: true, order: newOrder });
    } catch (error) {
        console.error('Recover Order Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to recover order' });
    }
}
