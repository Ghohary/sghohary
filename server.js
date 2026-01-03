// GHOHARY Backend Server
// Handles products, users, appointments, and orders

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'server-db.json');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8000';

// Middleware
const corsOptions = {
    origin: [
        'http://localhost:8000',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://192.168.0.186:8000',
        'http://192.168.0.186:3001',
        'https://mohsenghohary.net',
        'https://www.mohsenghohary.net'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Initialize database
function initializeDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            products: [],
            users: [],
            appointments: [],
            orders: [],
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('[DB] Initialized new database');
    }
}

// Read database
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[DB] Error reading:', err);
        return { products: [], users: [], appointments: [], orders: [], lastUpdated: new Date().toISOString() };
    }
}

// Write database
function writeDB(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[DB] Error writing:', err);
    }
}

// ===== PRODUCTS API =====
app.get('/api/products', (req, res) => {
    const db = readDB();
    res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
    const db = readDB();
    const product = db.products.find(p => p.id == req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.post('/api/products', (req, res) => {
    const db = readDB();
    const newProduct = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    db.products.push(newProduct);
    writeDB(db);
    res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const db = readDB();
    const index = db.products.findIndex(p => p.id == req.params.id);
    if (index !== -1) {
        db.products[index] = { ...db.products[index], ...req.body };
        writeDB(db);
        res.json(db.products[index]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const db = readDB();
    const index = db.products.findIndex(p => p.id == req.params.id);
    if (index !== -1) {
        const deleted = db.products.splice(index, 1);
        writeDB(db);
        res.json(deleted[0]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== STRIPE CHECKOUT SESSION =====
// Create a Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { lineItems, customerName, email, amount } = req.body;

        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Convert line items to Stripe format
        const sessionLineItems = lineItems.map(item => ({
            price_data: {
                currency: 'aed',
                product_data: {
                    name: item.name || 'GHOHARY Item',
                    images: item.image ? [item.image] : [],
                    description: `Size: ${item.size || 'One Size'}`
                },
                unit_amount: Math.round(item.amount) // Already in cents
            },
            quantity: item.quantity || 1
        }));

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            client_reference_id: `${Date.now()}`,
            line_items: sessionLineItems,
            success_url: `${FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/cancel.html`,
            metadata: {
                customerName,
                totalAmount: amount
            }
        });

        // Save pending order to database
        const db = readDB();
        db.orders = db.orders || [];
        db.orders.push({
            id: session.id,
            email,
            customerName,
            amount,
            status: 'pending',
            items: lineItems,
            createdAt: new Date().toISOString()
        });
        writeDB(db);

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('❌ Stripe Session Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to create checkout session'
        });
    }
});

// Start server
initializeDB();
app.listen(PORT, () => {
    console.log(`\n🎀 GHOHARY Server running on http://localhost:${PORT}`);
    console.log(`📦 Database file: ${DB_FILE}`);
    console.log(`✅ API ready at http://localhost:${PORT}/api/`);
    console.log(`💳 Stripe Checkout Session endpoint: POST /api/create-checkout-session\n`);
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

        // Handle checkout session completion
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            console.log('✅ Checkout session completed:', session.id);
            
            // Update order status to completed
            const db = readDB();
            const orderIndex = db.orders.findIndex(o => o.id === session.id);
            if (orderIndex !== -1) {
                db.orders[orderIndex].status = 'completed';
                db.orders[orderIndex].completedAt = new Date().toISOString();
                writeDB(db);
            }
        }

        // Handle payment intent succeeded
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            console.log('✅ Payment succeeded:', paymentIntent.id);
        }

        // Handle payment failure
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            console.log('❌ Payment failed:', paymentIntent.id);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
