import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { setupSockets } from './sockets/index.js';
import { cleanupExpiredDuels } from './controllers/duelsController.js';

import authRoutes from './routes/authRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import duelRoutes from './routes/duelRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';

// Always load the backend's own configuration, even when an IDE starts Node
// from the repository root instead of the server directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const result = dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

console.log('DOTENV RESULT:', result.error || 'Loaded successfully');

console.log('SMTP STATUS:', {
  host: Boolean(process.env.SMTP_HOST),
  user: Boolean(process.env.SMTP_USER),
  pass: Boolean(process.env.SMTP_PASS),
  port: process.env.SMTP_PORT || 'Missing'
});

const missingSmtpSettings = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((name) => !process.env[name]);
if (missingSmtpSettings.length) {
  console.warn(`[Config] Email OTP is disabled. Missing: ${missingSmtpSettings.join(', ')}`);
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io to app so route handlers can emit socket events
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'CodeClash MERN Competitive Coding & Interview Platform',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/interview', interviewRoutes);

// Setup WebSockets
setupSockets(io);

// Background timer: Check for expired waiting duels every 15 seconds
setInterval(() => {
  cleanupExpiredDuels(io);
}, 15000);

const PORT = process.env.PORT || 5000;

// Start Server
async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CodeClash MERN Backend Running on port ${PORT}`);
    console.log(`📡 WebSocket server initialized with WebRTC signaling`);
    console.log(`⚔️ 1v1 Betting Duel Engine Ready`);
    console.log(`💻 LeetCode Code Execution Sandbox Ready`);
    console.log(`🎙️ Online Mock Interview Platform Ready`);
    console.log(`====================================================`);
  });
}

start();
