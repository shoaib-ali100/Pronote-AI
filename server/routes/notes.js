const express = require('express');
const { getPool, checkConnection } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { generateSoapNote } = require('../services/aiService');

const router = express.Router();

// ── POST /api/notes/generate ───────────────────────────────────
// Generates a structured clinical SOAP note from transcript
router.post('/generate', async (req, res) => {
  try {
    const { transcript, patientName, specialty, visitType } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Transcript or consultation dialogue is required to generate a note.'
      });
    }

    const note = await generateSoapNote({
      transcript,
      patientName: patientName || 'Patient',
      specialty: specialty || 'General Medicine',
      visitType: visitType || 'Consultation'
    });

    return res.json({
      success: true,
      note
    });
  } catch (err) {
    console.error('[Notes Error - Generate]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate clinical note.'
    });
  }
});

// ── GET /api/notes ─────────────────────────────────────────────
// List all saved clinical notes for authenticated doctor
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({
        success: false,
        error: 'Database service is currently unavailable. Please verify MySQL.'
      });
    }

    const [notes] = await pool.query(
      `SELECT id, patient_name, visit_type, specialty, subjective, objective, assessment, plan, created_at 
       FROM notes 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (err) {
    console.error('[Notes Error - List]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve clinical notes.'
    });
  }
});

// ── POST /api/notes ────────────────────────────────────────────
// Save a newly generated note for the doctor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientName,
      visitType = 'General Consultation',
      rawTranscript = '',
      subjective = '',
      objective = '',
      assessment = '',
      plan = '',
      specialty = ''
    } = req.body;

    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ success: false, error: 'Patient name is required.' });
    }

    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({
        success: false,
        error: 'Database service is currently unavailable.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO notes (user_id, patient_name, visit_type, raw_transcript, subjective, objective, assessment, plan, specialty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        patientName.trim(),
        visitType,
        rawTranscript,
        subjective,
        objective,
        assessment,
        plan,
        specialty || req.user.specialty || 'General Medicine'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Clinical note saved successfully.',
      noteId: result.insertId
    });
  } catch (err) {
    console.error('[Notes Error - Save]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save clinical note.'
    });
  }
});

// ── GET /api/notes/:id ─────────────────────────────────────────
// Fetch single note by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({ success: false, error: 'Database service unavailable.' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Clinical note not found.' });
    }

    return res.json({
      success: true,
      note: rows[0]
    });
  } catch (err) {
    console.error('[Notes Error - Get Single]:', err);
    return res.status(500).json({ success: false, error: 'Error fetching note.' });
  }
});

// ── DELETE /api/notes/:id ──────────────────────────────────────
// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool || !checkConnection()) {
      return res.status(503).json({ success: false, error: 'Database service unavailable.' });
    }

    const [result] = await pool.query(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Note not found or unauthorized.' });
    }

    return res.json({
      success: true,
      message: 'Clinical note deleted successfully.'
    });
  } catch (err) {
    console.error('[Notes Error - Delete]:', err);
    return res.status(500).json({ success: false, error: 'Error deleting note.' });
  }
});

module.exports = router;
