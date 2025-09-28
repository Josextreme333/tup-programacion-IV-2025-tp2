const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../db');
const router = express.Router();

// Listar estudiantes (opcional ?subject_id=)
router.get('/', [ query('subject_id').optional().isInt().toInt() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (req.query.subject_id) {
      const [rows] = await pool.query('SELECT s.*, sub.name as subject_name FROM students s JOIN subjects sub ON s.subject_id = sub.id WHERE subject_id = ?', [req.query.subject_id]);
      return res.json(rows);
    }
    const [rows] = await pool.query('SELECT s.*, sub.name as subject_name FROM students s JOIN subjects sub ON s.subject_id = sub.id');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Obtener uno
router.get('/:id', [ param('id').isInt().toInt() ], async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT s.*, sub.name as subject_name FROM students s JOIN subjects sub ON s.subject_id = sub.id WHERE s.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

// Crear (verificar no repetir alumno en misma materia)
router.post('/',
  [
    body('student_name').trim().notEmpty(),
    body('subject_id').isInt().toInt(),
    body('note1').isFloat({ min: 0, max: 10 }),
    body('note2').isFloat({ min: 0, max: 10 }),
    body('note3').isFloat({ min: 0, max: 10 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { student_name, subject_id, note1, note2, note3 } = req.body;
    try {
      // verificar materia existe
      const [sub] = await pool.query('SELECT id FROM subjects WHERE id = ?', [subject_id]);
      if (sub.length === 0) return res.status(400).json({ message: 'Subject not found' });
      // verificar duplicado
      const [dup] = await pool.query('SELECT id FROM students WHERE student_name = ? AND subject_id = ?', [student_name, subject_id]);
      if (dup.length > 0) return res.status(409).json({ message: 'Student already exists for this subject' });
      const [result] = await pool.query('INSERT INTO students (student_name, subject_id, note1, note2, note3) VALUES (?, ?, ?, ?, ?)', [student_name, subject_id, note1, note2, note3]);
      const [rows] = await pool.query('SELECT s.*, sub.name as subject_name FROM students s JOIN subjects sub ON s.subject_id = sub.id WHERE s.id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
  }
);

// Actualizar (verificar duplicados si cambia nombre o materia)
router.put('/:id',
  [
    param('id').isInt().toInt(),
    body('student_name').optional().trim().notEmpty(),
    body('subject_id').optional().isInt().toInt(),
    body('note1').optional().isFloat({ min: 0, max: 10 }),
    body('note2').optional().isFloat({ min: 0, max: 10 }),
    body('note3').optional().isFloat({ min: 0, max: 10 })
  ],
  async (req, res) => {
    const id = req.params.id;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const [current] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
      if (current.length === 0) return res.status(404).json({ message: 'Not found' });
      const curr = current[0];
      const student_name = req.body.student_name ?? curr.student_name;
      const subject_id = req.body.subject_id ?? curr.subject_id;
      const note1 = req.body.note1 ?? curr.note1;
      const note2 = req.body.note2 ?? curr.note2;
      const note3 = req.body.note3 ?? curr.note3;
      // verificar duplicado (excepto si es el mismo id)
      const [dup] = await pool.query('SELECT id FROM students WHERE student_name = ? AND subject_id = ? AND id != ?', [student_name, subject_id, id]);
      if (dup.length > 0) return res.status(409).json({ message: 'Student already exists for this subject' });
      await pool.query('UPDATE students SET student_name = ?, subject_id = ?, note1 = ?, note2 = ?, note3 = ? WHERE id = ?', [student_name, subject_id, note1, note2, note3, id]);
      const [rows] = await pool.query('SELECT s.*, sub.name as subject_name FROM students s JOIN subjects sub ON s.subject_id = sub.id WHERE s.id = ?', [id]);
      res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
  }
);

router.delete('/:id', [ param('id').isInt().toInt() ], async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

module.exports = router;
