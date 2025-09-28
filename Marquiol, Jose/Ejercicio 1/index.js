// Ejercicio 1 - index.js
require('dotenv').config();
const express = require('express');
const rectanglesRouter = require('./routes/rectangles');

const app = express();
app.use(express.json());
app.use('/rectangles', rectanglesRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Ejercicio 1 - Rectangles API running on port ${PORT}`));
