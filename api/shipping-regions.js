const fs = require('fs');
const path = require('path');

let kvClient = null;

const KV_KEY = 'ghohary:shipping-regions';
const DEFAULT_FILE = path.join(process.cwd(), 'shipping-regions.json');

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

function readDefaultRegions() {
    try {
        if (!fs.existsSync(DEFAULT_FILE)) return [];
        const raw = fs.readFileSync(DEFAULT_FILE, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function normalizeRegions(regions) {
    return regions.map((region) => ({
        id: String(region.id || '').trim(),
        name: String(region.name || '').trim(),
        continent: String(region.continent || '').trim() || 'Other',
        enabled: Boolean(region.enabled),
        eta: String(region.eta || '').trim(),
        price: Number(region.price || 0)
    })).filter((region) => region.id && region.name);
}

function ensureKvEnv() {
    if (!process.env.KV_REST_API_URL && process.env.ghohary_kv_KV_REST_API_URL) {
        process.env.KV_REST_API_URL = process.env.ghohary_kv_KV_REST_API_URL;
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.ghohary_kv_KV_REST_API_TOKEN) {
        process.env.KV_REST_API_TOKEN = process.env.ghohary_kv_KV_REST_API_TOKEN;
    }
    if (!process.env.KV_REST_API_READ_ONLY_TOKEN && process.env.ghohary_kv_KV_REST_API_READ_ONLY_TOKEN) {
        process.env.KV_REST_API_READ_ONLY_TOKEN = process.env.ghohary_kv_KV_REST_API_READ_ONLY_TOKEN;
    }
}

function getKvClient() {
    ensureKvEnv();
    if (!kvClient) {
        // Lazy-load so env mapping runs first.
        ({ kv: kvClient } = require('@vercel/kv'));
    }
    return kvClient;
}

async function readRegions() {
    const kv = getKvClient();
    const stored = await kv.get(KV_KEY);
    if (Array.isArray(stored) && stored.length) {
        return stored;
    }
    const defaults = readDefaultRegions();
    if (defaults.length) {
        await kv.set(KV_KEY, defaults);
        return defaults;
    }
    return [];
}

module.exports = async (req, res) => {
    ensureKvEnv();
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        res.status(500).json({ error: 'Vercel KV not configured. Add KV env vars in Vercel.' });
        return;
    }

    if (req.method === 'GET') {
        try {
            const regions = await readRegions();
            res.status(200).json(regions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to load shipping regions.' });
        }
        return;
    }

    if (req.method === 'PUT') {
        const body = parseBody(req);
        const regions = Array.isArray(body) ? body : [];
        if (!regions.length) {
            res.status(400).json({ error: 'At least one region is required.' });
            return;
        }
        const normalized = normalizeRegions(regions);
        if (!normalized.length) {
            res.status(400).json({ error: 'Regions must include id and name.' });
            return;
        }
        try {
            const kv = getKvClient();
            await kv.set(KV_KEY, normalized);
            res.status(200).json({ success: true, regions: normalized });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save shipping regions.' });
        }
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
