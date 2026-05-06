import express from 'express';
import pool from '../db/pool.js';
import { isValidDeck, isValidDeckId } from '../utils/deckValidation.js';

const router = express.Router();

//Get all decks for authenticated user
router.get('/', async (req, res, next) => {
    try {
        const user = req.user;
        const result = await pool.query(
            'SELECT id, name, description, created_at FROM decks WHERE user_id = $1 ORDER BY created_at, id;',
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

//Get single deck with card count and due count
router.get('/:id', async (req, res, next) => {
    try {
        const deckId = req.params.id;
        const user = req.user;
        const result = await pool.query(
            `SELECT d.id, d.name, d.description, d.created_at, count(c.id) as card_count, count(c.id) FILTER (WHERE c.due_date <= now()) as due_count 
            FROM decks d 
            INNER JOIN cards c ON d.id = c.deck_id 
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
        isValidDeck(deck);

        const result = await pool.query(
            `UPDATE decks 
            SET name = $1, 
            description = $2 
            WHERE id = $3 
            RETURNING *;`,
            [deck.name, deck.description, deckId],
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
