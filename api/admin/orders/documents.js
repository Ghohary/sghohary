const { requireAdmin } = require('../../_utils/admin-auth');
const { readCollection, writeCollection } = require('../../_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';
const INVOICES_STORE_KEY = 'ghohary:invoices';

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

function asMoney(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(Math.max(0, numeric) * 100) / 100;
}

function isoDate(value) {
    const timestamp = Date.parse(String(value || ''));
    const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
    return date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
    const base = Date.parse(String(dateText || ''));
    const date = Number.isFinite(base) ? new Date(base) : new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function readInvoices() {
    const payload = await readCollection(INVOICES_STORE_KEY, {
        collectionKeys: ['invoices', 'payload.invoices'],
        fallback: []
    });
    if (Array.isArray(payload)) return payload;
    return [];
}

async function writeInvoices(invoices) {
    await writeCollection(INVOICES_STORE_KEY, invoices, { collectionKey: 'invoices' });
}

function nextDocumentNumber(invoices, prefix) {
    let max = 0;
    invoices.forEach((invoice) => {
        const match = safeText(invoice?.number).toUpperCase().match(new RegExp(`^${prefix}-(\\d+)$`));
        if (!match) return;
        const value = Number.parseInt(match[1], 10);
        if (Number.isFinite(value) && value > max) {
            max = value;
        }
    });
    return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

function buildAddress(order) {
    const name = safeText(order?.customerName);
    const street = safeText(order?.address);
    const cityZip = [safeText(order?.city), safeText(order?.zip)].filter(Boolean).join(', ');
    const country = safeText(order?.country);
    const phone = safeText(order?.phone);
    return [name, street, [cityZip, country].filter(Boolean).join(', '), phone].filter(Boolean).join('\n');
}

function buildInvoiceItems(order) {
    const mapped = Array.isArray(order?.items)
        ? order.items.map((item) => {
            const name = safeText(item?.name);
            if (!name) return null;
            const quantityRaw = Number(item?.quantity);
            const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.round(quantityRaw) : 1;
            const unitPrice = asMoney(item?.unitPrice ?? item?.amount);
            return { name, quantity, unitPrice };
        }).filter(Boolean)
        : [];

    if (mapped.length) return mapped;

    const fallbackAmount = asMoney(order?.subtotal || order?.totalAmount);
    return [{
        name: 'Order item',
        quantity: 1,
        unitPrice: fallbackAmount
    }];
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdmin(req, res)) {
        return;
    }

    const body = parseBody(req);
    const type = safeText(body?.type || 'invoice').toLowerCase();
    if (type !== 'invoice' && type !== 'receipt') {
        return res.status(400).json({ error: 'Type must be "invoice" or "receipt".' });
    }

    const orderNumber = safeText(body?.orderNumber);
    const paymentIntentId = safeText(body?.paymentIntentId);
    if (!orderNumber && !paymentIntentId) {
        return res.status(400).json({ error: 'Order number or payment intent ID is required.' });
    }

    try {
        const orders = await readOrders();
        const order = orders.find((candidate) => (
            (orderNumber && safeText(candidate?.orderNumber) === orderNumber)
            || (paymentIntentId && safeText(candidate?.paymentIntentId) === paymentIntentId)
        ));

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const invoices = await readInvoices();
        const prefix = type === 'receipt' ? 'RCT' : 'INV';
        const sourceKey = safeText(order?.orderNumber || order?.paymentIntentId || order?.id || `order-${Date.now()}`);
        const existing = invoices.find((invoice) => {
            const number = safeText(invoice?.number).toUpperCase();
            const notes = safeText(invoice?.notes).toLowerCase();
            return number.startsWith(`${prefix}-`) && notes.includes(`[order:${sourceKey.toLowerCase()}]`);
        });

        if (existing) {
            return res.status(200).json({ success: true, created: false, document: existing });
        }

        const items = buildInvoiceItems(order);
        const subtotal = asMoney(order?.subtotal || items.reduce((sum, item) => sum + asMoney(item.unitPrice) * Math.max(1, Number(item.quantity) || 1), 0));
        const shipping = asMoney(order?.totalShipping);
        const total = asMoney(order?.totalAmount || (subtotal + shipping));
        const issueDate = isoDate(order?.createdAt);
        const dueDate = type === 'invoice' ? addDays(issueDate, 7) : issueDate;
        const createdAt = new Date().toISOString();
        const nextDocument = {
            id: `${type}_${Date.now()}`,
            number: nextDocumentNumber(invoices, prefix),
            issueDate,
            dueDate,
            status: type === 'receipt' ? 'paid' : 'sent',
            country: safeText(order?.country),
            currency: 'AED',
            client: {
                name: safeText(order?.customerName, 'Customer'),
                email: safeText(order?.email),
                phone: safeText(order?.phone)
            },
            billingAddress: buildAddress(order),
            shippingAddress: buildAddress(order),
            items,
            subtotal,
            tax: 0,
            shipping,
            discount: 0,
            total,
            notes: `Auto-generated ${type} for order ${safeText(order?.orderNumber || order?.paymentIntentId)} [order:${sourceKey}]`,
            createdAt,
            updatedAt: createdAt
        };

        invoices.unshift(nextDocument);
        await writeInvoices(invoices);

        return res.status(200).json({ success: true, created: true, document: nextDocument });
    } catch (error) {
        console.error('Create document error:', error);
        return res.status(500).json({ error: error?.message || 'Failed to create document.' });
    }
}
