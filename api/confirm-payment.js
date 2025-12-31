const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment Intent ID required' });
        }

        // Retrieve payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            res.status(200).json({
                success: true,
                orderNumber: `GH${Date.now().toString().slice(-8)}`,
                paymentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase()
            });
        } else if (paymentIntent.status === 'processing') {
            res.status(200).json({
                success: true,
                status: 'processing',
                message: 'Payment is being processed'
            });
        } else {
            res.status(400).json({
                success: false,
                status: paymentIntent.status,
                message: 'Payment could not be completed'
            });
        }
    } catch (error) {
        console.error('Confirm Payment Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to confirm payment'
        });
    }
}
