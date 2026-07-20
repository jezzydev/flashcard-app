import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticationError, ERROR_CODES } from '../utils/errors.js';
import pool from '../db/pool.js';
import { Request, Response, NextFunction } from 'express';
import { JWT_ACCESS_SECRET } from '../config/env.js';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (!token) {
            throw new AuthenticationError(
                'Missing access token.',
                ERROR_CODES.AUTHENTICATION_FAILED,
            );
        }

        let payload: JwtPayload = {};

        //verify token
        try {
            const decoded = await jwt.verify(token, JWT_ACCESS_SECRET);

            if (typeof decoded === 'object' && decoded !== null) {
                payload = decoded;
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
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
            [payload.sub],
        );

        if (
            result.rows.length === 0 ||
            result.rows[0].token_version !== payload.token_version
        ) {
            throw new AuthenticationError('Invalid token.');
        }

        req.user = payload;
        next();
    } catch (error) {
        next(error);
    }
};

export const softAuthenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const token = req.get('Authorization')?.split(' ')[1];

        if (token) {
            const decoded = await jwt.verify(token, JWT_ACCESS_SECRET);

            if (typeof decoded === 'object' && decoded !== null) {
                req.user = decoded as JwtPayload;
            }
        }
    } catch (error) {
        //invalid, expired or missing token is fine.
    }
    next(); //always continue
};
