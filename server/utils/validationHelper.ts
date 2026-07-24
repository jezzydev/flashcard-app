import { AuthPayload } from '../types/index.js';
import { ValidationError, ERROR_CODES } from './errors.js';
import { Request } from 'express';

export function assertValidId(
    id: unknown,
    field: string,
): asserts id is number {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
        throw new ValidationError(
            `Invalid ${field}.`,
            field,
            ERROR_CODES.INVALID,
        );
    }
}

export function getAuthPayload(req: Request): AuthPayload {
    if (!req.user) {
        throw new Error(
            `req.user is undefined - authenticateToken middleware was not applied to this route.`,
        );
    }

    return req.user as AuthPayload;
}

export function getValidatedId(req: Request, name: string): number {
    const id = req.validated.params?.[name];

    if (id === undefined) {
        throw new Error(
            `Missing validated id: ${name} - check middleware chain on this route.`,
        );
    }

    return id;
}

export function getValidatedBody<T>(req: Request): T {
    if (req.validated.body === undefined) {
        throw new Error(
            `req.validated.body is undefined - validateBody middleware was not applied to this route.`,
        );
    }

    return req.validated.body as T;
}
