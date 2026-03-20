const { createClient } = require('redis');

const redisUrl = process.env.ghohary_REDIS_URL;
const BLOBSOURCE_URL_PATTERN = /(?:^|[./-])(vercel-storage\.com|public\.blob\.vercel-storage\.com|blob\.vercel-storage)(?:[/?#]|$)/i;
const requiredEnv = {
    ghohary_REDIS_URL: redisUrl
};
const missingEnv = Object.entries(requiredEnv).filter(([, value]) => !value).map(([key]) => key);
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

function dedupeProductsById(products) {
    if (!Array.isArray(products)) {
        return [];
    }

    const map = new Map();

    products.forEach((product) => {
        if (!product || !product.id) {
            return;
        }

        const key = String(product.id);
        const current = map.get(key);
        if (!current) {
            map.set(key, product);
            return;
        }

        const currentCreatedAt = Date.parse(current.createdAt || '') || 0;
        const nextCreatedAt = Date.parse(product.createdAt || '') || 0;

        if (nextCreatedAt > currentCreatedAt) {
            map.set(key, product);
            return;
        }

        if (nextCreatedAt === currentCreatedAt) {
            const currentImages = Array.isArray(current.images) ? current.images.filter(Boolean).length : 0;
            const nextImages = Array.isArray(product.images) ? product.images.filter(Boolean).length : 0;
            if (nextImages > currentImages) {
                map.set(key, product);
            }
        }
    });

    return Array.from(map.values());
}

async function writeProducts(products) {
    const client = await getRedisClient();
    if (!client) {
        return;
    }
    await client.set('ghohary:products', JSON.stringify(products));
}

function sanitizeProductImageFields(product) {
    const sanitized = { ...product };
    const imageKeys = [
        'images',
        'image',
        'downloadUrl',
        'download_url',
        'image_url',
        'imageUrl',
        'imageSrc',
        'image_src',
        'main_image',
        'featured_image',
        'thumbnail',
        'thumb',
        'thumbnailUrl'
    ];

    imageKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(sanitized, key)) {
            return;
        }

        const value = sanitized[key];
        if (Array.isArray(value)) {
            sanitized[key] = value.filter((entry) => !BLOBSOURCE_URL_PATTERN.test(String(entry || '')));
        } else if (typeof value === 'string' && BLOBSOURCE_URL_PATTERN.test(value)) {
            sanitized[key] = '';
        }
    });

    return sanitized;
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
    if (missingEnv.length > 0) {
        res.status(500).json({
            error: 'Missing required environment variables',
            required: missingEnv,
            message: `Set ${missingEnv.join(', ')} in Vercel project settings, then redeploy.`
        });
        return;
    }

    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300');
        const products = await readProducts();
        const uniqueProducts = dedupeProductsById(products);
        res.status(200).json(uniqueProducts.map(sanitizeProductImageFields));
        return;
    }

    if (req.method === 'POST') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        const products = await readProducts();
        const body = parseBody(req);

        const newProduct = {
            id: Date.now(),
            ...body,
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        await writeProducts(products);
        res.status(200).json(sanitizeProductImageFields(newProduct));
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
