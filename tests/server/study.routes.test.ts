// @vitest-environment node

import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import express, {
    type Application,
    type Request,
    type Response,
    type NextFunction,
} from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AuthPayload, Card } from '../../server/types/index.js';

// Mock pool so pool.query and pool.connect can be controlled per test.
// query.ts is NOT mocked — query(), execute(), and withTransaction() run for
// real and drive the mocked pool underneath.
vi.mock('../../server/db/pool.js', () => ({
    default: {
        query: vi.fn(),
        connect: vi.fn(),
    },
    testConnection: vi.fn(),
}));

import pool from '../../server/db/pool.js';

const mockPoolQuery = pool.query as ReturnType<typeof vi.fn>;
const mockPoolConnect = pool.connect as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_AUTH: AuthPayload = {
    sub: '1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    tokenVersion: 1,
};

const TEST_SESSION = { id: 1, deckId: 2 };
const TEST_DECK = { id: 2, name: 'Math', description: '' };

const TEST_CARD: Card = {
    id: 5,
    deckId: 2,
    front: 'What is 2+2?',
    back: '4',
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: new Date(),
    createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// In-process test server
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

beforeAll(async () => {
    const [{ default: studyRoutes }, { default: errorHandler }] =
        await Promise.all([
            import('../../server/routes/study.js'),
            import('../../server/middleware/errorHandler.js'),
        ]);

    const app: Application = express();
    app.use(express.json());

    // Replicate the global middlewares from index.ts:
    //  - initialise req.validated (required by validateIdParam / validateBody)
    //  - set req.user (normally done by authenticateToken)
    app.use((req: Request, _res: Response, next: NextFunction) => {
        req.validated = {};
        req.user = TEST_AUTH;
        next();
    });

    app.use('/api/study', studyRoutes);
    app.use(errorHandler);

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api/study`;
});

afterAll(
    () =>
        new Promise<void>((resolve, reject) =>
            server.close((err) => (err ? reject(err) : resolve())),
        ),
);

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(path: string, body?: object) {
    return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    });
}

function put(path: string) {
    return fetch(`${baseUrl}${path}`, { method: 'PUT' });
}

/** Seed the next pool.query response (used by query() and execute()). */
function mockRows<T>(rows: T[], rowCount = rows.length) {
    mockPoolQuery.mockResolvedValueOnce({ rows, rowCount });
}

/**
 * Set up pool.connect() to return a mock PoolClient for withTransaction().
 * All client.query calls resolve by default; tests can inspect them via the
 * returned client reference.
 */
function mockTransaction() {
    const client = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
    };
    mockPoolConnect.mockResolvedValueOnce(client);
    return client;
}

// ---------------------------------------------------------------------------
// POST /api/study/sessions/:sessionId/review
// ---------------------------------------------------------------------------

describe('POST /api/study/sessions/:sessionId/review', () => {
    it('returns 201 when the review is submitted successfully', async () => {
        mockRows([TEST_SESSION]); // SELECT study_sessions
        mockRows([TEST_CARD]);    // SELECT cards
        mockTransaction();        // withTransaction: INSERT review + UPDATE sessions + UPDATE cards

        const res = await post('/sessions/1/review', { cardId: 5, rating: 4 });
        expect(res.status).toBe(201);
    });

    it('runs three queries inside the transaction (insert review, update session, update card)', async () => {
        mockRows([TEST_SESSION]);
        mockRows([TEST_CARD]);
        const client = mockTransaction();

        await post('/sessions/1/review', { cardId: 5, rating: 4 });

        // BEGIN + INSERT session_reviews + UPDATE study_sessions + UPDATE cards + COMMIT
        expect(client.query).toHaveBeenCalledTimes(5);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('increments cards_correct by 1 when rating >= 3', async () => {
        mockRows([TEST_SESSION]);
        mockRows([TEST_CARD]);
        const client = mockTransaction();

        await post('/sessions/1/review', { cardId: 5, rating: 3 });

        const updateSessionCall = client.query.mock.calls.find(
            (args) => typeof args[0] === 'string' && args[0].includes('cards_correct'),
        );
        expect(updateSessionCall?.[1]).toContain(1); // cards_correct + 1
    });

    it('does not increment cards_correct when rating < 3', async () => {
        mockRows([TEST_SESSION]);
        mockRows([TEST_CARD]);
        const client = mockTransaction();

        await post('/sessions/1/review', { cardId: 5, rating: 2 });

        const updateSessionCall = client.query.mock.calls.find(
            (args) => typeof args[0] === 'string' && args[0].includes('cards_correct'),
        );
        expect(updateSessionCall?.[1]).toContain(0); // cards_correct + 0
    });

    it('returns 400 when sessionId is not a positive integer', async () => {
        const res = await post('/sessions/abc/review', { cardId: 5, rating: 4 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when cardId is missing from the body', async () => {
        const res = await post('/sessions/1/review', { rating: 4 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when cardId is zero', async () => {
        const res = await post('/sessions/1/review', { cardId: 0, rating: 4 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when rating is missing from the body', async () => {
        const res = await post('/sessions/1/review', { cardId: 5 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when rating is greater than 5', async () => {
        const res = await post('/sessions/1/review', { cardId: 5, rating: 6 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when rating is negative', async () => {
        const res = await post('/sessions/1/review', { cardId: 5, rating: -1 });
        expect(res.status).toBe(400);
    });

    it('returns 404 when the study session is not found', async () => {
        mockRows([]); // session not found

        const res = await post('/sessions/99/review', { cardId: 5, rating: 4 });
        expect(res.status).toBe(404);
    });

    it('returns 404 when the card is not in the session deck', async () => {
        mockRows([TEST_SESSION]); // session found
        mockRows([]);             // card not found in that deck

        const res = await post('/sessions/1/review', { cardId: 99, rating: 4 });
        expect(res.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// POST /api/study/sessions
// ---------------------------------------------------------------------------

describe('POST /api/study/sessions', () => {
    it('returns 201 with the new session when the deck exists', async () => {
        const newSession = { id: 10, startedAt: new Date().toISOString() };
        mockRows([TEST_DECK]);   // SELECT decks
        mockRows([newSession]);  // INSERT study_sessions

        const res = await post('/sessions', { deckId: 2 });
        const body = (await res.json()) as { study_session: typeof newSession };

        expect(res.status).toBe(201);
        expect(body.study_session).toMatchObject({ id: 10 });
    });

    it('returns 400 when deckId is missing from the body', async () => {
        const res = await post('/sessions', {});
        expect(res.status).toBe(400);
    });

    it('returns 400 when deckId is zero', async () => {
        const res = await post('/sessions', { deckId: 0 });
        expect(res.status).toBe(400);
    });

    it('returns 404 when the deck does not belong to the user', async () => {
        mockRows([]); // deck not found

        const res = await post('/sessions', { deckId: 99 });
        expect(res.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// PUT /api/study/sessions/:sessionId/complete
// ---------------------------------------------------------------------------

describe('PUT /api/study/sessions/:sessionId/complete', () => {
    it('returns 200 when the session is marked as complete', async () => {
        mockRows([TEST_SESSION]); // SELECT study_sessions
        mockRows([], 1);          // execute: UPDATE study_sessions SET completed_at

        const res = await put('/sessions/1/complete');
        expect(res.status).toBe(200);
    });

    it('returns 400 when sessionId is not a positive integer', async () => {
        const res = await put('/sessions/abc/complete');
        expect(res.status).toBe(400);
    });

    it('returns 400 when sessionId is zero', async () => {
        const res = await put('/sessions/0/complete');
        expect(res.status).toBe(400);
    });

    it('returns 404 when the session is not found or already completed', async () => {
        mockRows([]); // session not found

        const res = await put('/sessions/99/complete');
        expect(res.status).toBe(404);
    });
});
