const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Register for an event
router.post('/', authenticateToken, async (req, res) => {
    const { event_id } = req.body;
    const user_id = req.user.id;

    try {
        // 1. Check if already registered (Duplicate check)
        const [existing] = await db.execute(
            'SELECT * FROM registrations WHERE user_id = ? AND event_id = ?',
            [user_id, event_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You are already registered for this event.' });
        }

        // 2. Check event capacity and deadline
        const [eventData] = await db.execute('SELECT capacity, registration_deadline FROM events WHERE id = ?', [event_id]);
        if (eventData.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        // Check Deadline
        if (eventData[0].registration_deadline) {
            const deadline = new Date(eventData[0].registration_deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (today > deadline) {
                return res.status(400).json({ message: 'Registration deadline has passed for this event.' });
            }
        }

        const [regCount] = await db.execute('SELECT COUNT(*) as count FROM registrations WHERE event_id = ?', [event_id]);

        if (regCount[0].count >= eventData[0].capacity) {
            return res.status(400).json({ message: 'Event reached maximum capacity.' });
        }

        // 3. Register
        await db.execute('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)', [user_id, event_id]);
        res.status(201).json({ message: 'Registered successfully!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user registrations
router.get('/my-registrations', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.id as reg_id, r.registration_date, e.* 
            FROM registrations r 
            JOIN events e ON r.event_id = e.id 
            WHERE r.user_id = ?
            ORDER BY e.event_date ASC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cancel registration
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM registrations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Registration cancelled.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all registrations for an event (Admin only)
router.get('/event/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.id as reg_id, r.registration_date, u.fullname, u.email, u.faculty 
            FROM registrations r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.event_id = ?
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all registrations across all events (Admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.id as reg_id, r.registration_date, u.fullname as student_name, u.email, u.faculty, e.title as event_title
            FROM registrations r 
            JOIN users u ON r.user_id = u.id 
            JOIN events e ON r.event_id = e.id
            ORDER BY r.registration_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
