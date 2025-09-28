// Ejercicio 1 - routes/rectangles.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool = require('../db');
const router = express.Router();

// Listar todos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rectangles ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Obtener uno
router.get('/:id', [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM rectangles WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

// Crear (recibe sólo lados, calcula perímetro y superficie)
router.post('/',
  [
    body('sideA').isFloat({ gt: 0 }).withMessage('sideA > 0'),
    body('sideB').isFloat({ gt: 0 }).withMessage('sideB > 0'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const sideA = parseFloat(req.body.sideA);
    const sideB = parseFloat(req.body.sideB);
    const perimeter = 2 * (sideA + sideB);
    const area = sideA * sideB;
    try {
      const [result] = await pool.query(
        'INSERT INTO rectangles (sideA, sideB, perimeter, area) VALUES (?, ?, ?, ?)',
        [sideA, sideB, perimeter, area]
      );
      const [rows] = await pool.query('SELECT * FROM rectangles WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'DB error' });
    }
  }
);

// Modificar lados (recalcula)
router.put('/:id',
  [
    param('id').isInt().toInt(),
    body('sideA').isFloat({ gt: 0 }).withMessage('sideA > 0'),
    body('sideB').isFloat({ gt: 0 }).withMessage('sideB > 0'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = req.params.id;
    const sideA = parseFloat(req.body.sideA);
    const sideB = parseFloat(req.body.sideB);
    const perimeter = 2 * (sideA + sideB);
    const area = sideA * sideB;
    try {
      const [result] = await pool.query(
        'UPDATE rectangles SET sideA = ?, sideB = ?, perimeter = ?, area = ? WHERE id = ?',
        [sideA, sideB, perimeter, area, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
      const [rows] = await pool.query('SELECT * FROM rectangles WHERE id = ?', [id]);
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'DB error' });
    }
  }
);

// Borrar
router.delete('/:id', [param('id').isInt().toInt()], async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM rectangles WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
