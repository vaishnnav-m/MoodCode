import cors from 'cors';

const allowedOrigins = new Set([
  'http://localhost:5173',
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
