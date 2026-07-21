import { CreateDeck, UpdateDeck } from '../types/index.js';
import { ValidationError, ERROR_CODES } from './errors.js';

export function assertValidDeckId(id: unknown): asserts id is number {
    const field = 'id';
    const num = Number(id);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid deck id.',
            field,
            ERROR_CODES.INVALID,
        );
}

export function assertValidDeckName(name: unknown): asserts name is string {
    const field = 'name';

    if (!name)
        throw new ValidationError(
            'Name is required.',
            field,
            ERROR_CODES.REQUIRED,
        );

    if (typeof name !== 'string')
        throw new ValidationError(
            'Name must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );

    const trimmed = name.trim();
    if (trimmed.length > 255 || trimmed.length < 1)
        throw new ValidationError(
            'Name must be 1-255 characters.',
            field,
            ERROR_CODES.INVALID_LENGTH,
        );
}

export function assertValidDeckDescription(
    description: unknown,
): asserts description is string {
    const field = 'description';

    if (typeof description !== 'string')
        throw new ValidationError(
            'Description must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );
}

export function assertValidCreateDeck(deck: CreateDeck): void {
    assertValidDeckName(deck.name);
    if (deck.description !== undefined)
        assertValidDeckDescription(deck.description);
}

export function assertValidUpdateDeck(deck: UpdateDeck): void {
    if (deck.name !== undefined) assertValidDeckName(deck.name);
    if (deck.description !== undefined)
        assertValidDeckDescription(deck.description);
}
