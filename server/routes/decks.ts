import express, { Request, Response } from 'express';
import { query, execute } from '../db/query.js';
import { validateIdParam, validateBody } from '../middleware/validation.js';
import {
    getValidatedBody,
    getValidatedId,
    getAuthPayload,
} from '../utils/validationHelper.js';
import { assertValidCreateCard } from '../utils/cardValidation.js';
import {
    AuthenticationError,
    ERROR_CODES,
    NotFoundError,
} from '../utils/errors.js';
import {
    DeckSummary,
    Card,
    StudyDate,
    CardBasicInfo,
    CreateDeck,
    DeckBasicInfo,
    UpdateDeck,
    CreateCard,
    RawDeckStats,
    RawDeckSummary,
    RawUserStats,
} from '../types/index.js';
import {
    assertValidCreateDeck,
    assertValidUpdateDeck,
} from '../utils/deckValidation.js';
import {
    toDeckStats,
    toDeckSummary,
    toUserStats,
} from '../mappers/deckMappers.js';

const router = express.Router();

//Get total stats
router.get('/stats', async (req: Request, res: Response) => {
    const user = getAuthPayload(req);

    const deckResult = await query<RawUserStats>(
        `SELECT u.id as "userId", COUNT(distinct d.id) as "totalDecks", 
            COUNT(distinct c.id) FILTER(WHERE c.due_date <= now()) as "dueToday"
        FROM users u
        LEFT JOIN decks d ON u.id = d.user_id
        LEFT JOIN cards c ON d.id = c.deck_id
        WHERE u.id = $1
        GROUP BY u.id; `,
        [user.sub],
    );

    if (!deckResult[0]) {
        throw new AuthenticationError(
            'Session invalid.',
            ERROR_CODES.AUTHENTICATION_FAILED,
        );
    }

    const streakResult = await query<StudyDate>(
        `SELECT distinct DATE(started_at) as "studyDate"
                    FROM study_sessions 
                    WHERE user_id = $1
                    ORDER BY "studyDate" DESC;`,
        [user.sub],
    );

    const stats = toUserStats(deckResult[0]);
    stats.streak = calculateStreak(streakResult);

    res.json({
        stats: stats,
    });
});

//Get all decks for authenticated user
router.get('/', async (req: Request, res: Response) => {
    const user = getAuthPayload(req);
    const result = await query<RawDeckSummary>(
        `SELECT d.id, d.name, d.description, d.created_at as "createdAt", COUNT(distinct c.id) as "totalCards", COUNT(distinct c.id) FILTER(WHERE c.due_date <= now()) as "dueToday"
            FROM decks d 
            LEFT JOIN cards c ON c.deck_id = d.id
            WHERE d.user_id = $1 
            GROUP BY d.id
            ORDER BY d.created_at, d.name;`,
        [user.sub],
    );

    const decksSummary = result.map(toDeckSummary);
    res.json(decksSummary);
});

//Get all cards in a deck
router.get(
    '/:deckId/cards',
    validateIdParam('deckId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');

        const deckResult = await query<DeckBasicInfo>(
            'SELECT id, name, description FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, user.sub],
        );

        if (!deckResult[0]) {
            throw new NotFoundError('Deck not found.');
        }

        const cardResult = await query<Card>(
            `SELECT c.id, c.deck_id as "deckId", c.front, c.back, c.interval, c.ease_factor as "easeFactor", c.repetitions, c.due_date as "dueDate", c.created_at as "createdAt"
            FROM cards c
            WHERE c.deck_id = $1 
            ORDER BY c.created_at, c.id;`,
            [deckId],
        );

        res.json(cardResult);
    },
);

//Get due cards for a study session (max 20)
router.get(
    '/:deckId/study',
    validateIdParam('deckId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');

        const deckResult = await query<DeckBasicInfo>(
            'SELECT id, name, description FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, user.sub],
        );

        if (!deckResult[0]) {
            throw new NotFoundError('Deck not found.');
        }

        const cardResult = await query<Card>(
            `SELECT c.id, c.deck_id as "deckId", c.front, c.back, c.interval, c.ease_factor as "easeFactor", c.repetitions, c.due_date as "dueDate", c.created_at as "createdAt"
            FROM cards c
            WHERE c.deck_id = $1
            AND c.due_date <= now()
            ORDER BY c.due_date, c.created_at
            LIMIT 20;`,
            [deckId],
        );

        res.json(cardResult);
    },
);

