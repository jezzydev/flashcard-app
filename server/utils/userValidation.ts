import { ValidationError, ERROR_CODES } from './errors.js';

export function assertValidUserEmail(email: unknown): asserts email is string {
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
}

export type ValidatedEmail = string & { readonly __brand: 'ValidatedEmail' };

export function assertValidUserEmailForm(
    email: string,
): asserts email is ValidatedEmail {
    const field = 'email';
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

export function assertValidUserPassword(
    password: unknown,
): asserts password is string {
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
}

export type ValidatedPassword = string & {
    readonly __brand: 'ValidatedPassword';
};

export function assertValidUserPasswordForm(
    password: string,
): asserts password is ValidatedPassword {
    const field = 'password';

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

export function assertValidUserName(name: unknown): asserts name is string {
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
