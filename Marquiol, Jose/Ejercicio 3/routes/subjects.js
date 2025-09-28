const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

router.post('/',
  [ body('name').trim().notEmpty().withMessage('name required') ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const name = req.body.name.trim();
      const [exists] = await pool.query('SELECT id FROM subjects WHERE name = ?', [name]);
      if (exists.length > 0) return res.status(409).json({ message: 'Subject exists' });
      const [result] = await pool.query('INSERT INTO subjects (name) VALUES (?)', [name]);
      const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
  }
);

module.exports = router;
