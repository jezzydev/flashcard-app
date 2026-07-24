import { ValidationError, ERROR_CODES } from './errors.js';
import { assertValidId } from './validationHelper.js';
import {
    CardRating,
    CreateSessionReview,
    CreateStudySession,
} from '../types/index.js';
import { assertValidCardId } from '../utils/cardValidation.js';
import { assertValidDeckId } from './deckValidation.js';

export function assertValidStudySessionId(id: unknown): asserts id is number {
    assertValidId(id, 'sessionId');
}

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

export function assertValidCreateStudySession(
    session: any,
): asserts session is CreateStudySession {
    assertValidDeckId(session.deckId);
}

export function assertValidCreateSessionReview(
    review: any,
): asserts review is CreateSessionReview {
    assertValidCardId(review.cardId);
    assertValidCardRating(review.rating);
}
