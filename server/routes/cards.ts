import express, { Request, Response, NextFunction } from 'express';
import { assertValidUpdateCard } from '../utils/cardValidation.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import {
    getValidatedBody,
    getValidatedId,
    getAuthPayload,
} from '../utils/validationHelper.js';
import { query, execute } from '../db/query.js';
import { CardBasicInfo, UpdateCard } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

const router = express.Router();

//Update card's front or back text
router.put(
    '/:cardId',
    validateIdParam('cardId'),
    validateBody(assertValidUpdateCard),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const cardId = getValidatedId(req, 'cardId');
        const card = getValidatedBody<UpdateCard>(req);

        const result = await query<CardBasicInfo>(
            `UPDATE cards c
            SET front = COALESCE($3, front), 
                back = COALESCE($4, back) 
            FROM decks d
            WHERE c.id = $1 
            AND c.deck_id = d.id 
            AND d.user_id = $2
            RETURNING c.id, front, back;`,
            [cardId, user.sub, card.front ?? null, card.back ?? null],
        );

        if (!result[0]) {
            throw new NotFoundError('Card not found.');
        }

        res.json({ message: 'Card updated.', card: result[0] });
    },
);

//Delete a card
router.delete(
    '/:cardId',
    validateIdParam('cardId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const cardId = getValidatedId(req, 'cardId');

        const result = await execute(
            `DELETE FROM cards c 
            USING decks d 
            WHERE c.id = $1 
            AND c.deck_id = d.id
            AND d.user_id = $2;`,
            [cardId, user.sub],
        );

        if (result === 0) {
            throw new NotFoundError('Card not found.');
        }

        res.json({ message: 'Card deleted.' });
    },
);

export default router;
