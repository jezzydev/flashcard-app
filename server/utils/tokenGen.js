import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export const generateRefreshToken = (payload) => {
    return jwt.sign(
        { ...payload, jti: randomUUID() },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        },
    );
};

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '10m',
    });
};
