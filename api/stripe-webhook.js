const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { readCollection, writeCollection } = require('./_utils/json-store');

const ORDERS_STORE_KEY = 'ghohary:orders';

async function readOrders() {
    const payload = await readCollection(ORDERS_STORE_KEY, { collectionKeys: ['orders'] });
    return Array.isArray(payload) ? payload : [];
}

async function writeOrders(orders) {
    await writeCollection(ORDERS_STORE_KEY, orders, { collectionKey: 'orders' });
}

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
        const rawBody = Buffer.concat(chunks);
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const orders = await readOrders();
            const idx = orders.findIndex(o => o.paymentIntentId === paymentIntent.id);
            if (idx !== -1) {
                orders[idx].orderStatus = 'paid';
                orders[idx].paidAt = new Date().toISOString();
                await writeOrders(orders);
            }
        }

        res.json({ received: true });
    });
}
