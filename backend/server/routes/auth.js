const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
require('dotenv').config();
const multer = require('multer');
const path = require('path');

// Multer Storage for Profile Pics
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../../frontend/public/uploads/profiles/'));
    },
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Register
router.post('/register', async (req, res) => {
    const { fullname, email, password, faculty } = req.body;
    const role = 'student';

    try {
        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (fullname, email, password, role, faculty) VALUES (?, ?, ?, ?, ?)',
            [fullname, email, hashedPassword, role, faculty]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.fullname },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.fullname,
                email: user.email,
                role: user.role,
                faculty: user.faculty,
                profile_pic: user.profile_pic ? `/uploads/profiles/${user.profile_pic}` : null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Current User Info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, fullname, email, role, faculty, profile_pic FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        res.json({
            ...user,
            profile_pic: user.profile_pic ? `/uploads/profiles/${user.profile_pic}` : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile
router.post('/update-profile', authenticateToken, upload.single('profile_pic'), async (req, res) => {
    const { fullname, faculty } = req.body;
    const userId = req.user.id;
    let query = 'UPDATE users SET fullname = ?, faculty = ?';
    let params = [fullname, faculty];

    if (req.file) {
        query += ', profile_pic = ?';
        params.push(req.file.filename);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    try {
        await db.execute(query, params);
        res.json({
            message: 'Profile updated successfully',
            profile_pic: req.file ? `/uploads/profiles/${req.file.filename}` : undefined
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all students (Admin only)
router.get('/students', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, fullname, email, faculty, created_at FROM users WHERE role = "student"');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset User Password (Admin only)
router.post('/reset-user-password/:userId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.userId]);
        res.json({ message: `Password reset to: ${defaultPassword}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
