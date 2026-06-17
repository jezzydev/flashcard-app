import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from '../../client/js/auth.js';

describe('auth', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('returns null when no token has been set', () => {
        expect(getAccessToken()).toBeNull();
    });

    it('stores the token in sessionStorage', () => {
        setAccessToken('abc123');

        expect(sessionStorage.getItem('accessToken')).toBe('abc123');
        expect(getAccessToken()).toBe('abc123');
    });

    it('overwrites a previously stored token', () => {
        setAccessToken('first-token');
        setAccessToken('second-token');

        expect(getAccessToken()).toBe('second-token');
    });

    it('removes the token from sessionStorage', () => {
        setAccessToken('abc123');

        clearAccessToken();

        expect(getAccessToken()).toBeNull();
    });

    it('does not touch other sessionStorage keys', () => {
        sessionStorage.setItem('unrelated', 'keep-me');
        setAccessToken('abc123');

        clearAccessToken();

        expect(sessionStorage.getItem('unrelated')).toBe('keep-me');
    });
});
