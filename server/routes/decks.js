import express from 'express';
import pool from '../db/pool.js';
import { isValidDeck, isValidDeckId } from '../utils/deckValidation.js';
import { isValidCard } from '../utils/cardValidation.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

//Get all decks for authenticated user
router.get('/', async (req, res, next) => {
    try {
        const user = req.user;
        const result = await pool.query(
            `SELECT id, name, description, created_at 
            FROM decks 
            WHERE user_id = $1 
            ORDER BY created_at, id;`,
            [user.sub],
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

//Get all cards in a deck
router.get('/:id/cards', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        isValidDeckId(deckId);

        const result = await pool.query(
            `SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at, id;`,
            [deckId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Deck not found.' });
        }

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

//Get due cards for a study session (max 20)
router.get('/:id/study', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        isValidDeckId(deckId);

        const result = await pool.query(
            `SELECT * FROM cards 
            WHERE deck_id = $1
            AND due_date <= now() 
            ORDER BY due_date, created_at
            LIMIT 20;`,
            [deckId],
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

//Get deck stats: total cards, due today, retention rate, streak
router.get('/:id/stats', async (req, res, next) => {
    try {
        const user = req.user;
        const deckId = req.params.id;
        isValidDeckId(deckId);

        const cardResult = await pool.query(
            `SELECT count(distinct c.id) as total_cards, 
                COUNT(distinct c.id) FILTER(WHERE c.due_date <= now()) as due_today,
                COUNT(rvw.id) FILTER (WHERE rating >= 3) * 100.0 / NULLIF(COUNT(rvw.id), 0) AS retention_rate
            FROM cards c
            LEFT JOIN session_reviews rvw ON c.id = rvw.card_id
            WHERE c.deck_id = $1
            GROUP BY c.deck_id; `,
            [deckId],
        );

        if (cardResult.rows.length === 0) {
            return res.status(400).json({ message: 'Deck not found.' });
        }

        const streakResult = await pool.query(
            `SELECT distinct DATE(started_at) as study_date
            FROM study_sessions 
            WHERE deck_id = $1 
            AND user_id = $2
            ORDER BY study_date DESC;`,
            [deckId, user.sub],
        );

        const isSameDay = (d1, d2) => {
            return (
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate()
            );
        };

        let streak = 0;
        if (streakResult.rows.length > 0) {
            const studyDates = streakResult.rows;
            let anchor = new Date();

            if (!isSameDay(new Date(studyDates[0].study_date), anchor)) {
                anchor.setDate(anchor.getDate() - 1); //set anchor to yesterday if user has not yet studied today
            }

            for (let i = 0; i <= studyDates.length - 1; i++) {
                if (isSameDay(new Date(studyDates[i].study_date), anchor)) {
                    streak++;
                    anchor.setDate(anchor.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        res.json({
            stats: {
                total_cards: cardResult.rows[0].total_cards,
                due_today: cardResult.rows[0].due_today,
                retention_rate: Number(
                    cardResult.rows[0].retention_rate,
                ).toFixed(2),
            },
            streak: streak,
        });
    } catch (error) {
        next(error);
    }
});

//Get single deck with card count and due count
router.get('/:id', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        isValidDeckId(deckId);

        const result = await pool.query(
            `SELECT d.id, d.name, d.description, d.created_at, count(c.id) as card_count, count(c.id) FILTER (WHERE c.due_date <= now()) as due_count 
            FROM decks d 
            LEFT JOIN cards c ON d.id = c.deck_id 
            WHERE d.id = $1 
            GROUP BY d.id;`,
            [deckId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Deck not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

//Add a card to a deck
router.post('/:id/cards', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        const card = req.body;
        isValidDeckId(deckId);
        isValidCard(card);

        const result = await pool.query(
            `INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *;`,
            [deckId, card.front, card.back],
        );

        res.status(201).json({
            message: 'New card created.',
            card: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

//Create a new deck
router.post('/', async (req, res, next) => {
    try {
        const deck = req.body;
        if (deck.description === undefined) {
            deck.description = null;
        }

        isValidDeck(deck);

        const result = await pool.query(
            `INSERT INTO decks (user_id, name, description) 
            VALUES ($1, $2, $3) RETURNING *;`,
            [req.user.sub, deck.name, deck.description],
        );

        res.status(201).json({
            message: 'New deck created.',
            deck: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

//Update deck's name or description
router.put('/:id', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        const deck = req.body;
        isValidDeckId(deckId);
        isValidDeck(deck, false);

        const columns = Object.keys(deck);
        const values = Object.values(deck);

        if (columns.length === 0) {
            return res.json({ message: 'Nothing to update.' });
        }

        const setClause = columns
            .map((col, i) => `${col} = $${i + 2}`)
            .join(', ');
        const result = await pool.query(
            `UPDATE decks 
            SET ${setClause}
            WHERE id = $1 
            RETURNING *;`,
            [deckId, ...values],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Deck not found.',
            });
        }

        res.json({ message: 'Deck updated.', deck: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

//Delete deck and all its cards
router.delete('/:id', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        isValidDeckId(deckId);

        const result = await pool.query(
            `DELETE FROM decks WHERE id = $1 RETURNING *;`,
            [deckId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Deck not found.',
            });
        }

        res.json({ mesage: 'Deck deleted.', deck: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

export default router;
