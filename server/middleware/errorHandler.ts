import { DatabaseError } from 'pg';
import { ValidationError } from '../utils/errors.js';
import { Request, Response, NextFunction } from 'express';
import { ErrorBase } from '../utils/errors.js';

const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    //PostgreSQL error codes
    //FK violation
    if (isPostgreError(err)) {
        if (err.code === '23503') {
            return res
                .status(400)
                .json({ message: 'Referenced record does not exist' });
        }

        //Unique constraint violation
        if (err.code === '23505') {
            const column = err.detail?.match(/Key \((\w+)\)/)?.[1];
            const message = column
                ? `${column} already exists`
                : 'Record already exists';

            return res.status(400).json({
                message: message,
                data: new ValidationError(message, column),
            });
        }

        //Invalid text representation
        if (err.code === '22P02') {
            return res.status(400).json({ message: 'Invalid data format' });
        }
    }

    if (isErrorBase(err)) {
        return res
            .status(err.status || 500)
            .json({
                message: err.message || 'Internal Server Error',
                ...(process.env.NODE_ENV !== 'production' && { data: err }),
            });
    }

    console.log(err);
    return res.status(500).json({ message: 'Internal Server Error' });
};

function isPostgreError(error: unknown): error is DatabaseError {
    return error instanceof DatabaseError;
}

function isErrorBase(error: unknown): error is ErrorBase {
    return error instanceof ErrorBase;
}

export default errorHandler;
