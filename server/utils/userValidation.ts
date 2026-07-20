import { ValidationError, ERROR_CODES } from './errors.js';
import { CreateUser } from '../types/index.js';

export const isValidEmail = (email: string, isNew = false): boolean => {
    const field = 'email';

    if (!email)
        throw new ValidationError(
            'Email is required.',
            field,
            ERROR_CODES.REQUIRED,
        );

    if (typeof email !== 'string')
        throw new ValidationError(
            'Email must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );

    if (isNew) {
        const trimmed = email.trim();
        if (trimmed.length > 255)
            throw new ValidationError(
                'Email must not exceed 255 characters.',
                field,
                ERROR_CODES.INVALID_LENGTH,
            );

        const regex = /([^@\s]+)@([^@\s]+)\.([^@\s])+/;
        if (!regex.test(trimmed))
            throw new ValidationError(
                'Email is invalid.',
                field,
                ERROR_CODES.INVALID_FORMAT,
            );
    }

    return true;
};

export const isValidPassword = (password: string, isNew = false): boolean => {
    const field = 'password';

    if (!password)
        throw new ValidationError(
            'Password is required.',
            field,
            ERROR_CODES.REQUIRED,
        );

    if (typeof password !== 'string')
        throw new ValidationError(
            'Password must be a string.',
            field,
            ERROR_CODES.INVALID_TYPE,
        );

    if (isNew) {
        if (password.length > 255 || password.length < 8)
            throw new ValidationError(
                'Password must be 8-255 characters.',
                field,
                ERROR_CODES.INVALID_LENGTH,
            );

        //At least 1 digit, 1 uppercase, 1 lowercase. Spaces and special characters are allowed.
        const regex = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z]).+$/;
        if (!regex.test(password))
            throw new ValidationError(
                'Password must have at least 1 digit, 1 uppercase and 1 lowercase character.',
                field,
                ERROR_CODES.INVALID_FORMAT,
            );
    }

    return true;
};

export const isValidName = (name: string): boolean => {
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

export const isValidUser = (user: CreateUser): boolean => {
    isValidEmail(user.email, true);
    isValidPassword(user.password, true);
    isValidName(user.name);
    return true;
};
