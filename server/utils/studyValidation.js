import { ValidationError, ERROR_CODES } from './errors.js';

export const isValidStudySessionId = (id) => {
    const field = 'id';
    const num = Number(id);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid study session id.',
            field,
            ERROR_CODES.INVALID,
        );

    return true;
};

export const isValidCardRating = (rating) => {
    const field = 'rating';

    const num = Number(rating);

    if (isNaN(num) || !Number.isInteger(num) || num <= 0)
        throw new ValidationError(
            'Invalid card rating.',
            field,
            ERROR_CODES.INVALID,
        );

    if (num < 0 || num > 5)
        throw new ValidationError(
            'Rating should be 0-5.',
            field,
            ERROR_CODES.INVALID,
        );
    return true;
};
