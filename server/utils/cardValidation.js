import { ValidationError, ERROR_CODES } from './errors.js';

export const isValidCardId = (id) => {
    const field = 'id';
    const num = Number(id);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid card id.',
            field,
            ERROR_CODES.INVALID,
        );

    return true;
};

export const isValidFront = (front) => {
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

    return true;
};

export const isValidBack = (back) => {
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

    return true;
};

export const isValidCard = (card) => {
    isValidFront(card.front);
    isValidBack(card.back);
    return true;
};
