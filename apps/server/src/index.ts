import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/handlers';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import restaurantRoutes from './routes/restaurants';
import layoutRoutes from './routes/layouts';
import tableRoutes from './routes/tables';
import sectionRoutes from './routes/sections';
import shiftRoutes from './routes/shifts';
import analyticsRoutes from './routes/analytics';

const app = express();

// ---------- Global Middleware ----------
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

// ---------- Health Check ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/analytics', analyticsRoutes);

// ---------- Error Handler (must be last) ----------
app.use(errorHandler);

// ---------- HTTP + Socket.IO ----------
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketHandlers(io);

// ---------- Start Server ----------
httpServer.listen(env.PORT, () => {
  console.log(`[RFM Server] Running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[RFM Server] Client URL: ${env.CLIENT_URL}`);
});

export { app, httpServer, io };
