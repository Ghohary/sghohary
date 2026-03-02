const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('redis');
const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');
const {
    normalizeSkuValue,
    resolveAliasSku,
    findFallbackMatchByTokens
} = require('../../_utils/order-matching');

const redisUrl = process.env.ghohary_REDIS_URL;
let redisClient = null;
let redisConnecting = null;

const ORDERS_STORE_KEY = 'ghohary:orders';

function normalizeLookupName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
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

function moneyDifferent(left, right) {
  return Math.abs(toSafeMoney(left, 0) - toSafeMoney(right, 0)) > 0.005;
}

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

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

function buildProductLookup(products) {
  const byId = new Map();
  const byName = new Map();
  const bySku = new Map();

  (Array.isArray(products) ? products : []).forEach((product) => {
    const id = normalizeText(product?.id);
    const sku = normalizeSkuValue(product?.sku);
    const name = normalizeText(product?.name);
    const price = Number(product?.price);

    const record = { id, sku, name, price };

    if (id) byId.set(id, record);
    if (sku) bySku.set(sku, record);

    const key = normalizeLookupName(name);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(record);
    }
  });

    return { byId, byName, bySku };
}

function normalizeItems(rawItems, productLookup = {}) {
  if (!Array.isArray(rawItems)) return [];

    return rawItems.map((item) => {
    const rawName = normalizeText(item?.name || item?.description || 'GHOHARY Item');
    const name = rawName.replace(/\s*\([^)]+\)\s*$/, '').trim();
    const directSku = normalizeText(item?.sku || item?.productSku || item?.variantSku);
    const directProductId = normalizeText(item?.productId || item?.id);
    const aliasSku = resolveAliasSku(rawName) || resolveAliasSku(name);
    const rawPrice = Number(item?.unitPrice);
    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const normalizedSku = normalizeSkuValue(directSku);

    let match = directProductId ? productLookup.byId?.get(directProductId) : null;
    if (!match && normalizedSku) {
      match = productLookup.bySku?.get(normalizedSku);
    }
    if (!match && aliasSku) {
      match = productLookup.bySku?.get(normalizeSkuValue(aliasSku));
    }
    if (!match) {
      const nameKey = normalizeLookupName(name);
      const nameMatches = nameKey ? (productLookup.byName?.get(nameKey) || []) : [];
      if (nameMatches.length === 1) {
        match = nameMatches[0];
      } else if (nameMatches.length > 1 && Number.isFinite(price) && price > 0) {
        match = nameMatches.find((candidate) => Number.isFinite(candidate?.price) && Math.abs(candidate.price - price) < 0.01) || null;
      } else {
        match = findFallbackMatchByTokens(name, price, productLookup);
      }
    }

    const unitPrice = price || toSafeMoney(match?.price, 0);

    return {
      name: normalizeText(match?.name || name),
      sku: directSku || normalizeText(match?.sku),
      productId: directProductId || normalizeText(match?.id),
      size: normalizeText(item?.size || item?.selectedSize || item?.variant || item?.option),
      option: normalizeText(item?.option || item?.optionLabel),
      quantity: toPositiveInteger(item?.quantity, 1),
      unitPrice
    };
  });
}

