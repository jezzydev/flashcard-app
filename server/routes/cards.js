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
            `UPDATE cards 
            SET front = $2, 
            back = $3 
            WHERE id = $1 
            RETURNING *;`,
            [cardId, card.front, card.back],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Card not found.',
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
            'DELETE FROM cards WHERE id = $1 RETURNING *;',
            [cardId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Card not found.',
            });
        }

        res.json({ mesage: 'Card deleted.', card: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

export default router;
