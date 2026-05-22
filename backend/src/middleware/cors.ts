import cors from 'cors';

const allwedorigins = process.env.CORS_ORIGIN || 'http://localhost:5173';

const allowedOrigins = new Set([
  allwedorigins,
  'http://127.0.0.1:5173',
]);

/** Dashboard at localhost:5173; extension host requests often omit Origin. */
export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id'],
});
