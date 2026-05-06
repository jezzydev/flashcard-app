import { ValidationError, ERROR_CODES } from './errors.js';

export const isValidDeckId = (id) => {
    const field = 'id';
    const num = Number(id);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid deck id.',
            field,
            ERROR_CODES.INVALID,
        );

    return true;
};

export const isValidName = (name) => {
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

    return true;
};

export const isValidDescription = (description) => {
    const field = 'description';

    if (description !== null && typeof description !== 'string')
        throw new ValidationError(
            'Name must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );

    return true;
};

export const isValidDeck = (deck) => {
    isValidName(deck.name);
    if (deck.description !== undefined) isValidDescription(deck.description);
    return true;
};
