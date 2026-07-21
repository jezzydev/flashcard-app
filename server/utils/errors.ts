class ErrorBase extends Error {
    constructor(
        message: string,
        public errorCode: string,
        public status: number,
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

class ValidationError extends ErrorBase {
    constructor(
        message: string,
        public field: string = '',
        errorCode = ERROR_CODES.VALIDATION_ERROR,
    ) {
        super(message, errorCode, 400);
    }
}

class NotFoundError extends ErrorBase {
    constructor(message: string, errorCode = ERROR_CODES.NOT_FOUND) {
        super(message, errorCode, 404);
    }
}

class AuthenticationError extends ErrorBase {
    constructor(message: string, errorCode = ERROR_CODES.INVALID_TOKEN) {
        super(message, errorCode, 401);
    }
}

class AuthorizationError extends ErrorBase {
    constructor(message: string, errorCode = ERROR_CODES.UNAUTHORIZED_ACCESS) {
        super(message, errorCode, 403);
    }
}

const ERROR_CODES = {
    REQUIRED: 'REQUIRED',
    INVALID: 'INVALID',
    INVALID_TYPE: 'INVALID_TYPE',
    INVALID_LENGTH: 'INVALID_LENGTH',
    INVALID_FORMAT: 'INVALID_FORMAT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    INVALID_TOKEN: 'INVALID_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
};

export {
    ErrorBase,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    ERROR_CODES,
};
