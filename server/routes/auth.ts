import express, {
    Request,
    Response,
    NextFunction,
    CookieOptions,
} from 'express';
import pool from '../db/pool.js';
import { query, execute, withTransaction } from '../db/query.js';
import {
    isValidEmail,
    isValidPassword,
    isValidUser,
} from '../utils/userValidation.js';
import bcrypt from 'bcrypt';
import { AuthenticationError, ERROR_CODES } from '../utils/errors.js';
import jwt, { JwtPayload } from 'jsonwebtoken';
import {
    generateAccessToken,
    generateRefreshToken,
} from '../utils/tokenGen.js';
import crypto from 'crypto';
import { softAuthenticate } from '../middleware/authentication.js';
import {
    User,
    CreateUser,
    LoginUser,
    BasicUserInfo,
    RefreshToken,
    UserTokenVersion,
} from '../types/index.js';
import { JWT_REFRESH_SECRET } from '../config/env.js';

const router = express.Router();
//Widen scope of refresh path to /api/auth instead of /api/auth/refresh so cookie is also sent on logout.
const REFRESH_PATH = '/api/auth';

const cookieSettings: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: REFRESH_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieSettings: CookieOptions = {
    httpOnly: true,
    path: REFRESH_PATH,
};

type RefreshTokenResult = {
    refreshToken: string;
    tokenVersion: number;
};

//Register new user
router.post(
    '/register',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            //validate user
            const user: CreateUser = req.body;
            isValidUser(user);

            //hash password
            const hash = await bcrypt.hash(user.password, 10);

            //save to db
            const sql =
                'INSERT INTO users(email, password_hash, name) VALUES ($1, $2, $3) RETURNING *;';
            const values = [user.email, hash, user.name];
            const result = await query<User>(sql, values);

            res.status(201).json({
                message: 'New user created.',
                user: result[0],
            });
        } catch (error) {
            next(error);
        }
    },
);

//Login user
router.post(
    '/login',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            //validate email and password
            const login: LoginUser = req.body;
            isValidEmail(login.email);
            isValidPassword(login.password);

            const sql =
                'SELECT id, email, name, password_hash as "passwordHash", token_version as "tokenVersion" FROM users WHERE email = $1;';
            const result = await query<User>(sql, [login.email]);
            const user = result[0];

            if (!user) {
                throw new AuthenticationError(
                    'Invalid email or password.',
                    ERROR_CODES.AUTHENTICATION_FAILED,
                );
            }

            const passwordMatched = await bcrypt.compare(
                login.password,
                user.passwordHash,
            );

            if (!passwordMatched) {
                throw new AuthenticationError(
                    'Invalid email or password.',
                    ERROR_CODES.AUTHENTICATION_FAILED,
                );
            }

            //revoke all tokens before generating new one
            //Tradeoff: this kils all sessions on all devices on every login.
            //In the future, if adding multi-devire support, must switch to token family model or per-device revocation.
            await revokeAllUserTokens(user.id);

            //generate refresh token
            const payload: JwtPayload = {
                sub: String(user.id),
                email: user.email,
                name: user.name,
            };

            const {
                refreshToken: newRefreshToken,
                tokenVersion: newTokenVersion,
            } = await createNewRefreshToken(payload);

            //generate access token
            const newAccessToken = generateAccessToken({
                ...payload,
                token_version: newTokenVersion,
            });

            //send refreshToken via cookie, and acessToken via response
            res.cookie('refreshToken', newRefreshToken, cookieSettings);

            return res.json({
                message: 'Login successful.',
                access_token: newAccessToken,
            });
        } catch (error) {
            next(error);
        }
    },
);

