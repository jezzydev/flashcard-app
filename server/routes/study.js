import express from 'express';
import { isValidDeckId } from '../utils/deckValidation.js';
import {
    isValidStudySessionId,
    isValidCardRating,
} from '../utils/studyValidation.js';
import { isValidCardId } from '../utils/cardValidation.js';
import pool from '../db/pool.js';
import { ValidationError } from '../utils/errors.js';
import { calculateNextReview } from '../utils/sm2.js';

const router = express.Router();

//Submit a card review, update card schedule
router.post('/sessions/:id/review', async (req, res, next) => {
    try {
        const sessionId = req.params.id;
        const review = req.body;
        isValidStudySessionId(sessionId);
        isValidCardId(review.card_id);
        isValidCardRating(review.rating);

        const cardResult = await pool.query(
            'SELECT * FROM cards WHERE id = $1;',
            [review.card_id],
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ message: 'Card not found.' });
        }

        cardResult.rows[0].ease_factor = Number(cardResult.rows[0].ease_factor);
        const card = calculateNextReview(cardResult.rows[0], review.rating);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(
                'INSERT INTO session_reviews (session_id, card_id, rating) VALUES ($1, $2, $3);',
                [sessionId, review.card_id, review.rating],
            );

            await client.query(
                `UPDATE study_sessions 
                SET cards_reviewed = cards_reviewed + 1,
                cards_correct = cards_correct + $2
                WHERE id = $1`,
                [sessionId, review.rating >= 3 ? 1 : 0],
            );

            await client.query(
                `UPDATE cards 
                SET interval = $1, 
                    ease_factor = $2, 
                    repetitions = $3, 
                    due_date = $4 
                WHERE id = $5;`,
                [
                    card.interval,
                    card.ease_factor,
                    card.repetitions,
                    card.due_date,
                    review.card_id,
                ],
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            await client.release();
        }

        res.status(201).json({ message: 'Card review submitted.' });
    } catch (error) {
        next(error);
    }
});

//Start a new study session
router.post('/sessions', async (req, res, next) => {
    try {
        const userId = req.user.sub;
        const studySession = req.body;
        isValidDeckId(studySession.deck_id);

        const result = await pool.query(
            'INSERT INTO study_sessions (user_id, deck_id) VALUES ($1, $2) RETURNING *;',
            [userId, studySession.deck_id],
        );

        res.status(201).json({
            message: 'New study session created.',
            study_session: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

//Mark session as complete
router.put('/sessions/:id/complete', async (req, res, next) => {
    try {
        const userId = req.user.sub;
        const sessionId = req.params.id;
        isValidStudySessionId(sessionId);

        const result = await pool.query(
            `WITH reviews AS (SELECT session_id, count(*) as cards_reviewed, 
                    COUNT(*) FILTER(WHERE rating >= 3) as cards_correct
                    FROM session_reviews 
                    WHERE session_id = $2 
                    GROUP BY session_id)
            UPDATE study_sessions ss
            SET completed_at = $1,
                cards_reviewed = sr.cards_reviewed,
                cards_correct = sr.cards_correct 
            FROM reviews sr
            WHERE ss.id = $2 
            AND ss.id = sr.session_id RETURNING *;`,
            [new Date(), sessionId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Study session not found.',
            });
        }

        res.json({
            message: 'Study session completed.',
            study_session: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

export default router;
