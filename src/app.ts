import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';

/**
 * Configure and assemble the main Express application.
 *
 * Attaches initial global middleware, hooks up routed domain controllers,
 * and ends the flow with a fallback unexpected server error handler.
 */
const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (_, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

//global error handler
app.use((err: any, req: Request, res: Response, _: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

export default app;
