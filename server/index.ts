import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import { testConnection } from './db/pool.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authenticateToken } from './middleware/authentication.js';
import authRoutes from './routes/auth.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import studyRoutes from './routes/study.js';

const app = express();
const PORT = process.env.APP_PORT || 3000;
const __dirname = import.meta.dirname;

app.use(express.json());
app.use(logger);
app.use(cookieParser());

testConnection().catch((err) => {
    console.log('Failed connecting to the database.', err);
    process.exit(1);
});

app.use(
    cors({
        origin: process.env.APP_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }),
);

//API routes
app.use('/api/auth', authRoutes);
app.use('/api/decks', authenticateToken, deckRoutes);
app.use('/api/cards', authenticateToken, cardRoutes);
app.use('/api/study', authenticateToken, studyRoutes);

// Catch-all for unknown API routes
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: 'Route not found.' });
});

// Serve frontend static files
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist/client')));

    // Catch-all - send index.html for any non-API route
    app.get('/{*path}', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../dist/client/index.html'));
    });
}

// Error handler
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server started at port ${PORT}`));
