const { requireAdmin } = require('./_utils/admin-auth');
const { readCollection, writeCollection } = require('./_utils/json-store');

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

function money(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 100) / 100;
}

function safeText(value, fallback = '') {
    return String(value ?? fallback).trim();
}

function sanitizeItem(item) {
    if (!item || typeof item !== 'object') return null;
    const name = safeText(item.name);
    if (!name) return null;
    const quantityRaw = Number(item.quantity);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.round(quantityRaw) : 1;
    return {
        name,
        quantity,
        unitPrice: money(item.unitPrice)
    };
}

function sanitizeInvoice(invoice, index) {
    if (!invoice || typeof invoice !== 'object') return null;
    const id = safeText(invoice.id, `inv_${Date.now()}_${index}`);
    if (!id) return null;
    const items = Array.isArray(invoice.items) ? invoice.items.map(sanitizeItem).filter(Boolean) : [];
    if (!items.length) return null;
    const status = safeText(invoice.status, 'draft').toLowerCase();
    const allowedStatus = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
    const normalizedStatus = allowedStatus.has(status) ? status : 'draft';

    return {
        id,
        number: safeText(invoice.number, `INV-${Date.now()}`),
        issueDate: safeText(invoice.issueDate),
        dueDate: safeText(invoice.dueDate),
        status: normalizedStatus,
        country: safeText(invoice.country),
        currency: safeText(invoice.currency || 'AED').toUpperCase(),
        client: {
            name: safeText(invoice?.client?.name),
            email: safeText(invoice?.client?.email),
            phone: safeText(invoice?.client?.phone)
        },
        billingAddress: safeText(invoice.billingAddress),
        shippingAddress: safeText(invoice.shippingAddress),
        items,
        subtotal: money(invoice.subtotal),
        tax: money(invoice.tax),
        shipping: money(invoice.shipping),
        discount: money(invoice.discount),
        total: money(invoice.total),
        notes: safeText(invoice.notes),
        createdAt: safeText(invoice.createdAt || new Date().toISOString()),
        updatedAt: safeText(invoice.updatedAt || new Date().toISOString())
    };
}

function sanitizeInvoices(input) {
    if (!Array.isArray(input)) return [];
    return input
        .map((invoice, index) => sanitizeInvoice(invoice, index))
        .filter(Boolean)
        .sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });
}

async function readInvoices() {
    const payload = await readCollection(INVOICES_STORE_KEY, {
        collectionKeys: ['invoices', 'payload.invoices']
    });
    return sanitizeInvoices(Array.isArray(payload) ? payload : []);
}

async function writeInvoices(invoices) {
    await writeCollection(INVOICES_STORE_KEY, invoices, { collectionKey: 'invoices' });
}

export default async function handler(req, res) {
    if (!requireAdmin(req, res)) {
        return;
    }

    if (req.method === 'GET') {
        const invoices = await readInvoices();
        return res.status(200).json({ invoices, source: 'redis' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseBody(req);
    const candidateInvoices = Array.isArray(body) ? body : body?.invoices;
        const invoices = sanitizeInvoices(candidateInvoices);

    try {
        await writeInvoices(invoices);
        return res.status(200).json({ success: true, invoices, source: 'redis' });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to save invoices.' });
    }
}
