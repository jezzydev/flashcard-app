import express, { Request, Response, NextFunction } from 'express';
import {
    assertValidCardId,
    assertValidUpdateCard,
} from '../utils/cardValidation.js';
import { assertAuthenticated } from '../middleware/authentication.js';
import { query, execute } from '../db/query.js';
import { CardBasicInfo, UpdateCard } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

const router = express.Router();

//Update card's front or back text
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    assertAuthenticated(req);

    const cardId = req.params.id;
    const card: UpdateCard = req.body;

    assertValidCardId(cardId);
    assertValidUpdateCard(card);

    const result = await query<CardBasicInfo>(
        `UPDATE cards c
            SET front = COALESCE($3, front), 
                back = COALESCE($4, back) 
            FROM decks d
            WHERE c.id = $1 
            AND c.deck_id = d.id 
            AND d.user_id = $2
            RETURNING id, front, back;`,
        [cardId, req.user.sub, card.front ?? null, card.back ?? null],
    );

    if (!result[0]) {
        throw new NotFoundError('Card not found.');
    }

    res.json({ message: 'Card updated.', card: result[0] });
});

//Delete a card
router.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
        assertAuthenticated(req);

        const cardId = req.params.id;
        assertValidCardId(cardId);

        const result = await execute(
            `DELETE FROM cards c 
            USING decks d 
            WHERE c.id = $1 
            AND c.deck_id = d.id
            AND d.user_id = $2;`,
            [cardId, req.user.sub],
        );

        if (result === 0) {
            throw new NotFoundError('Card not found.');
        }

        res.json({ mesage: 'Card deleted.' });
    },
);

export default router;
