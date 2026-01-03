const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { lineItems, customerName, email, amount } = req.body || {};

        if (!Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({ error: 'Line items required' });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe secret key not configured' });
        }

        const origin = req.headers.origin || 'https://mohsenghohary.net';
        const formattedItems = lineItems.map(item => ({
            price_data: {
                currency: 'aed',
                product_data: {
                    name: item.name || 'GHOHARY Item',
                    images: item.image ? [item.image] : []
                },
                unit_amount: Math.max(1, Number(item.amount || 0))
            },
            quantity: Math.max(1, Number(item.quantity || 1))
        }));

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: formattedItems,
            customer_email: email,
            success_url: `${origin}/account.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout.html?canceled=true`,
            metadata: {
                customerName: customerName || '',
                email: email || '',
                amount: amount || ''
            }
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Checkout Session Error:', error);
        res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
}
