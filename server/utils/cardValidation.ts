import { ValidationError, ERROR_CODES } from './errors.js';
import { CreateCard, UpdateCard } from '../types/index.js';
import { assertValidId } from './validationHelper.js';

export function assertValidCardId(id: unknown): asserts id is number {
    assertValidId(id, 'cardId');
}

export function assertValidCardFront(front: unknown): asserts front is string {
    const field = 'front';

    if (!front)
        throw new ValidationError(
            'Front text (question) is required.',
            field,
            ERROR_CODES.REQUIRED,
        );

    if (typeof front !== 'string')
        throw new ValidationError(
            'Front text (question) must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );
}

export function assertValidCardBack(back: unknown): asserts back is string {
    const field = 'back';

    if (!back)
        throw new ValidationError(
            'Back text (answer) is required.',
            field,
            ERROR_CODES.REQUIRED,
        );

    if (typeof back !== 'string')
        throw new ValidationError(
            'Back text (answer) must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );
}

export function assertValidCreateCard(card: any): asserts card is CreateCard {
    assertValidCardFront(card.front);
    assertValidCardBack(card.back);
}

export function assertValidUpdateCard(card: any): asserts card is UpdateCard {
    if (card.front !== undefined) assertValidCardFront(card.front);
    if (card.back !== undefined) assertValidCardBack(card.back);
}
