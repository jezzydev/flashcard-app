import { ValidationError, ERROR_CODES } from './errors.js';

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
