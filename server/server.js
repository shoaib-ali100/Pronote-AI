const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { initializeDatabase, checkConnection, getLastError } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[API Log] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend files from the root directory
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// API Routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = checkConnection();
  res.json({
    status: isDbConnected ? 'healthy' : 'degraded',
    service: 'Pronote AI Backend',
    timestamp: new Date().toISOString(),
    database: {
      type: 'MySQL',
      connected: isDbConnected,
      error: isDbConnected ? null : getLastError(),
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'pronote_ai'
    }
  });
});

// Reconnect to MySQL endpoint (e.g. after updating .env)
app.post('/api/db/reconnect', async (req, res) => {
  const pool = await initializeDatabase();
  const connected = checkConnection();
  res.json({
    success: connected,
    message: connected ? 'Connected to MySQL successfully!' : 'Failed to connect to MySQL.',
    error: getLastError()
  });
});

// Fallback for root route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.'
  });
});

// Start listening immediately
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`[Pronote AI Server] Running on http://localhost:${PORT}`);
  console.log(`[Frontend]   http://localhost:${PORT}/index.html`);
  console.log(`[Signup]     http://localhost:${PORT}/signup.html`);
  console.log(`[Dashboard]  http://localhost:${PORT}/dashboard.html`);
  console.log(`[Health API] http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Attempt initial MySQL connection
  await initializeDatabase();
});
