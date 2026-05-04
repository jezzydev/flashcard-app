import jwt from 'jsonwebtoken';
import { AuthenticationError, ERROR_CODES } from '../utils/errors.js';
import pool from '../db/pool.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (!token) {
            throw new AuthenticationError('Missing access token.');
        }

        let user;
        //verify token
        try {
            user = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError(
                    'Expired token.',
                    ERROR_CODES.EXPIRED_TOKEN,
                );
            } else {
                throw new AuthenticationError('Invalid token.');
            }
        }

        //verify token version
        const result = await pool.query(
            'SELECT token_version FROM users WHERE id = $1;',
            [user.sub],
        );

        if (
            result.rows.length === 0 ||
            result.rows[0].token_version !== user.token_version
        ) {
            throw new AuthenticationError('Invalid token.');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

export const softAuthenticate = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (token) {
            user = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            req.user = user;
        }
    } catch (error) {
        //invalid, expired or missing token is fine.
    }
    next(); //always continue
};
