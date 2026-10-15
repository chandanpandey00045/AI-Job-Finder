import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { startBackgroundScheduler } from './services/scheduler.js';
import { profileRouter } from './routes/profileRoutes.js';
import { jobRouter } from './routes/jobRoutes.js';
import { applicationRouter } from './routes/applicationRoutes.js';
import { sourceRouter } from './routes/sourceRoutes.js';
import { scheduleRouter } from './routes/scheduleRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize persistent SQLite database & seed data
initDatabase();

// Mount API routes
app.use('/api/profile', profileRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/sources', sourceRouter);
app.use('/api', scheduleRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: 'SQLite (WAL mode)',
    uptime: process.uptime()
  });
});

// Start background scheduler if enabled
if (config.autoSearchEnabled) {
  startBackgroundScheduler(config.defaultSearchIntervalHours);
}

const server = app.listen(config.port, config.host, () => {
  console.log(`[Backend] AI Job Finder server running at http://${config.host}:${config.port}`);
});

export { app, server };
