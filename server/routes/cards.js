import express from 'express';
import { isValidCardId, isValidCard } from '../utils/cardValidation.js';
import pool from '../db/pool.js';

const router = express.Router();

//Update card's front or back text
router.put('/:id', async (req, res, next) => {
    try {
        const cardId = req.params.id;
        const card = req.body;
        isValidCardId(cardId);
        isValidCard(card);

        const result = await pool.query(
            `UPDATE cards c
            SET front = $3, 
                back = $4 
            FROM decks d
            WHERE c.id = $1 
            AND c.deck_id = d.id 
            AND d.user_id = $2
            RETURNING *;`,
            [cardId, req.user.sub, card.front, card.back],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Deck not found.',
            });
        }

        res.json({ message: 'Card updated.', deck: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

//Delete a card
router.delete('/:id', async (req, res, next) => {
    try {
        const cardId = req.params.id;
        isValidCardId(cardId);

        const result = await pool.query(
            `DELETE FROM cards c 
            USING decks d 
            WHERE c.id = $1 
            AND c.deck_id = d.id
            AND d.user_id = $2
            RETURNING *;`,
            [cardId, req.user.sub],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Deck not found.',
            });
        }

        res.json({ mesage: 'Card deleted.', card: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

export default router;
