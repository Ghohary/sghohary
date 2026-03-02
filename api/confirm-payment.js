const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('redis');
const { readCollection, writeCollection } = require('./_utils/json-store');
const {
    normalizeSkuValue,
    resolveAliasSku,
    stripSizeFromName,
    findFallbackMatchByTokens
} = require('./_utils/order-matching');

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

function normalizeLookupName(value) {
    return String(value || '').trim().toLowerCase();
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
        const record = {
            id,
            sku,
            name,
            price,
            image: Array.isArray(product?.images) && product.images[0] ? String(product.images[0]).trim() : String(product?.image || '').trim()
        };

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

function normalizeImage(value) {
    return String(value || '').trim();
}

function parseMetadataItems(rawValue) {
    if (!rawValue) return [];

    const dedupeEntries = (entries) => {
        const seen = new Set();
        const output = [];
        entries.forEach((entry) => {
            if (!entry || typeof entry !== 'object') return;
            const signature = [
                entry.name || '',
                entry.sku || '',
                entry.productId || '',
                entry.size || '',
                String(toPositiveInteger(entry.quantity || 0, 1)),
                toSafeMoney(entry.unitPrice || 0).toFixed(2)
            ].join('|');
            if (seen.has(signature)) return;
            seen.add(signature);
            output.push(entry);
        });
        return output;
    };

    if (typeof rawValue === 'object') {
        const entries = [];
        const addCandidate = (candidate) => {
            if (!candidate || typeof candidate !== 'object') return;
        const candidateName = String(candidate.n || candidate.name || '').trim() || 'GHOHARY Item';
        entries.push({
            name: candidateName,
            quantity: toPositiveInteger(candidate.q || candidate.quantity || 1, 1),
            unitPrice: toSafeMoney(candidate.p || candidate.price || 0, 0),
            sku: String(candidate.sku || candidate.s || '').trim(),
            productId: String(candidate.pid || candidate.productId || '').trim(),
            size: String(candidate.z || candidate.size || extractSizeFromText(candidateName) || '').trim(),
            option: String(candidate.option || '').trim(),
            image: normalizeImage(candidate.image || candidate.i || candidate.img || '')
        });
        };

        const compactString = String(rawValue.orderItems || rawValue.order_items || '').trim();
        if (compactString) {
            try {
                const parsed = JSON.parse(compactString);
                if (Array.isArray(parsed)) {
                    parsed.forEach(addCandidate);
                }
            } catch (error) {
                // ignore parsing failures and continue with per-item fields
            }
        }

        const indexed = Object.entries(rawValue)
            .filter(([key, value]) => /^orderItem\d+$/i.test(String(key)) && value)
            .sort((left, right) => {
                const leftIndex = parseInt(String(left[0]).replace(/[^0-9]/g, ''), 10) || 0;
                const rightIndex = parseInt(String(right[0]).replace(/[^0-9]/g, ''), 10) || 0;
                return leftIndex - rightIndex;
            });

        indexed.forEach(([, rawItem]) => {
            if (typeof rawItem === 'string') {
                const compact = rawItem.trim();
                if (!compact) return;
                if (compact.startsWith('{') && compact.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(compact);
                        if (parsed && typeof parsed === 'object') {
                            addCandidate(parsed);
                        }
                        return;
                    } catch (error) {
                        // continue to delimiter parsing
                    }
                }
                const parts = compact.split('|').map(value => value.trim()).filter(Boolean);
                if (parts.length >= 1) {
                    addCandidate({
                        n: parts[0],
                        q: parts[1],
                        p: parts[2],
                        sku: parts[3] || '',
                        pid: parts[4] || '',
                        z: parts[5] || parts[1] || '',
                        image: parts[6] || ''
                    });
                }
            } else if (rawItem && typeof rawItem === 'object') {
                addCandidate(rawItem);
            }
        });

        return dedupeEntries(entries);
    }

    try {
        const parsed = JSON.parse(String(rawValue));
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                    const name = String(entry.n || entry.name || '').trim() || 'GHOHARY Item';
                    return {
                        name,
                        quantity: toPositiveInteger(entry.q || entry.quantity || 1, 1),
                        unitPrice: toSafeMoney(entry.p || entry.price || 0, 0),
                        sku: String(entry.sku || entry.s || '').trim(),
                        productId: String(entry.pid || entry.productId || '').trim(),
                        size: String(entry.z || entry.size || extractSizeFromText(name) || '').trim(),
                        option: String(entry.option || '').trim(),
                        image: normalizeImage(entry.image || entry.i || entry.img || '')
                    };
                })
                .filter(Boolean);
    } catch (error) {
        return [];
    }
}