function parseMetadataItems(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(String(rawValue));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      name: normalizeText(entry?.n || entry?.name || 'GHOHARY Item'),
      quantity: toPositiveInteger(entry?.q || entry?.quantity || 1, 1),
      unitPrice: toSafeMoney(entry?.p || entry?.price || 0, 0),
      sku: normalizeText(entry?.sku || entry?.s || ''),
      productId: normalizeText(entry?.pid || entry?.productId || ''),
      size: normalizeText(entry?.z || entry?.size || ''),
      option: normalizeText(entry?.option || '')
    }));
  } catch (error) {
    return [];
  }
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
    const items = [];
    let shippingFromLines = 0;

    const isShippingItem = (name, kind) => {
      const normalizedKind = normalizeLookupName(kind);
      if (normalizedKind === 'shipping') return true;
      return /^shipping\b/i.test(normalizeLookupName(name));
    };

    rawItems.forEach((lineItem) => {
      const quantity = toPositiveInteger(lineItem?.quantity, 1);
      const name = normalizeText(
        lineItem?.description
        || lineItem?.price?.nickname
        || lineItem?.price?.product?.name
      ) || 'GHOHARY Item';
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
        quantity,
        unitPrice,
        sku: normalizeText(productMetadata?.sku),
        productId: normalizeText(productMetadata?.productId),
        size: normalizeText(productMetadata?.size),
        option: ''
      });
    });

    const sessionShipping = toSafeMoney(Number(session?.total_details?.amount_shipping || 0) / 100, 0);
    const shipping = sessionShipping > 0 ? sessionShipping : shippingFromLines;

    const customerDetails = session?.customer_details || {};
    const customerAddress = customerDetails?.address || session?.shipping_details?.address || {};

    const subtotal = items.reduce((sum, item) => sum + (toSafeMoney(item.unitPrice) * toPositiveInteger(item.quantity, 1)), 0);
    const total = toSafeMoney(Number(session?.amount_total || 0) / 100, 0);

    return {
      items,
      subtotal,
      shipping,
      total,
      customer: {
        name: normalizeText(customerDetails?.name || session?.shipping_details?.name || ''),
        email: normalizeText(customerDetails?.email || ''),
        phone: normalizeText(customerDetails?.phone || ''),
        address: normalizeText(customerAddress?.line1 || ''),
        city: normalizeText(customerAddress?.city || ''),
        zip: normalizeText(customerAddress?.postal_code || ''),
        country: normalizeText(customerAddress?.country || '')
      }
    };
  } catch (error) {
    return null;
  }
}

function itemSignature(item) {
  return `${normalizeLookupName(item?.name)}|${normalizeLookupName(item?.size || item?.option)}|${toPositiveInteger(item?.quantity, 1)}|${toSafeMoney(item?.unitPrice, 0).toFixed(2)}|${normalizeText(item?.sku)}|${normalizeText(item?.productId)}`;
}

