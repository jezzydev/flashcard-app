import { ValidationError, ERROR_CODES } from './errors.js';
import { assertValidId } from './validationHelper.js';

export function assertValidStudySessionId(id: unknown): asserts id is number {
    assertValidId(id, 'sessionId');
}

export type CardRating = 0 | 1 | 2 | 3 | 4 | 5;

export function assertValidCardRating(
    rating: unknown,
): asserts rating is CardRating {
    const field = 'rating';

    if (typeof rating !== 'number' || !Number.isInteger(rating)) {
        throw new ValidationError(
            'Invalid card rating.',
            field,
            ERROR_CODES.INVALID,
        );
    }

    if (rating < 0 || rating > 5)
        throw new ValidationError(
            'Rating should be 0-5.',
            field,
            ERROR_CODES.INVALID,
        );
}
