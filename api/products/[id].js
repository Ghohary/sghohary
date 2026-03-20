const { createClient } = require('redis');

const redisUrl = process.env.ghohary_REDIS_URL;
const BLOBSOURCE_URL_PATTERN = /(?:^|[./-])(vercel-storage\.com|public\.blob\.vercel-storage\.com|blob\.vercel-storage)(?:[/?#]|$)/i;
let redisClient = null;
let redisConnecting = null;

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
    const client = await getRedisClient();
    if (!client) {
        return [];
    }
    const raw = await client.get('ghohary:products');
    if (!raw) {
        return [];
    }
    try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

async function writeProducts(products) {
    const client = await getRedisClient();
    if (!client) {
        return;
    }
    await client.set('ghohary:products', JSON.stringify(products));
}

function sanitizeImageUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (BLOBSOURCE_URL_PATTERN.test(url)) return '';
    return url;
}

function sanitizeProductImageFields(product) {
    if (!product || typeof product !== 'object') return product;

    const cloned = { ...product };
    const keys = ['images', 'image', 'downloadUrl', 'download_url', 'image_url', 'imageUrl', 'imageSrc', 'image_src', 'main_image', 'featured_image', 'thumbnail', 'thumb', 'thumbnailUrl'];

    keys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(cloned, key)) {
            return;
        }
        const value = cloned[key];
        if (Array.isArray(value)) {
            cloned[key] = value
                .map((entry) => sanitizeImageUrl(entry))
                .filter((entry) => entry !== '');
            return;
        }
        if (typeof value === 'string') {
            const next = sanitizeImageUrl(value);
            if (next) {
                cloned[key] = next;
            } else {
                delete cloned[key];
            }
        }
    });

    return cloned;
}

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

module.exports = async (req, res) => {
    if (!redisUrl) {
        res.status(500).json({ error: 'Redis not configured. Set ghohary_REDIS_URL in Vercel.' });
        return;
    }

    const { id } = req.query || {};
    if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
    }

    const products = await readProducts();
    const index = products.findIndex((item) => item.id == id);

    if (req.method === 'GET') {
        if (index === -1) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(200).json(sanitizeProductImageFields(products[index]));
        return;
    }

    if (req.method === 'PUT') {
        if (index === -1) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        const body = parseBody(req);
        const updated = {
            ...products[index],
            ...body,
            id: products[index].id,
            updatedAt: new Date().toISOString()
        };
        products[index] = updated;
        await writeProducts(products);
        res.status(200).json(sanitizeProductImageFields(updated));
        return;
    }

    if (req.method === 'DELETE') {
        if (index === -1) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        const removed = products.splice(index, 1)[0];
        await writeProducts(products);
        res.status(200).json(sanitizeProductImageFields(removed));
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