function requiresItemRepair(existingItems = [], resolvedItems = []) {
  if (!Array.isArray(existingItems) || existingItems.length === 0) return true;
  if (!Array.isArray(resolvedItems) || resolvedItems.length === 0) return false;
  if (existingItems.length !== resolvedItems.length) return true;

  const existingSig = new Set(existingItems.map((item) => itemSignature(item)));
  const fallbackSig = new Set(resolvedItems.map((item) => itemSignature(item)));

  if (existingSig.size !== fallbackSig.size) return true;

  for (const signature of fallbackSig) {
    if (!existingSig.has(signature)) return true;
  }

  return false;
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

  const body = req.body || {};
  const targetPaymentIntent = normalizeText(body?.paymentIntentId || '');
  const dryRun = body?.dryRun === true;
  const maxItems = Number(body?.limit);
  const parsedLimit = Number.isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : null;

  try {
    const orders = await readOrders();
    const productLookup = buildProductLookup(await readProducts());
    const targets = [];

    orders.forEach((order) => {
      const paymentIntentId = normalizeText(order?.paymentIntentId);
      if (!paymentIntentId) return;
      if (targetPaymentIntent && paymentIntentId !== targetPaymentIntent) return;

      const status = String(order?.orderStatus || order?.status || '').toLowerCase();
      if (status === 'pending' || status === 'unpaid') return;
      if (parsedLimit && targets.length >= parsedLimit) return;
      targets.push({ order, paymentIntentId });
    });

    let checked = 0;
    let repaired = 0;
    let unresolved = 0;
    const results = [];
    const nextOrders = parsedLimit ? orders.slice() : [...orders];

    for (const target of targets) {
      checked += 1;
      const order = target.order;
      const paymentIntentId = target.paymentIntentId;

        try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['charges.data'] });
        const orderStatus = String(paymentIntent?.status || '').toLowerCase();
        const charge = paymentIntent?.charges?.data?.[0];
        const billing = charge?.billing_details || {};
        const shipping = paymentIntent.shipping || charge?.shipping || {};
        const resolvedAddress = shipping.address || billing.address || {};
        const metadata = paymentIntent?.metadata || {};
        const fallback = await fetchCheckoutFallback(paymentIntent.id);
        const fallbackItems = Array.isArray(fallback?.items) && fallback.items.length ? fallback.items : parseMetadataItems(metadata.orderItems);
        const normalizedItems = normalizeItems(fallbackItems, productLookup);
        const subtotalFromFallback = normalizedItems.reduce((sum, item) => sum + (toSafeMoney(item.unitPrice) * toPositiveInteger(item.quantity, 1)), 0);
        const resolvedSubtotal = toSafeMoney(
          Number(fallback?.subtotal),
          subtotalFromFallback || toSafeMoney(order.subtotal, 0)
        );
        const resolvedShipping = toSafeMoney(
          Number(fallback?.shipping),
          Number(metadata.orderShipping || metadata.summaryShipping || order.totalShipping || 0)
        );
        const resolvedTotal = toSafeMoney(
          Number(fallback?.total || 0),
          Number(paymentIntent.amount || 0) / 100
        );

        const fallbackCustomer = fallback?.customer || {};
        const shouldRepair = requiresItemRepair(order.items, normalizedItems)
          || moneyDifferent(order.totalAmount, resolvedTotal)
          || moneyDifferent(order.subtotal, resolvedSubtotal)
          || moneyDifferent(order.totalShipping, resolvedShipping)
          || normalizeText(order.orderNumber).length === 0
          || normalizeText(order.customerName).length === 0;

        if (shouldRepair && paymentIntentId) {
          repaired += 1;
        }

        const resolvedOrderStatus = orderStatus === 'succeeded' ? 'paid' : (orderStatus || (order.orderStatus || 'unpaid'));
        const enriched = {
          ...order,
          orderStatus: shouldRepair ? resolvedOrderStatus : (order.orderStatus || resolvedOrderStatus),
          paidAt: order.paidAt || (orderStatus === 'succeeded' ? new Date().toISOString() : order.paidAt),
          totalAmount: shouldRepair ? resolvedTotal : toSafeMoney(order.totalAmount, resolvedTotal),
          subtotal: shouldRepair ? resolvedSubtotal : toSafeMoney(order.subtotal, resolvedSubtotal),
          totalShipping: shouldRepair ? resolvedShipping : toSafeMoney(order.totalShipping, resolvedShipping),
          customerName: normalizeText(order.customerName || metadata.customerName || (fallbackCustomer.name || billing?.name || '')),
          email: normalizeText(order.email || metadata.email || billing?.email || paymentIntent.receipt_email || fallbackCustomer.email || ''),
          phone: normalizeText(order.phone || metadata.customerPhone || billing?.phone || shipping?.phone || fallbackCustomer.phone || ''),
          address: normalizeText(order.address || metadata.customerAddress || resolvedAddress.line1 || fallbackCustomer.address || ''),
          city: normalizeText(order.city || metadata.customerCity || resolvedAddress.city || fallbackCustomer.city || ''),
          zip: normalizeText(order.zip || metadata.customerZip || resolvedAddress.postal_code || fallbackCustomer.zip || ''),
          country: normalizeText(order.country || metadata.customerCountry || resolvedAddress.country || fallbackCustomer.country || ''),
          items: normalizedItems.length ? normalizedItems : order.items,
          source: order.source || 'reconciled',
          updatedAt: shouldRepair ? new Date().toISOString() : order.updatedAt
        };

        if (shouldRepair && !dryRun && normalizedItems.length) {
          const index = nextOrders.findIndex((existingOrder) => existingOrder?.paymentIntentId === paymentIntentId);
          if (index >= 0) {
            const current = nextOrders[index] || {};
            nextOrders[index] = {
              ...current,
              ...enriched,
              source: current.source || 'reconciled',
              updatedAt: new Date().toISOString()
            };
          }
        }

        results.push({
          paymentIntentId,
          orderNumber: order.orderNumber,
          status: paymentIntent?.status || 'unknown',
          repaired: shouldRepair,
          reason: shouldRepair ? 'updated-from-checkout' : 'already-aligned'
        });
      } catch (error) {
        unresolved += 1;
        results.push({
          paymentIntentId,
          orderNumber: order.orderNumber,
          status: 'error',
          error: error?.message || 'Failed to reconcile'
        });
      }
    }

    if (!dryRun && repaired > 0) {
      await writeOrders(nextOrders);
    }

    const response = {
      success: true,
      checked,
      repaired,
      unresolved,
      dryRun,
      results
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Reconcile Orders Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reconcile orders' });
  }
}
