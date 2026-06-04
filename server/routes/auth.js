import express from 'express';
import pool from '../db/pool.js';
import {
    isValidEmail,
    isValidPassword,
    isValidUser,
} from '../utils/userValidation.js';
import bcrypt from 'bcrypt';
import { AuthenticationError, ERROR_CODES } from '../utils/errors.js';
import jwt from 'jsonwebtoken';
import {
    generateAccessToken,
    generateRefreshToken,
} from '../utils/tokenGen.js';
import crypto from 'crypto';
import { tracingChannel } from 'diagnostics_channel';
import { softAuthenticate } from '../middleware/authentication.js';

const router = express.Router();
const REFRESH_PATH = '/api/auth/refresh';

const cookieSettings = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: REFRESH_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieSettings = {
    httpOnly: true,
    path: REFRESH_PATH,
};

//Register new user
router.post('/register', async (req, res, next) => {
    try {
        //validate user
        const user = req.body;
        isValidUser(user);

        //hash password
        const hash = await bcrypt.hash(user.password, 10);

        //save to db
        const query =
            'INSERT INTO users(email, password_hash, name) VALUES ($1, $2, $3) RETURNING email, created_at;';
        const values = [user.email, hash, user.name];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'New user created.',
            user: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

//Login user
router.post('/login', async (req, res, next) => {
    try {
        //validate email and password
        const input = req.body;
        isValidEmail(input.email);
        isValidPassword(input.password);

        const query =
            'SELECT id, email, name, password_hash, token_version FROM users WHERE email = $1;';
        const result = await pool.query(query, [input.email]);

        if (result.rows.length === 0) {
            throw new AuthenticationError(
                'Invalid email or password.',
                ERROR_CODES.AUTHENTICATION_FAILED,
            );
        }

        const user = result.rows[0];
        const passwordMatched = await bcrypt.compare(
            input.password,
            user.password_hash,
        );

        if (!passwordMatched) {
            throw new AuthenticationError(
                'Invalid email or password.',
                ERROR_CODES.AUTHENTICATION_FAILED,
            );
        }

        //generate refresh token
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
        };

        const newRefreshToken = await createNewRefreshToken(payload);

        //generate access token
        const newAccessToken = generateAccessToken(payload);

        //send refreshToken via cookie, and acessToken via response
        res.cookie('refreshToken', newRefreshToken, cookieSettings);

        return res.json({
            message: 'Login successful.',
            access_token: newAccessToken,
        });
    } catch (error) {
        next(error);
    }
});

//Refresh token
router.post('/refresh', async (req, res, next) => {
    try {
        //get refresh token from cookie
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new AuthenticationError('Missing refresh token.');
        }

        let user = {};

        try {
            //verify token integrity and expiry
            const decoded = await jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET,
            );
            ({ sub: user.id, email: user.email, name: user.name } = decoded);
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
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
        };

        const newRefreshToken = await createNewRefreshToken(
            payload,
            refreshTokenHash,
        );

        //generate access token
        const newAccessToken = generateAccessToken(payload);

        //send refreshToken via cookie, and acessToken via response
        res.cookie('refreshToken', newRefreshToken, cookieSettings);

        return res.json({
            message: 'New refresh token generated.',
            access_token: newAccessToken,
        });
    } catch (error) {
        next(error);
    }
});

//Logout user
router.post('/logout', softAuthenticate, async (req, res, next) => {
    try {
        if (req.user?.sub) {
            await revokeAllUserTokens(req.user.sub);
        }
        res.clearCookie('refreshToken', clearCookieSettings);
        res.sendStatus(204);
    } catch (error) {
        //always clear cookie
        res.clearCookie('refreshToken', clearCookieSettings);
        next(error);
    }
});

async function revokeAllUserTokens(userId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL;',
            [new Date(), userId],
        );

        //Increment token version to make all access tokens generated with prev token version invalid.
        await client.query(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1;',
            [userId],
        );
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.release;
    }
}

async function createNewRefreshToken(payload, oldRefreshTokenHash = undefined) {
    const userId = payload.sub;

    //generate refresh token and store in db
    const newRefreshToken = generateRefreshToken(payload);
    const newRefreshTokenHash = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');
    const expDate = new Date(jwt.decode(newRefreshToken).exp * 1000);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3);',
            [userId, newRefreshTokenHash, expDate],
        );

        if (!oldRefreshTokenHash) {
            await client.query(
                'UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND token_hash = $3;',
                [new Date(), userId, oldRefreshTokenHash],
            );
        }

        const tokenResult = await client.query(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version;',
            [userId],
        );

        //add token version to payload
        if (tokenResult.rows.length !== 0) {
            payload.token_version = tokenResult.rows[0].token_version;
        }

        await client.query('COMMIT');
        return newRefreshToken;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.release();
    }
}

export default router;
