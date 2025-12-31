// Stripe Payment Processing Server
// This server handles payment intent creation and webhook processing

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

const PORT = process.env.PORT || 5000;

// Endpoint to create a payment intent
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'aed', metadata = {} } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in cents
            currency: currency.toLowerCase(),
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Payment Intent Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to create payment intent'
        });
    }
});

// Endpoint to confirm payment (for additional validation)
app.post('/confirm-payment', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment Intent ID required' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.json({
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Confirmation Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to confirm payment'
        });
    }
});

// Webhook endpoint for payment events
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Handle payment success
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            console.log('✅ Payment succeeded:', paymentIntent.id);
            
            // Here you would:
            // 1. Save order to database
            // 2. Send confirmation email
            // 3. Update inventory
            // 4. Create shipping label
        }

        // Handle payment failure
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            console.log('❌ Payment failed:', paymentIntent.id);
            
            // Here you would:
            // 1. Notify customer of failed payment
            // 2. Save failed attempt
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server running', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stripe Payment Server running on http://localhost:${PORT}`);
    console.log(`💳 Ready to process payments with Stripe`);
});
