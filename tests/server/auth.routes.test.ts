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
import express, { type Application } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { RefreshToken } from '../../server/types/index.js';

// vi.mock is hoisted above imports — use inline literals in factory functions,
// not module-level constants (which aren't initialised yet at hoist time).

vi.mock('../../server/config/env.js', () => ({
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '10m',
    JWT_REFRESH_EXPIRES_IN: '7d',
}));

vi.mock('../../server/db/query.js', () => ({
    query: vi.fn(),
    withTransaction: vi.fn(),
}));

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

// These imports get the mocked versions because vi.mock is hoisted.
import { query, withTransaction } from '../../server/db/query.js';
import bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_REFRESH_SECRET = 'test-refresh-secret';

const TEST_USER = {
    id: 1,
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    passwordHash: '$2b$10$hashed',
    tokenVersion: 1,
    createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// In-process test server
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

beforeAll(async () => {
    const [{ default: authRoutes }, { default: errorHandler }] =
        await Promise.all([
            import('../../server/routes/auth.js'),
            import('../../server/middleware/errorHandler.js'),
        ]);

    const app: Application = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api/auth`;
});

afterAll(
    () =>
        new Promise<void>((resolve, reject) =>
            server.close((err) => (err ? reject(err) : resolve())),
        ),
);

beforeEach(() => {
    vi.clearAllMocks();
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashed');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(
    path: string,
    body?: object,
    extraHeaders?: Record<string, string>,
) {
    return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

function makeRefreshToken(sub = '1'): string {
    return jwt.sign(
        { sub, email: TEST_USER.email, name: TEST_USER.name, jti: 'test-jti' },
        TEST_REFRESH_SECRET,
        { expiresIn: '7d' },
    );
}

function sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Mock the withTransaction call made by revokeAllUserTokens.
 * The return value of withTransaction isn't used there, so a simple resolve is enough.
 */
function mockRevoke() {
    (withTransaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
        async (cb: (c: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
            const client = {
                query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
            };
            return cb(client);
        },
    );
}

/**
 * Mock the withTransaction call made by createNewRefreshToken during login
 * (no old token to revoke → 2 client.query calls).
 */
function mockCreateToken() {
    (withTransaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
        async (cb: (c: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
            const client = { query: vi.fn() };
            client.query
                .mockResolvedValueOnce({
                    rows: [{ id: 2, userId: 1, tokenHash: 'new-hash' }],
                    rowCount: 1,
                }) // INSERT refresh_tokens
                .mockResolvedValueOnce({
                    rows: [{ id: 1, email: TEST_USER.email, tokenVersion: 2 }],
                    rowCount: 1,
                }); // UPDATE users token_version
            return cb(client);
        },
    );
}

/**
 * Mock the withTransaction call made by createNewRefreshToken during /refresh
 * (old token revoked inline → 3 client.query calls).
 */
function mockCreateTokenWithRevoke() {
    (withTransaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
        async (cb: (c: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
            const client = { query: vi.fn() };
            client.query
                .mockResolvedValueOnce({
                    rows: [{ id: 2, userId: 1, tokenHash: 'new-hash' }],
                    rowCount: 1,
                }) // INSERT refresh_tokens
                .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE SET revoked_at
                .mockResolvedValueOnce({
                    rows: [{ id: 1, email: TEST_USER.email, tokenVersion: 2 }],
                    rowCount: 1,
                }); // UPDATE users token_version
            return cb(client);
        },
    );
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
    it('returns 201 and the created user on valid input', async () => {
        vi.mocked(query).mockResolvedValueOnce([
            { id: 1, email: 'ada@example.com', name: 'Ada Lovelace' },
        ]);

        const res = await post('/register', {
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            password: 'Secret123',
        });
        const body = (await res.json()) as { user: { id: number; email: string; name: string } };

        expect(res.status).toBe(201);
        expect(body.user).toMatchObject({
            id: 1,
            email: 'ada@example.com',
            name: 'Ada Lovelace',
        });
    });

    it('hashes the password with bcrypt before inserting', async () => {
        vi.mocked(query).mockResolvedValueOnce([
            { id: 1, email: 'ada@example.com', name: 'Ada' },
        ]);

        await post('/register', {
            email: 'ada@example.com',
            name: 'Ada',
            password: 'Secret123',
        });

        expect(bcrypt.hash).toHaveBeenCalledWith('Secret123', 10);
    });

    it('returns 400 when email is missing', async () => {
        const res = await post('/register', { name: 'Ada', password: 'Secret123' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when email format is invalid', async () => {
        const res = await post('/register', {
            email: 'not-an-email',
            name: 'Ada',
            password: 'Secret123',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when name is missing', async () => {
        const res = await post('/register', {
            email: 'ada@example.com',
            password: 'Secret123',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
        const res = await post('/register', {
            email: 'ada@example.com',
            name: 'Ada',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when password is fewer than 8 characters', async () => {
        const res = await post('/register', {
            email: 'ada@example.com',
            name: 'Ada',
            password: 'Ab1',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when password has no uppercase letter', async () => {
        const res = await post('/register', {
            email: 'ada@example.com',
            name: 'Ada',
            password: 'alllower1',
        });
        expect(res.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
    it('returns 200 with an access token and sets the refresh token cookie', async () => {
        vi.mocked(query).mockResolvedValueOnce([TEST_USER]);
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        mockRevoke();
        mockCreateToken();

        const res = await post('/login', {
            email: TEST_USER.email,
            password: 'Secret123',
        });
        const body = (await res.json()) as { accessToken: string };

        expect(res.status).toBe(200);
        expect(typeof body.accessToken).toBe('string');
        expect(
            res.headers.getSetCookie().some((c) => c.startsWith('refreshToken=')),
        ).toBe(true);
    });

    it('returns 400 when email is missing', async () => {
        const res = await post('/login', { password: 'Secret123' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
        const res = await post('/login', { email: TEST_USER.email });
        expect(res.status).toBe(400);
    });

    it('returns 401 when the user does not exist', async () => {
        vi.mocked(query).mockResolvedValueOnce([]);

        const res = await post('/login', {
            email: 'ghost@example.com',
            password: 'Secret123',
        });
        expect(res.status).toBe(401);
    });

    it('returns 401 when the password does not match', async () => {
        vi.mocked(query).mockResolvedValueOnce([TEST_USER]);
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const res = await post('/login', {
            email: TEST_USER.email,
            password: 'WrongPass1',
        });
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

describe('POST /api/auth/refresh', () => {
    it('returns 200 with a new access token and rotates the refresh token cookie', async () => {
        const oldToken = makeRefreshToken();
        const oldHash = sha256(oldToken);

        vi.mocked(query).mockResolvedValueOnce([
            {
                id: 1,
                userId: 1,
                tokenHash: oldHash,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                revokedAt: undefined,
            } as RefreshToken,
        ]);
        mockCreateTokenWithRevoke();

        const res = await post('/refresh', undefined, {
            Cookie: `refreshToken=${oldToken}`,
        });
        const body = (await res.json()) as { accessToken: string };

        expect(res.status).toBe(200);
        expect(typeof body.accessToken).toBe('string');
        expect(
            res.headers.getSetCookie().some((c) => c.startsWith('refreshToken=')),
        ).toBe(true);
    });

    it('returns 401 when no refresh token cookie is present', async () => {
        const res = await post('/refresh');
        expect(res.status).toBe(401);
    });

    it('returns 401 when the refresh token has an invalid signature', async () => {
        const res = await post('/refresh', undefined, {
            Cookie: 'refreshToken=invalid.jwt.here',
        });
        expect(res.status).toBe(401);
    });

    it('returns 401 when the refresh token is not found in the database', async () => {
        const token = makeRefreshToken();
        vi.mocked(query).mockResolvedValueOnce([]);
        mockRevoke(); // revokeAllUserTokens is called on suspected token theft

        const res = await post('/refresh', undefined, {
            Cookie: `refreshToken=${token}`,
        });
        expect(res.status).toBe(401);
    });

    it('returns 401 when the refresh token has been revoked', async () => {
        const token = makeRefreshToken();
        vi.mocked(query).mockResolvedValueOnce([
            {
                id: 1,
                userId: 1,
                tokenHash: sha256(token),
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                revokedAt: new Date(),
            } as RefreshToken,
        ]);
        mockRevoke(); // revokeAllUserTokens is called on suspected token theft

        const res = await post('/refresh', undefined, {
            Cookie: `refreshToken=${token}`,
        });
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/auth/logout', () => {
    it('returns 204 and clears the refresh token cookie', async () => {
        const token = makeRefreshToken();
        mockRevoke();

        const res = await post('/logout', undefined, {
            Cookie: `refreshToken=${token}`,
        });

        expect(res.status).toBe(204);
        expect(
            res.headers.getSetCookie().some((c) => c.startsWith('refreshToken=;')),
        ).toBe(true);
    });

    it('returns 204 when no cookie is present', async () => {
        const res = await post('/logout');
        expect(res.status).toBe(204);
    });
});
