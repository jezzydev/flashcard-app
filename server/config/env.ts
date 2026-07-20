import ms, { StringValue } from 'ms';

function requireEnv(key: string): string {
    const value = process.env[key];

    if (!value) {
        console.log(`Missing required env var: ${key}`);
        process.exit(1);
    }

    return value;
}

function isValidMsFormat(value: string): value is StringValue {
    try {
        return typeof ms(value as StringValue) === 'number';
    } catch {
        return false;
    }
}

function requireMsFormat(value: string, fallback: StringValue): StringValue {
    return isValidMsFormat(value) ? value : fallback;
}

export const JWT_ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');
export const JWT_ACCESS_EXPIRES_IN: StringValue = requireMsFormat(
    process.env.JWT_ACCESS_EXPIRES_IN ?? '',
    '10m',
);
export const JWT_REFRESH_EXPIRES_IN: StringValue = requireMsFormat(
    process.env.JWT_REFRESH_EXPIRES_IN ?? '',
    '7d',
);
