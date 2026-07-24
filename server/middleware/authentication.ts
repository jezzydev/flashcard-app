import jwt, { JwtPayload } from 'jsonwebtoken';
import {
    AuthenticationError,
    AuthorizationError,
    ERROR_CODES,
} from '../utils/errors.js';
import { query } from '../db/query.js';
import { Request, Response, NextFunction } from 'express';
import { JWT_ACCESS_SECRET } from '../config/env.js';
import {
    UserTokenVersion,
    AuthPayload,
    RefreshTokenPayload,
} from '../types/index.js';

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

        let authPayload: AuthPayload;

        //verify token
        try {
            const decoded = await jwt.verify(token, JWT_ACCESS_SECRET);
            assertJwtPayload(decoded);
            authPayload = toAuthPayload(decoded);
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
        const result = await query<UserTokenVersion>(
            'SELECT id, email, token_version as "tokenVersion" FROM users WHERE id = $1;',
            [authPayload.sub],
        );

        if (!result[0] || result[0].tokenVersion !== authPayload.tokenVersion) {
            throw new AuthenticationError('Invalid token.');
        }

        req.user = authPayload;
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
                req.user = decoded as AuthPayload;
            }
        }
    } catch (error) {
        //invalid, expired or missing token is fine.
    }
    next(); //always continue
};

export function isJwtPayload(
    payload: JwtPayload | string,
): payload is JwtPayload {
    return typeof payload !== 'string';
}

export function assertJwtPayload(
    payload: JwtPayload | string,
): asserts payload is JwtPayload {
    if (typeof payload === 'string') {
        throw new Error('Invalid payload.');
    }
}

function toAuthPayload(decoded: JwtPayload): AuthPayload {
    const { sub, email, name, tokenVersion } = decoded;
    if (
        sub === undefined ||
        email === undefined ||
        name === undefined ||
        tokenVersion === undefined
    ) {
        throw new AuthenticationError('Incomplete token payload.');
    }

    return { sub, email, name, tokenVersion };
}

export function toRefreshTokenPayload(
    decoded: JwtPayload,
): RefreshTokenPayload {
    const { sub, email, name, jti, exp } = decoded;
    if (
        sub === undefined ||
        email === undefined ||
        name === undefined ||
        jti === undefined ||
        exp === undefined
    ) {
        throw new AuthenticationError('Incomplete refresh token payload.');
    }

    return { sub, email, name, jti, exp };
}
