const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage for Event Thumbnails
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'college-events/thumbnails',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    }
});

const upload = multer({ storage: storage });

// Get all events
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT e.*, u.fullname as organizer,
            (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as registered_count
            FROM events e 
            LEFT JOIN users u ON e.created_by = u.id 
            ORDER BY e.event_date ASC, e.event_time ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create event (Admin only)
router.post('/', authenticateToken, isAdmin, upload.single('thumbnail'), async (req, res) => {
    const { title, description, event_date, event_time, location, capacity, registration_deadline } = req.body;
    const image_url = req.file ? req.file.path : 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

    try {
        const [conflicts] = await db.execute(
            'SELECT * FROM events WHERE location = ? AND event_date = ? AND event_time = ?',
            [location, event_date, event_time]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ message: 'Event conflict!' });
        }

        await db.execute(
            'INSERT INTO events (title, description, event_date, event_time, location, capacity, image_url, registration_deadline, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, event_date, event_time, location, capacity, image_url, registration_deadline, req.user.id]
        );

        res.status(201).json({ message: 'Event created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update event (Admin only)
router.put('/:id', authenticateToken, isAdmin, upload.single('thumbnail'), async (req, res) => {
    const { title, description, event_date, event_time, location, capacity, registration_deadline } = req.body;
    const { id } = req.params;

    try {
        // Find existing event to keep old image if no new one uploaded
        const [existing] = await db.execute('SELECT image_url FROM events WHERE id = ?', [id]);
        let image_url = existing[0].image_url;

        if (req.file) {
            image_url = req.file.path;
        }

        const [conflicts] = await db.execute(
            'SELECT * FROM events WHERE location = ? AND event_date = ? AND event_time = ? AND id != ?',
            [location, event_date, event_time, id]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ message: 'Event conflict!' });
        }

        await db.execute(
            'UPDATE events SET title=?, description=?, event_date=?, event_time=?, location=?, capacity=?, image_url=?, registration_deadline=? WHERE id=?',
            [title, description, event_date, event_time, location, capacity, image_url, registration_deadline, id]
        );

        res.json({ message: 'Event updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete event (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// End event (Admin only)
router.patch('/:id/end', authenticateToken, isAdmin, async (req, res) => {
    try {
        await db.execute('UPDATE events SET status = ? WHERE id = ?', ['ended', req.params.id]);
        res.json({ message: 'Event ended successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
