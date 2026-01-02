// GHOHARY Backend Server
// Handles products, users, appointments, and orders

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'server-db.json');

// Middleware
app.use(cors());
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

// Start server
initializeDB();
app.listen(PORT, () => {
    console.log(`\n🎀 GHOHARY Server running on http://localhost:${PORT}`);
    console.log(`📦 Database file: ${DB_FILE}`);
    console.log(`✅ API ready at http://localhost:${PORT}/api/\n`);
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
