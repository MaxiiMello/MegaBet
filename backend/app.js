const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const betsRoutes     = require('./routes/bets');
const myBetsRoutes   = require('./routes/myBets');
const tribunalRoutes = require('./routes/tribunal');


const app = express();

// ── Middlewares globales ────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' })); // Puerto de Vite
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rutas de la API ─────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/bets',     betsRoutes);
app.use('/api/my-bets',  myBetsRoutes);
app.use('/api/tribunal', tribunalRoutes);


// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.path} no encontrada.` });
});

// ── Error handler global ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;