//Refresh token
router.post(
    '/refresh',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            //get refresh token from cookie
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                throw new AuthenticationError('Missing refresh token.');
            }

            let user: BasicUserInfo;

            try {
                //verify token integrity and expiry
                const decoded = await jwt.verify(
                    refreshToken,
                    JWT_REFRESH_SECRET,
                );

                if (
                    !decoded ||
                    typeof decoded === 'string' ||
                    !decoded.email ||
                    !decoded.name
                ) {
                    throw new Error('Failed to decode new refresh token.');
                }

                const { sub, email, name } = decoded;
                user = { id: Number(sub), email, name };
            } catch (error) {
                throw new AuthenticationError('Invalid or expired token.');
            }

            //verify token hash exists in db and not yet revoked
            const refreshTokenHash = crypto
                .createHash('sha256')
                .update(refreshToken)
                .digest('hex');

            const result = await pool.query(
                'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2;',
                [user.id, refreshTokenHash],
            );

            //Refresh token doesn't exist or already revoked. Potential theft; revoke all refresh tokens of the user.
            if (result.rows.length === 0 || result.rows[0].revoked_at) {
                await revokeAllUserTokens(user.id);
                res.clearCookie('refreshToken', clearCookieSettings);
                throw new AuthenticationError('Invalid token.');
            }

            //generate new refresh token
            const payload: JwtPayload = {
                sub: String(user.id),
                email: user.email,
                name: user.name,
            };

            const {
                refreshToken: newRefreshToken,
                tokenVersion: newTokenVersion,
            } = await createNewRefreshToken(payload, refreshTokenHash);

            //generate access token
            const newAccessToken = generateAccessToken({
                ...payload,
                token_version: newTokenVersion,
            });

            //send refreshToken via cookie, and acessToken via response
            res.cookie('refreshToken', newRefreshToken, cookieSettings);

            return res.json({
                message: 'New accesss token generated.',
                access_token: newAccessToken,
            });
        } catch (error) {
            next(error);
        }
    },
);

//Logout user
router.post(
    '/logout',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (refreshToken) {
                const decoded = await jwt.verify(
                    refreshToken,
                    JWT_REFRESH_SECRET,
                );

                if (decoded?.sub) {
                    await revokeAllUserTokens(Number(decoded.sub));
                }
            }
            res.clearCookie('refreshToken', clearCookieSettings);
            res.sendStatus(204);
        } catch (error) {
            //always clear cookie
            res.clearCookie('refreshToken', clearCookieSettings);
            next(error);
        }
    },
);

async function revokeAllUserTokens(userId: number) {
    await withTransaction(async (client) => {
        await client.query(
            'UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL;',
            [new Date(), userId],
        );

        //Increment token version to make all access tokens generated with prev token version invalid.
        await client.query(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1;',
            [userId],
        );
    });
}

async function createNewRefreshToken(
    payload: JwtPayload,
    oldRefreshTokenHash: string | undefined = undefined,
): Promise<RefreshTokenResult> {
    const userId = payload.sub;

    //generate refresh token and store in db
    const newRefreshToken = generateRefreshToken(payload);
    const newRefreshTokenHash = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');
    const decoded = jwt.decode(newRefreshToken);

    if (!decoded || typeof decoded === 'string' || !decoded.exp) {
        throw new Error('Failed to decode new refresh token.');
    }

    const expDate = new Date(decoded.exp * 1000);

    const refreshTokenResult = await withTransaction(async (client) => {
        const tokenResult = await client.query<RefreshToken>(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id as userId, token_hash as tokenHash;',
            [userId, newRefreshTokenHash, expDate],
        );

        if (!tokenResult.rows[0]) {
            throw new Error('Failed to create new refresh token.');
        }

        if (oldRefreshTokenHash) {
            const revokeOldTokenResult = await client.query(
                'UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND token_hash = $3;',
                [new Date(), userId, oldRefreshTokenHash],
            );

            if (revokeOldTokenResult.rowCount === 0) {
                throw new Error('Failed to revoke old refresh token.');
            }
        }

        const tokenVersionResult = await client.query<UserTokenVersion>(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING id, email, token_version as tokenVersion;',
            [userId],
        );

        //add token version to payload
        const tokenVersionRow = tokenVersionResult.rows[0];

        if (!tokenVersionRow) {
            throw new Error('Failed to update token version.');
        }

        return {
            refreshToken: newRefreshToken,
            tokenVersion: tokenVersionRow.tokenVersion,
        };
    });

    return refreshTokenResult;
}

export default router;
