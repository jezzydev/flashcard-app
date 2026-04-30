import express from 'express';
import path from 'path';

import authRoutes from './routes/auth.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import studyRoutes from './routes/study.js';

const app = express();

// Serve frontend static files
if (process.env.NODE_ENV === 'production')
    app.use(express.static(path.join(__dirname, '../dist')));
else app.use(express.static(path.join(__dirname, '../client')));

//API routes
app.use('/api/auth', authRoutes);
app.use('/api/deck', deckRoutes);
app.use('/api/card', cardRoutes);
app.use('/api/study', studyRoutes);

// Catch-all - send index.html for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});
