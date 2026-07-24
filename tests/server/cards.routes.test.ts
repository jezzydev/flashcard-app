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
import type { AuthPayload } from '../../server/types/index.js';

// Mock pool so pool.query can be controlled per test.
// query.ts itself is NOT mocked — query() and execute() run for real
// and call the mocked pool.query underneath.
vi.mock('../../server/db/pool.js', () => ({
    default: { query: vi.fn() },
    testConnection: vi.fn(),
}));

import pool from '../../server/db/pool.js';

// Single typed reference to the mock so tests don't need casts.
const mockPoolQuery = pool.query as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_AUTH: AuthPayload = {
    sub: '1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    tokenVersion: 1,
};

const TEST_CARD = { id: 5, front: 'What is 2+2?', back: '4' };

// ---------------------------------------------------------------------------
// In-process test server
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

beforeAll(async () => {
    const [{ default: cardsRoutes }, { default: errorHandler }] =
        await Promise.all([
            import('../../server/routes/cards.js'),
            import('../../server/middleware/errorHandler.js'),
        ]);

    const app: Application = express();
    app.use(express.json());

    // Replicate the two global middlewares from index.ts:
    //  - initialise req.validated (required by validateIdParam / validateBody)
    //  - set req.user (normally done by authenticateToken)
    app.use((req: Request, _res: Response, next: NextFunction) => {
        req.validated = {};
        req.user = TEST_AUTH;
        next();
    });

    app.use('/api/cards', cardsRoutes);
    app.use(errorHandler);

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api/cards`;
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

function put(path: string, body?: object) {
    return fetch(`${baseUrl}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    });
}

function del(path: string) {
    return fetch(`${baseUrl}${path}`, { method: 'DELETE' });
}

/** Seed one pool.query response (rows + rowCount). */
function mockRows<T>(rows: T[], rowCount = rows.length) {
    mockPoolQuery.mockResolvedValueOnce({ rows, rowCount });
}

// ---------------------------------------------------------------------------
// PUT /api/cards/:cardId
// ---------------------------------------------------------------------------

describe('PUT /api/cards/:cardId', () => {
    it('returns 200 with the updated card when both fields are provided', async () => {
        mockRows([TEST_CARD]);

        const res = await put('/5', { front: 'What is 2+2?', back: '4' });
        const body = (await res.json()) as { card: typeof TEST_CARD };

        expect(res.status).toBe(200);
        expect(body.card).toEqual(TEST_CARD);
    });

    it('returns 200 when updating only the front text', async () => {
        const updated = { ...TEST_CARD, front: 'Updated Q' };
        mockRows([updated]);

        const res = await put('/5', { front: 'Updated Q' });
        const body = (await res.json()) as { card: typeof TEST_CARD };

        expect(res.status).toBe(200);
        expect(body.card.front).toBe('Updated Q');
    });

    it('returns 200 when updating only the back text', async () => {
        const updated = { ...TEST_CARD, back: 'Updated A' };
        mockRows([updated]);

        const res = await put('/5', { back: 'Updated A' });
        const body = (await res.json()) as { card: typeof TEST_CARD };

        expect(res.status).toBe(200);
        expect(body.card.back).toBe('Updated A');
    });

    it('passes null for the missing field so COALESCE keeps the existing value', async () => {
        mockRows([TEST_CARD]);

        await put('/5', { front: 'New Q' });

        // params: [cardId, user.sub, front, back]
        expect(mockPoolQuery).toHaveBeenCalledWith(expect.any(String), [
            5,
            TEST_AUTH.sub,
            'New Q',
            null,
        ]);
    });

    it('returns 400 when cardId is not a positive integer', async () => {
        const res = await put('/abc', { front: 'x', back: 'y' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when cardId is zero', async () => {
        const res = await put('/0', { front: 'x', back: 'y' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when front is an empty string', async () => {
        const res = await put('/5', { front: '' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when back is an empty string', async () => {
        const res = await put('/5', { back: '' });
        expect(res.status).toBe(400);
    });

    it('returns 404 when the card does not belong to the user', async () => {
        mockRows([]);

        const res = await put('/99', { front: 'x', back: 'y' });
        expect(res.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// DELETE /api/cards/:cardId
// ---------------------------------------------------------------------------

describe('DELETE /api/cards/:cardId', () => {
    it('returns 200 when the card is deleted successfully', async () => {
        mockRows([], 1);

        const res = await del('/5');
        expect(res.status).toBe(200);
    });

    it('passes the correct cardId and userId to the query', async () => {
        mockRows([], 1);

        await del('/5');

        expect(mockPoolQuery).toHaveBeenCalledWith(expect.any(String), [
            5,
            TEST_AUTH.sub,
        ]);
    });

    it('returns 400 when cardId is not a positive integer', async () => {
        const res = await del('/abc');
        expect(res.status).toBe(400);
    });

    it('returns 400 when cardId is zero', async () => {
        const res = await del('/0');
        expect(res.status).toBe(400);
    });

    it('returns 404 when the card does not belong to the user', async () => {
        mockRows([], 0);

        const res = await del('/99');
        expect(res.status).toBe(404);
    });
});
