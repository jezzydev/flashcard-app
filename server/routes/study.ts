import express, { Request, Response } from 'express';
import { assertValidCardId } from '../utils/cardValidation.js';
import { NotFoundError } from '../utils/errors.js';
import { calculateNextReview } from '../utils/sm2.js';
import {
    assertValidCardRating,
    assertValidCreateSessionReview,
    assertValidCreateStudySession,
} from '../utils/studyValidation.js';
import {
    StudySession,
    Card,
    StudySessionBasicInfo,
    CreateSessionReview,
    CreateStudySession,
    DeckBasicInfo,
} from '../types/index.js';
import { query, withTransaction, execute } from '../db/query.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import {
    getValidatedBody,
    getValidatedId,
    getAuthPayload,
} from '../utils/validationHelper.js';

const router = express.Router();

//Submit a card review, update card schedule
router.post(
    '/sessions/:sessionId/review',
    validateIdParam('sessionId'),
    validateBody(assertValidCreateSessionReview),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const sessionId = getValidatedId(req, 'sessionId');
        const review = getValidatedBody<CreateSessionReview>(req);

        assertValidCardId(review.cardId);
        assertValidCardRating(review.rating);

        const sessionResult = await query<Pick<StudySession, 'id' | 'deckId'>>(
            `SELECT id, deck_id as "deckId" FROM study_sessions WHERE id = $1 AND user_id = $2 AND completed_at IS NULL;`,
            [sessionId, user.sub],
        );

        if (!sessionResult[0]) {
            throw new NotFoundError('Study session not found.');
        }

        const cardResult = await query<Card>(
            `SELECT id, deck_id as "deckId", front, back, interval, ease_factor as "easeFactor", repetitions, due_date as "dueDate", created_at as "createdAt" 
                FROM cards WHERE id = $1 AND deck_id = $2;`,
            [review.cardId, sessionResult[0].deckId],
        );

        if (!cardResult[0]) {
            throw new NotFoundError('Card not found.');
        }

        cardResult[0].easeFactor = Number(cardResult[0].easeFactor);
        const card = calculateNextReview(cardResult[0], review.rating);

        await withTransaction(async (client) => {
            await client.query(
                `INSERT INTO session_reviews (session_id, card_id, rating) VALUES ($1, $2, $3);`,
                [sessionId, review.cardId, review.rating],
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
                    card.easeFactor,
                    card.repetitions,
                    card.dueDate,
                    review.cardId,
                ],
            );
        });

        res.status(201).json({ message: 'Card review submitted.' });
    },
);

//Start a new study session
router.post(
    '/sessions',
    validateBody(assertValidCreateStudySession),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const studySession = getValidatedBody<CreateStudySession>(req);

        const deckResult = await query<DeckBasicInfo>(
            `SELECT id, name, description FROM decks WHERE id = $1 AND user_id = $2;`,
            [studySession.deckId, user.sub],
        );

        if (!deckResult[0]) {
            throw new NotFoundError('Deck not found.');
        }

        const result = await query<StudySessionBasicInfo>(
            `INSERT INTO study_sessions (user_id, deck_id) VALUES ($1, $2) 
            RETURNING id, started_at as "startedAt";`,
            [user.sub, studySession.deckId],
        );

        res.status(201).json({
            message: 'New study session created.',
            study_session: result[0],
        });
    },
);

//Mark session as complete
router.put(
    '/sessions/:sessionId/complete',
    validateIdParam('sessionId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const sessionId = getValidatedId(req, 'sessionId');

        const sessionResult = await query<Pick<StudySession, 'id' | 'deckId'>>(
            `SELECT id, deck_id as "deckId" FROM study_sessions WHERE id = $1 AND user_id = $2 AND completed_at IS NULL;`,
            [sessionId, user.sub],
        );

        if (!sessionResult[0]) {
            throw new NotFoundError('Study session not found.');
        }

        await execute(
            `WITH reviews AS 
                    (select ss1.id as session_id, count(sr1.*) as cards_reviewed, 
                        COUNT(sr1.*) FILTER(WHERE sr1.rating >= 3) as cards_correct
                    FROM study_sessions ss1 
                    left join session_reviews sr1 on ss1.id = sr1.session_id
                    WHERE ss1.id = $2
                    GROUP BY ss1.id)
                UPDATE study_sessions ss
                SET completed_at = $1,
                    cards_reviewed = rv.cards_reviewed,
                    cards_correct = rv.cards_correct 
                FROM reviews rv
                WHERE ss.id = $2
                AND ss.id = rv.session_id;`,
            [new Date(), sessionId],
        );

        res.json({
            message: 'Study session completed.',
        });
    },
);

export default router;
