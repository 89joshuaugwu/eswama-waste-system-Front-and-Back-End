require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const taskRoutes = require('./routes/taskRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const initSockets = require('./sockets');

const app = express();
const server = http.createServer(app);

const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigin === '*' ? '*' : rawOrigin.includes(',') ? rawOrigin.split(',').map(s => s.trim()) : rawOrigin;

const io = new Server(server, {
  cors: {
    origin: allowedOrigins === '*' ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

app.set('io', io);

app.use(helmet());
app.use(cors({
  origin: allowedOrigins === '*' ? true : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'eswama-waste-system-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Central error handler (catches anything thrown synchronously in routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

initSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`ESWAMA waste system API listening on port ${PORT}`);
});

module.exports = { app, server, io };
