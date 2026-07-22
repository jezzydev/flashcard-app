import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import {
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
} from '../config/env.js';

export const generateRefreshToken = (payload: JwtPayload): string => {
    return jwt.sign({ ...payload, jti: randomUUID() }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
};

export const generateAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_ACCESS_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRES_IN,
    });
};
