import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { createClient } from 'redis';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { requireAdmin } = require('./_utils/admin-auth');
const { readCollection, writeCollection } = require('./_utils/json-store');

const REDIS_KEY = 'ghohary:shipping-regions';
const DEFAULT_FILE = 'shipping-regions.json';
const DEFAULT_FILE_PATH = existsSync(path.join(process.cwd(), 'sghohary', DEFAULT_FILE))
    ? path.join(process.cwd(), 'sghohary', DEFAULT_FILE)
    : path.join(process.cwd(), DEFAULT_FILE);
const redisUrl = process.env.ghohary_REDIS_URL || process.env.REDIS_URL || '';
const SHIPPING_REGION_GROUPS = new Set(['europe', 'america', 'gcc', 'asia', 'australia']);
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;

let redisClient = null;
let redisConnecting = null;
let memoryRegionsCache = {
    regions: null,
    source: 'none',
    fetchedAt: 0
};

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

function readMemoryRegions() {
    if (!Array.isArray(memoryRegionsCache.regions)) return null;
    if ((Date.now() - Number(memoryRegionsCache.fetchedAt || 0)) > MEMORY_CACHE_TTL_MS) return null;
    return {
        regions: memoryRegionsCache.regions,
        source: memoryRegionsCache.source || 'memory'
    };
}

function writeMemoryRegions(regions, source = 'memory') {
    memoryRegionsCache = {
        regions: Array.isArray(regions) ? regions : [],
        source,
        fetchedAt: Date.now()
    };
}

function isFilePersistenceSafe() {
    if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_REGION) {
        return false;
    }
    return true;
}

function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function coerceContinent(value) {
    const candidate = String(value || '').trim().toLowerCase();
    if (SHIPPING_REGION_GROUPS.has(candidate)) {
        return candidate;
    }
    return '';
}

function inferContinent(region) {
    const explicit = coerceContinent(region?.continent || region?.region || '');
    if (explicit) return explicit;
    const value = `${String(region?.id || '').toLowerCase()} ${String(region?.name || '').toLowerCase()}`;
    if (/(united kingdom|uk|france|italy|germany|ireland|switzerland|belgium|czech|europe|spain|portugal|netherlands|austria|sweden|norway|denmark|finland|poland|greece)/.test(value)) return 'europe';
    if (/(united states|usa|canada|mexico|brazil|argentina|america)/.test(value)) return 'america';
    if (/(uae|united arab emirates|saudi|qatar|kuwait|bahrain|oman|gcc)/.test(value)) return 'gcc';
    if (/(australia|new zealand|oceania)/.test(value)) return 'australia';
    return 'asia';
}

function sanitizeRegions(input) {
    if (!Array.isArray(input)) return [];

    const byId = new Map();

    input.forEach((region) => {
        const name = String(region?.name || '').trim();
        if (!name) return;

        const id = slugify(region?.id || name);
        if (!id) return;

        const numericPrice = Number(region?.price);
        const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
        const eta = String(region?.eta || region?.deliveryDate || region?.deliveryWindow || '').trim();
        const continent = inferContinent({
            id: region?.id,
            name,
            continent: region?.continent,
            region: region?.region
        });

        byId.set(id, {
            id,
            name,
            enabled: region?.enabled === undefined ? true : Boolean(region?.enabled),
            price: Math.round(price * 100) / 100,
            eta,
            continent
        });
    });

    return Array.from(byId.values());
}

function extractRegionsFromPayload(payload) {
    const candidate = Array.isArray(payload?.regions) ? payload.regions : payload;
    return Array.isArray(candidate) ? candidate : [];
}

async function getRedisClient() {
    if (!redisUrl) return null;
    if (redisClient && redisClient.isOpen) return redisClient;

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

async function readRedisRegions() {
    const payload = await readCollection(REDIS_KEY, {
        collectionKeys: ['regions', 'payload.regions'],
        fallback: null
    });

    if (!Array.isArray(payload)) return null;
    return sanitizeRegions(extractRegionsFromPayload(payload));
}

async function writeRedisRegions(regions) {
    await writeCollection(REDIS_KEY, regions, { collectionKey: 'regions' });
    return true;
}

async function readDefaultRegions() {
    try {
        const filePath = DEFAULT_FILE_PATH;
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return sanitizeRegions(parsed);
    } catch (error) {
        return [];
    }
}

async function writeDefaultRegions(regions) {
    if (!isFilePersistenceSafe() || !Array.isArray(regions) || !regions.length) {
        return false;
    }

    const filePath = DEFAULT_FILE_PATH;

    try {
        await fs.writeFile(filePath, JSON.stringify(regions, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

async function persistRegions(regions) {
    let redisSaved = false;
    let fileSaved = false;

    try {
        redisSaved = await writeRedisRegions(regions);
    } catch (error) {
        redisSaved = false;
    }

    if (!redisSaved) {
        try {
            fileSaved = await writeDefaultRegions(regions);
        } catch (error) {
            fileSaved = false;
        }
    }

    return {
        saved: redisSaved || fileSaved,
        source: redisSaved
            ? 'redis'
            : fileSaved
                ? 'file'
                : 'none'
    };
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600');

        const memoryRegions = readMemoryRegions();
        if (memoryRegions && Array.isArray(memoryRegions.regions)) {
            return res.status(200).json(memoryRegions);
        }

        const redisRegions = await readRedisRegions();
        if (Array.isArray(redisRegions) && redisRegions.length) {
            writeMemoryRegions(redisRegions, 'redis');
            return res.status(200).json({ regions: redisRegions, source: 'redis' });
        }

        const defaults = await readDefaultRegions();
        writeMemoryRegions(defaults, 'default');
        return res.status(200).json({ regions: defaults, source: 'default' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (!requireAdmin(req, res)) {
        return;
    }

    const body = parseBody(req);

    if (body?.reset) {
        const defaults = await readDefaultRegions();
        if (!defaults.length) {
            return res.status(500).json({ error: 'Default shipping regions are unavailable.' });
        }
        const persisted = await persistRegions(defaults);
        if (!persisted.saved) {
            return res.status(500).json({ error: 'Shipping region storage is not configured.' });
        }
        writeMemoryRegions(defaults, persisted.source);
        return res.status(200).json({ success: true, regions: defaults, source: persisted.source });
    }

    const candidateRegions = Array.isArray(body) ? body : body?.regions;
    const sanitized = sanitizeRegions(candidateRegions);

    if (!sanitized.length) {
        return res.status(400).json({ error: 'Provide at least one valid shipping region.' });
    }

    const persisted = await persistRegions(sanitized);
    if (!persisted.saved) {
        return res.status(500).json({ error: 'Shipping region storage is not configured.' });
    }

    writeMemoryRegions(sanitized, persisted.source);
    return res.status(200).json({ success: true, regions: sanitized, source: persisted.source });
}
