import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { connectDb } from './db.js';
import { corsMiddleware } from './middleware/cors.js';
import { configRouter } from './routes/config.js';
import { logsRouter } from './routes/logs.js';
import { authRouter } from './routes/auth.js';
import { createWebSocketServer } from './ws/server.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.use(corsMiddleware);
  app.use(express.json());

  app.use('/api/config', configRouter);
  app.use('/api/logs', logsRouter);
  app.use('/auth', authRouter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const httpServer = createServer(app);
  createWebSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`MoodCode backend listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
