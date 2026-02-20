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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});


const db = require('./db');

const startServer = async (port, retries = 0) => {
    try {
        const server = app.listen(port, async () => {
            console.log(`Server running on http://localhost:${port}`);
            try {
                await db.execute('SELECT 1');
                console.log('✅ Connected to MySQL Database successfully.');
            } catch (err) {
                console.error('❌ Database connection failed!');
                console.error('Error details:', err.message);
                console.log('Make sure XAMPP MySQL is running and the database "college_event_mgmt" exists.');
            }
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                if (retries < 3) {
                    console.log(`Port ${port} is in use, trying port ${port + 1}...`);
                    startServer(port + 1, retries + 1);
                } else {
                    console.error(`Unable to find an available port after ${retries} attempts.`);
                    process.exit(1);
                }
            } else {
                console.error('Server error:', err);
            }
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer(parseInt(PORT, 10) || 5000);
