import { ValidationError, ERROR_CODES } from './errors.js';
import { CreateCard, UpdateCard } from '../types/index.js';

export function assertValidCardId(id: unknown): asserts id is number {
    const field = 'id';
    const num = Number(id);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid card id.',
            field,
            ERROR_CODES.INVALID,
        );
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

export function assertValidCreateCard(card: CreateCard): void {
    assertValidCardFront(card.front);
    assertValidCardBack(card.back);
}

export function assertValidUpdateCard(card: UpdateCard): void {
    if (card.front !== undefined) assertValidCardFront(card.front);
    if (card.back !== undefined) assertValidCardBack(card.back);
}
