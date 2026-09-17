const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, checkConnection } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── POST /api/auth/signup ──────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, specialty, password } = req.body;

    // 1. Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || !isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!specialty || !specialty.trim()) {
      return res.status(400).json({ success: false, error: 'Specialty is required.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({
        success: false,
        error: 'Database service is currently unavailable. Please verify MySQL is running and check .env database credentials.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanSpecialty = specialty.trim();

    // 2. Check existing user
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert user
    const [insertResult] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, specialty) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, cleanSpecialty]
    );

    const userId = insertResult.insertId;

    // 5. Generate JWT
    const token = jwt.sign(
      { id: userId, email: cleanEmail, fullName: cleanName, specialty: cleanSpecialty },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        fullName: cleanName,
        email: cleanEmail,
        specialty: cleanSpecialty,
      }
    });

  } catch (err) {
    console.error('[Auth Error - Signup]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred during registration. Please try again.'
    });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Both email and password are required.'
      });
    }

    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({
        success: false,
        error: 'Database service is currently unavailable. Please check MySQL connection.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.full_name, specialty: user.specialty },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        specialty: user.specialty,
      }
    });

  } catch (err) {
    console.error('[Auth Error - Login]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.'
    });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.json({
        success: true,
        user: req.user
      });
    }

    const [rows] = await pool.query(
      'SELECT id, full_name, email, specialty, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const row = rows[0];
    return res.json({
      success: true,
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        specialty: row.specialty,
        createdAt: row.created_at
      }
    });

  } catch (err) {
    console.error('[Auth Error - Me]:', err);
    return res.status(500).json({ success: false, error: 'Server error retrieving user profile.' });
  }
});

// ── POST /api/auth/google ──────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, email, fullName } = req.body;

    let userEmail = email;
    let userName = fullName;

    // If Google ID token credential provided from Google Identity Services
    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userEmail = payload.email;
          userName = payload.name || payload.given_name || 'Google Clinician';
        }
      } catch (decodeErr) {
        console.warn('Could not decode Google credential JWT:', decodeErr);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Google email is required.' });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanName = (userName || cleanEmail.split('@')[0]).trim();

    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({ success: false, error: 'Database service is currently unavailable.' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);

    let userRecord = null;
    if (existing.length > 0) {
      userRecord = existing[0];
    } else {
      // Create new user with Google Auth
      const dummyPassword = await bcrypt.hash(`GOOGLE_AUTH_${Date.now()}`, 10);
      const [insertResult] = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, specialty) VALUES (?, ?, ?, ?)',
        [cleanName, cleanEmail, dummyPassword, 'General Medicine']
      );
      userRecord = {
        id: insertResult.insertId,
        full_name: cleanName,
        email: cleanEmail,
        specialty: 'General Medicine'
      };
    }

    // Generate JWT
    const token = jwt.sign(
      { id: userRecord.id, email: userRecord.email, fullName: userRecord.full_name, specialty: userRecord.specialty },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Google authentication successful.',
      token,
      user: {
        id: userRecord.id,
        fullName: userRecord.full_name,
        email: userRecord.email,
        specialty: userRecord.specialty
      }
    });

  } catch (err) {
    console.error('[Auth Error - Google]:', err);
    return res.status(500).json({ success: false, error: 'Google authentication failed.' });
  }
});

module.exports = router;

