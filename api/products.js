const { createClient } = require('redis');

const redisUrl = process.env.sghohary_REDIS_URL;
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
        res.status(500).json({ error: 'Redis not configured. Set sghohary_REDIS_URL in Vercel.' });
        return;
    }

    if (req.method === 'GET') {
        const products = await readProducts();
        res.status(200).json(products);
        return;
    }

    if (req.method === 'POST') {
        const products = await readProducts();
        const body = parseBody(req);

        const newProduct = {
            id: Date.now(),
            ...body,
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        await writeProducts(products);
        res.status(200).json(newProduct);
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