function extractSizeFromText(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(/\(?.*?(?:size|sz)\s*[:\-]?\s*([^)]+?)\)?$/i);
    return match ? String(match[1]).replace(/[)\]]+$/g, '').trim() : '';
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
        const listedItems = Array.isArray(lineItemsResponse?.data) ? lineItemsResponse.data : [];
        let rawItems = listedItems;

        if (!rawItems.length) {
            const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
                expand: ['line_items.data.price.product']
            });
            rawItems = Array.isArray(sessionWithItems?.line_items?.data)
                ? sessionWithItems.line_items.data
                : [];
        }

        const isShipping = (name, kind) => {
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
            const shippingLine = isShipping(name, productMetadata?.kind);
            const lineTotal = toSafeMoney(Number(lineItem?.amount_total || 0) / 100, 0);
            const unitPrice = quantity > 0
                ? toSafeMoney(lineTotal / quantity, 0)
                : toSafeMoney(Number(lineItem?.amount_subtotal || 0) / 100, 0);
            const lineImage = normalizeImage(Array.isArray(lineItem?.price?.product?.images) ? lineItem?.price?.product?.images[0] : '');

            if (shippingLine) {
                shippingFromLines += lineTotal;
                return;
            }

            items.push({
                name,
                quantity,
                unitPrice,
                sku: String(productMetadata?.sku || '').trim(),
                productId: String(productMetadata?.productId || '').trim(),
                size: String(productMetadata?.size || extractSizeFromText(name)).trim(),
                image: lineImage,
                option: ''
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

function normalizeItemSignature(item) {
    return [
        String(item?.name || '').trim().toLowerCase(),
        String(item?.sku || '').trim().toLowerCase(),
        String(item?.productId || '').trim().toLowerCase(),
        String(item?.size || '').trim().toLowerCase(),
        toSafeMoney(item?.unitPrice || 0).toFixed(2),
        String(toPositiveInteger(item?.quantity || 0, 1)),
        String(item?.image || '').trim().toLowerCase()
    ].join('|');
}

function haveItemMismatch(existingItems = [], resolvedItems = []) {
    if (!Array.isArray(existingItems) || !Array.isArray(resolvedItems)) return true;
    if (existingItems.length !== resolvedItems.length) return true;
    if (existingItems.length === 0 && resolvedItems.length === 0) return false;

    const existingSignatures = new Set(existingItems.map(normalizeItemSignature));
    if (existingSignatures.size !== resolvedItems.length) return true;

    for (const item of resolvedItems) {
        if (!existingSignatures.has(normalizeItemSignature(item))) {
            return true;
        }
    }
    return false;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paymentIntentId, customer, summary } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment Intent ID required' });
        }

        // Retrieve payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            const orders = await readOrders();
            const checkoutFallback = await fetchCheckoutFallback(paymentIntent.id);
            const metadata = paymentIntent.metadata || {};
            const orderSummary = summary || {};
            const orderCustomer = customer || {};
            const charge = paymentIntent.charges?.data?.[0];
            const billing = charge?.billing_details || {};
            const shipping = paymentIntent.shipping || charge?.shipping || {};
            const resolvedAddress = shipping.address || billing.address || {};
            const metadataItems = parseMetadataItems(metadata);
            const summaryItems = Array.isArray(checkoutFallback?.items) && checkoutFallback.items.length
                ? checkoutFallback.items
                : (Array.isArray(orderSummary.items) && orderSummary.items.length
                    ? orderSummary.items
                    : metadataItems);

            const resolvedSubtotal = toSafeMoney(
                Number.isFinite(Number(checkoutFallback?.subtotal))
                    ? Number(checkoutFallback.subtotal)
                    : Number.isFinite(Number(orderSummary.subtotal))
                        ? Number(orderSummary.subtotal)
                        : Number(metadata.orderSubtotal || metadata.summarySubtotal || 0),
                0
            );
            const resolvedShipping = toSafeMoney(
                Number.isFinite(Number(checkoutFallback?.shipping))
                    ? Number(checkoutFallback.shipping)
                    : Number.isFinite(Number(orderSummary.totalShipping))
                        ? Number(orderSummary.totalShipping)
                        : Number(metadata.orderShipping || metadata.summaryShipping || 0),
                0
            );
            const resolvedTotal = toSafeMoney(
                Number.isFinite(Number(checkoutFallback?.total))
                    ? Number(checkoutFallback.total)
                    : Number.isFinite(Number(orderSummary.total))
                        ? Number(orderSummary.total)
                        : Number(paymentIntent.amount / 100),
                Number(paymentIntent.amount || 0) / 100
            );

            const fallbackCustomer = checkoutFallback?.customer || {};
            const toPositiveInt = (value) => {
                const num = Number(value);
                return Number.isFinite(num) && num > 0 ? Math.round(num) : 1;
            };
            const toAmount = (value) => {
                const num = Number(value);
                return Number.isFinite(num) && num >= 0 ? num : 0;
            };
            const cleanText = (value) => String(value || '').trim();
            const productLookup = buildProductLookup(await readProducts());
            const normalizeItem = (item) => {
                const rawName = cleanText(item.name) || 'GHOHARY Item';
                const name = stripSizeFromName(rawName);
                let itemPrice = toAmount(item.unitPrice);
                const directSku = cleanText(item.sku || item.productSku || item.variantSku);
                const directProductId = cleanText(item.productId || item.id);
                const aliasSku = resolveAliasSku(rawName) || resolveAliasSku(name);
                const normalizedSku = normalizeSkuValue(directSku);
                let match = directProductId ? productLookup.byId.get(directProductId) : null;
                if (!match && normalizedSku) {
                    match = productLookup.bySku.get(normalizedSku);
                }
                if (!match && aliasSku) {
                    match = productLookup.bySku.get(normalizeSkuValue(aliasSku));
                }
                if (!match) {
                    const nameKey = normalizeLookupName(name);
                    const nameMatches = nameKey ? (productLookup.byName.get(nameKey) || []) : [];
                    if (nameMatches.length === 1) {
                        match = nameMatches[0];
                    } else if (nameMatches.length > 1 && Number.isFinite(itemPrice) && itemPrice > 0) {
                        match = nameMatches.find((candidate) => Number.isFinite(candidate?.price) && Math.abs(candidate.price - itemPrice) < 0.01) || null;
                    } else {
                        match = findFallbackMatchByTokens(name, itemPrice, productLookup);
                    }
                }
                if (itemPrice <= 0 && Number.isFinite(Number(match?.price)) && Number(match.price) > 0) {
                    itemPrice = toAmount(match.price);
                }

            return {
                name: cleanText(match?.name) || name,
                sku: cleanText(match?.sku) || directSku,
                productId: directProductId || cleanText(match?.id),
                size: cleanText(
                    item.size || item.selectedSize || item.variant || item.option || extractSizeFromText(rawName)
                ),
                option: cleanText(item.option || item.optionLabel),
                quantity: toPositiveInt(item.quantity),
                unitPrice: itemPrice,
                    image: normalizeImage(item.image || match?.image || '')
                };
            };
            const normalizedSummaryItems = summaryItems.map(normalizeItem);
            const explicitCustomerName = `${orderCustomer.firstName || ''} ${orderCustomer.lastName || ''}`.trim();
            const customerName = explicitCustomerName
                || cleanText(fallbackCustomer.name)
                || cleanText(shipping.name || billing.name || metadata.customerName);

            const normalizedOrder = {
                totalAmount: resolvedTotal,
                subtotal: resolvedSubtotal,
                totalShipping: resolvedShipping,
                customerName,
                email: orderCustomer.email || metadata.email || billing.email || paymentIntent.receipt_email || cleanText(fallbackCustomer.email) || '',
                phone: orderCustomer.phone || metadata.customerPhone || billing.phone || shipping.phone || cleanText(fallbackCustomer.phone) || '',
                address: orderCustomer.address || metadata.customerAddress || resolvedAddress.line1 || cleanText(fallbackCustomer.address) || '',
                city: orderCustomer.city || metadata.customerCity || resolvedAddress.city || cleanText(fallbackCustomer.city) || '',
                zip: orderCustomer.zip || metadata.customerZip || resolvedAddress.postal_code || cleanText(fallbackCustomer.zip) || '',
                country: orderCustomer.country || metadata.customerCountry || resolvedAddress.country || cleanText(fallbackCustomer.country) || '',
                items: normalizedSummaryItems
            };

            const existing = orders.find(order => order.paymentIntentId === paymentIntent.id);
            if (existing) {
                const existingItems = Array.isArray(existing.items) ? existing.items.length : 0;
                const resolvedNoItems = !Array.isArray(normalizedSummaryItems) || normalizedSummaryItems.length === 0;
                const shouldRepair = existingItems === 0
                    || !resolvedNoItems
                        && (
                            existingItems !== normalizedSummaryItems.length
                            || haveItemMismatch(existing.items, normalizedSummaryItems)
                        )
                    || toSafeMoney(existing.totalAmount) !== resolvedTotal
                    || toSafeMoney(existing.subtotal || 0) !== resolvedSubtotal
                    || toSafeMoney(existing.totalShipping || 0) !== resolvedShipping;

                if (shouldRepair) {
                    const repaired = {
                        ...existing,
                        totalAmount: normalizedOrder.totalAmount,
                        subtotal: normalizedOrder.subtotal,
                        totalShipping: normalizedOrder.totalShipping,
                        customerName: normalizedOrder.customerName || existing.customerName,
                        email: normalizedOrder.email || existing.email,
                        phone: normalizedOrder.phone || existing.phone,
                        address: normalizedOrder.address || existing.address,
                        city: normalizedOrder.city || existing.city,
                        zip: normalizedOrder.zip || existing.zip,
                        country: normalizedOrder.country || existing.country,
                        items: normalizedOrder.items.length ? normalizedOrder.items : existing.items
                    };
                    const repairedOrders = orders.map(order => order.paymentIntentId === paymentIntent.id ? repaired : order);
                    await writeOrders(repairedOrders);
                    Object.assign(existing, repaired);
                }
                return res.status(200).json({
                    success: true,
                    orderNumber: existing.orderNumber,
                    paymentId: paymentIntent.id,
                    amount: existing.totalAmount || paymentIntent.amount / 100,
                    currency: paymentIntent.currency.toUpperCase()
                });
            }

            const orderNumber = getNextOrderNumber(orders);
            const newOrder = {
                orderNumber,
                paymentIntentId: paymentIntent.id,
                orderStatus: 'paid',
                paidAt: new Date().toISOString(),
                ...normalizedOrder,
                items: normalizedSummaryItems,
                createdAt: new Date().toISOString()
            };

            orders.push(newOrder);
            await writeOrders(orders);

            res.status(200).json({
                success: true,
                orderNumber,
                paymentId: paymentIntent.id,
                amount: newOrder.totalAmount,
                currency: paymentIntent.currency.toUpperCase()
            });
        } else if (paymentIntent.status === 'processing') {
            res.status(200).json({
                success: true,
                status: 'processing',
                message: 'Payment is being processed'
            });
        } else {
            res.status(400).json({
                success: false,
                status: paymentIntent.status,
                message: 'Payment could not be completed'
            });
        }
    } catch (error) {
        console.error('Confirm Payment Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to confirm payment'
        });
    }
}
