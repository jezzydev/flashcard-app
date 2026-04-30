const errorHandler = (err, req, res, next) => {
    console.log(`Error: ${err}`);

    //PostgreSQL error codes
    //FK violation
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

    return res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal Server Error', data: err });
};

export default errorHandler;
