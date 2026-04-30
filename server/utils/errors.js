class ErrorBase extends Error {
    constructor(message, errorCode, status) {
        super(message);
        this.name = this.constructor.name;
        this.errorCode = errorCode;
        this.status = status;
    }
}

class ValidationError extends ErrorBase {
    constructor(message, field = '', errorCode = 'VALIDATION_ERROR') {
        super(message, errorCode, 400);
        this.field = field;
    }
}

class NotFoundError extends ErrorBase {
    constructor(message, errorCode = 'NOT_FOUND') {
        super(message, errorCode, 404);
    }
}

class AuthenticationError extends ErrorBase {
    constructor(message, errorCode = 'NOT_AUTHENTICATED') {
        super(message, errorCode, 401);
    }
}

class AuthorizationError extends ErrorBase {
    constructor(message, errorCode = 'UNAUTHORIZED_ACCESS') {
        super(message, errorCode, 403);
    }
}

export {
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
};
