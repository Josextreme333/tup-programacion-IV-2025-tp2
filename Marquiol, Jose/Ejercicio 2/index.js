require('dotenv').config();
const express = require('express');
const tasksRouter = require('./routes/tasks');
const app = express();
app.use(express.json());
app.use('/tasks', tasksRouter);
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Ejercicio 2 - Tasks API running on port ${PORT}`));
