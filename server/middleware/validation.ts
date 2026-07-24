import { Request, Response, NextFunction } from 'express';
import { ValidationError, ERROR_CODES } from '../utils/errors.js';

declare module 'express-serve-static-core' {
    interface Request {
        validated: {
            body?: unknown;
            params?: Record<string, number>;
            query?: Record<string, string>;
        };
        // validatedIds?: Record<string, number>;
    }
}

export function validateIdParam(paramName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const id = Number(req.params[paramName]);

        if (!Number.isInteger(id) || id < 1) {
            return next(
                new ValidationError(
                    `Invalid ${paramName}.`,
                    paramName,
                    ERROR_CODES.INVALID,
                ),
            );
        }

        req.validated.params = { ...req.validated.params, [paramName]: id };
        next();
    };
}

export function validateBody<T>(typeGuard: (data: any) => asserts data is T) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.body || typeof req.body !== 'object') {
            throw new ValidationError(
                'Invalid request body structure.',
                'body',
                ERROR_CODES.INVALID_FORMAT,
            );
        }

        typeGuard(req.body);
        req.validated.body = req.body;
        next();
    };
}