//Get stats of deck: total cards, due today, retention rate, streak
router.get(
    '/:deckId/stats',
    validateIdParam('deckId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');

        const deckResult = await query<RawDeckStats>(
            `SELECT d.id, count(distinct c.id) as "totalCards", 
                COUNT(distinct c.id) FILTER(WHERE c.due_date <= now()) as "dueToday",
                COALESCE(COUNT(rvw.id) FILTER (WHERE rating >= 3) * 100.0 / NULLIF(COUNT(rvw.id), 0), 0) AS "retentionRate"
                FROM decks d
                LEFT JOIN cards c ON d.id = c.deck_id
                LEFT JOIN session_reviews rvw ON c.id = rvw.card_id
                WHERE d.id = $1
                AND d.user_id = $2
                GROUP BY d.id; `,
            [deckId, user.sub],
        );

        if (!deckResult[0]) {
            throw new NotFoundError('Deck not found.');
        }

        const streakResult = await query<StudyDate>(
            `SELECT distinct DATE(started_at) as "studyDate"
                FROM study_sessions 
                WHERE deck_id = $1 
                AND user_id = $2
                ORDER BY "studyDate" DESC;`,
            [deckId, user.sub],
        );

        const stats = toDeckStats(deckResult[0]);
        stats.streak = calculateStreak(streakResult);
        stats.retentionRate = Number(stats.retentionRate.toFixed(2));

        res.json({
            stats: stats,
        });
    },
);

//Get single deck with card count and due count
router.get(
    '/:deckId',
    validateIdParam('deckId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');

        const result = await query<RawDeckSummary>(
            `SELECT d.id, d.name, d.description, d.created_at as "createdAt", count(c.id) as "totalCards", count(c.id) FILTER (WHERE c.due_date <= now()) as "dueToday"
            FROM decks d 
            LEFT JOIN cards c ON d.id = c.deck_id 
            WHERE d.id = $1 
            AND d.user_id = $2
            GROUP BY d.id;`,
            [deckId, user.sub],
        );

        if (!result[0]) {
            throw new NotFoundError('Deck not found.');
        }

        const summary = toDeckSummary(result[0]);
        res.json(summary);
    },
);

//Add a card to a deck
router.post(
    '/:deckId/cards',
    validateIdParam('deckId'),
    validateBody(assertValidCreateCard),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');
        const card = getValidatedBody<CreateCard>(req);

        const result = await query<CardBasicInfo>(
            `INSERT INTO cards (deck_id, front, back) 
            SELECT $1, $2, $3 
            FROM decks WHERE id = $1 AND user_id = $4 
            RETURNING id, front, back;`,
            [deckId, card.front, card.back, user.sub],
        );

        if (!result[0]) {
            throw new NotFoundError('Deck not found.');
        }

        res.status(201).json({
            message: 'New card created.',
            card: result[0],
        });
    },
);

//Create a new deck
router.post(
    '/',
    validateBody(assertValidCreateDeck),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deck = getValidatedBody<CreateDeck>(req);

        const result = await query<DeckBasicInfo>(
            `INSERT INTO decks (user_id, name, description) 
            VALUES ($1, $2, $3) RETURNING id, name, description;`,
            [user.sub, deck.name, deck.description ?? null],
        );

        res.status(201).json({
            message: 'New deck created.',
            deck: result[0],
        });
    },
);

//Update deck's name or description
router.put(
    '/:deckId',
    validateIdParam('deckId'),
    validateBody(assertValidUpdateDeck),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');
        const deck = getValidatedBody<UpdateDeck>(req);
        const columns = Object.keys(deck);

        if (columns.length === 0) {
            return res.json({ message: 'Nothing to update.' });
        }

        const result = await query<DeckBasicInfo>(
            `UPDATE decks 
            SET name = COALESCE($3, name),
                description = COALESCE($4, description)
            WHERE id = $1 
            AND user_id = $2
            RETURNING id, name, description;`,
            [deckId, user.sub, deck.name ?? null, deck.description ?? null],
        );

        if (!result[0]) {
            throw new NotFoundError('Deck not found.');
        }

        res.json({ message: 'Deck updated.', deck: result[0] });
    },
);

//Delete deck and all its cards
router.delete(
    '/:deckId',
    validateIdParam('deckId'),
    async (req: Request, res: Response) => {
        const user = getAuthPayload(req);
        const deckId = getValidatedId(req, 'deckId');

        const result = await execute(
            `DELETE FROM decks WHERE id = $1 AND user_id = $2;`,
            [deckId, user.sub],
        );

        if (result === 0) {
            throw new NotFoundError('Deck not found.');
        }

        res.json({ mesage: 'Deck deleted.' });
    },
);

function calculateStreak(studyDates: StudyDate[]) {
    let streak = 0;

    if (studyDates.length > 0) {
        let anchor = new Date();

        const isSameDay = (d1: Date, d2: Date) => {
            return (
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate()
            );
        };

        const first = studyDates[0];

        if (first) {
            if (!isSameDay(new Date(first.studyDate), anchor)) {
                anchor.setDate(anchor.getDate() - 1); //set anchor to yesterday if user has not yet studied today
            }
        }

        for (let i = 0; i <= studyDates.length - 1; i++) {
            const entry = studyDates[i];
            if (entry && isSameDay(new Date(entry.studyDate), anchor)) {
                streak++;
                anchor.setDate(anchor.getDate() - 1);
            } else {
                break;
            }
        }
    }

    return streak;
}

export default router;
