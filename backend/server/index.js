const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve frontend path
const frontendPath = path.resolve(__dirname, '../../frontend/public');

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// 1. Serve static files FIRST (images, CSS, JS)
app.use(express.static(frontendPath));

// 2. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// 3. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running', env: process.env.NODE_ENV });
});

// 4. Serve the main index.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 5. Catch-all for any other frontend routing (Must be last)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

const db = require('./db');

const startServer = async (port) => {
    try {
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server launched on port ${port}`);

            // Check DB connection
            db.execute('SELECT 1')
                .then(() => console.log('✅ MySQL Database Connected'))
                .catch(err => console.error('❌ DB Connection Error:', err.message));
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer(PORT);
