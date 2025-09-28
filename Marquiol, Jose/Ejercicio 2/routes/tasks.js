const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../db');
const router = express.Router();

// Listar (con filtro ?completed=true|false)
router.get('/', [query('completed').optional().isBoolean()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    let sql = 'SELECT * FROM tasks';
    const params = [];
    if (req.query.completed !== undefined) {
      const completed = req.query.completed === 'true' || req.query.completed === true;
      sql += ' WHERE completed = ?';
      params.push(completed ? 1 : 0);
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

// Obtener uno
router.get('/:id', [param('id').isInt().toInt()], async (req, res) => {
  // similar a arriba
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

// Crear (verificar no duplicados por nombre)
router.post('/',
  [ body('name').trim().notEmpty().withMessage('name requerido'), body('completed').optional().isBoolean() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const name = req.body.name.trim();
    const completed = req.body.completed ? 1 : 0;
    try {
      // Verificar existencia
      const [exists] = await pool.query('SELECT id FROM tasks WHERE name = ?', [name]);
      if (exists.length > 0) return res.status(409).json({ message: 'Task with same name already exists' });
      const [result] = await pool.query('INSERT INTO tasks (name, completed) VALUES (?, ?)', [name, completed]);
      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
  }
);

// Actualizar
router.put('/:id',
  [ param('id').isInt().toInt(), body('name').optional().trim().notEmpty(), body('completed').optional().isBoolean() ],
  async (req, res) => {
    const id = req.params.id;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      // Si cambia nombre, verificar duplicado (excepto si es el mismo registro)
      if (req.body.name) {
        const [dup] = await pool.query('SELECT id FROM tasks WHERE name = ? AND id != ?', [req.body.name, id]);
        if (dup.length > 0) return res.status(409).json({ message: 'Task with same name already exists' });
      }
      const [current] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      if (current.length === 0) return res.status(404).json({ message: 'Not found' });
      const name = req.body.name ?? current[0].name;
      const completed = req.body.completed !== undefined ? (req.body.completed ? 1 : 0) : current[0].completed;
      await pool.query('UPDATE tasks SET name = ?, completed = ? WHERE id = ?', [name, completed, id]);
      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
  }
);

// Borrar
router.delete('/:id', [param('id').isInt().toInt()], async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

module.exports = router;
