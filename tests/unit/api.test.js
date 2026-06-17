import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../client/js/api.js';
import { setAccessToken } from '../../client/js/auth.js';

function jsonResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    };
}

describe('ApiClient', () => {
    let fetchMock;

    beforeEach(() => {
        sessionStorage.clear();
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('location', { ...window.location, replace: vi.fn() });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('get/post/put/delete', () => {
        it('sends a GET request with the bearer token attached', async () => {
            setAccessToken('my-token');
            fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

            await api.get('/api/decks');

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/decks',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer my-token',
                        'Content-Type': 'application/json',
                    }),
                }),
            );
        });

        it('sends "Bearer null" when there is no access token', async () => {
            fetchMock.mockResolvedValue(jsonResponse(200, {}));

            await api.get('/api/decks');

            const [, config] = fetchMock.mock.calls[0];
            expect(config.headers.Authorization).toBe('Bearer null');
        });

        it('JSON-stringifies an object body on POST', async () => {
            setAccessToken('my-token');
            fetchMock.mockResolvedValue(jsonResponse(201, {}));

            await api.post('/api/decks', { name: 'Spanish' });

            const [url, config] = fetchMock.mock.calls[0];
            expect(url).toBe('/api/decks');
            expect(config.method).toBe('POST');
            expect(config.body).toBe(JSON.stringify({ name: 'Spanish' }));
        });

        it('JSON-stringifies an object body on PUT', async () => {
            setAccessToken('my-token');
            fetchMock.mockResolvedValue(jsonResponse(200, {}));

            await api.put('/api/decks/1', { name: 'Updated' });

            const [, config] = fetchMock.mock.calls[0];
            expect(config.method).toBe('PUT');
            expect(config.body).toBe(JSON.stringify({ name: 'Updated' }));
        });

        it('sends a DELETE request with no body', async () => {
            setAccessToken('my-token');
            fetchMock.mockResolvedValue(jsonResponse(204, {}));

            await api.delete('/api/decks/1');

            const [url, config] = fetchMock.mock.calls[0];
            expect(url).toBe('/api/decks/1');
            expect(config.method).toBe('DELETE');
            expect(config.body).toBeUndefined();
        });

        it('lets caller-supplied headers extend the default headers', async () => {
            setAccessToken('my-token');
            fetchMock.mockResolvedValue(jsonResponse(200, {}));

            await api.get('/api/decks', { 'X-Custom': 'yes' });

            const [, config] = fetchMock.mock.calls[0];
            expect(config.headers['X-Custom']).toBe('yes');
        });

        it('resolves with the response when the request does not 401', async () => {
            setAccessToken('my-token');
            const response = jsonResponse(200, { decks: [] });
            fetchMock.mockResolvedValue(response);

            const result = await api.get('/api/decks');

            expect(result).toBe(response);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('401 handling', () => {
        it('silently refreshes and retries the original request on 401', async () => {
            setAccessToken('expired-token');
            const finalResponse = jsonResponse(200, { decks: [] });

            fetchMock.mockImplementation((url) => {
                if (url === '/api/decks') {
                    if (fetchMock.mock.calls.length === 1) {
                        return Promise.resolve(jsonResponse(401, {}));
                    }
                    return Promise.resolve(finalResponse);
                }
                if (url === '/api/auth/refresh') {
                    return Promise.resolve(
                        jsonResponse(200, { access_token: 'new-token' }),
                    );
                }
                throw new Error(`Unexpected fetch to ${url}`);
            });

            const result = await api.get('/api/decks');

            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                '/api/auth/refresh',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                }),
            );
            const [, retryConfig] = fetchMock.mock.calls[2];
            expect(retryConfig.headers.Authorization).toBe('Bearer new-token');
            expect(result).toBe(finalResponse);
        });

        it('re-sends the JSON-stringified body when retrying a POST after refresh', async () => {
            setAccessToken('expired-token');
            const finalResponse = jsonResponse(201, {});

            fetchMock.mockImplementation((url) => {
                if (url === '/api/decks') {
                    if (fetchMock.mock.calls.length === 1) {
                        return Promise.resolve(jsonResponse(401, {}));
                    }
                    return Promise.resolve(finalResponse);
                }
                if (url === '/api/auth/refresh') {
                    return Promise.resolve(
                        jsonResponse(200, { access_token: 'new-token' }),
                    );
                }
                throw new Error(`Unexpected fetch to ${url}`);
            });

            await api.post('/api/decks', { name: 'Spanish' });

            const [, retryConfig] = fetchMock.mock.calls[2];
            expect(retryConfig.body).toBe(JSON.stringify({ name: 'Spanish' }));
            expect(retryConfig.headers.Authorization).toBe('Bearer new-token');
        });

        it('stores the refreshed token via auth.js', async () => {
            setAccessToken('expired-token');
            let calls = 0;
            fetchMock.mockImplementation((url) => {
                if (url === '/api/decks') {
                    calls += 1;
                    return Promise.resolve(
                        calls === 1
                            ? jsonResponse(401, {})
                            : jsonResponse(200, {}),
                    );
                }
                return Promise.resolve(
                    jsonResponse(200, { access_token: 'new-token' }),
                );
            });

            await api.get('/api/decks');

            expect(sessionStorage.getItem('accessToken')).toBe('new-token');
        });

        it('redirects to index.html and returns nothing when refresh fails', async () => {
            setAccessToken('expired-token');
            fetchMock.mockImplementation((url) => {
                if (url === '/api/decks') {
                    return Promise.resolve(jsonResponse(401, {}));
                }
                if (url === '/api/auth/refresh') {
                    return Promise.resolve(jsonResponse(401, {}));
                }
                throw new Error(`Unexpected fetch to ${url}`);
            });

            const result = await api.get('/api/decks');

            expect(window.location.replace).toHaveBeenCalledWith(
                './index.html',
            );
            expect(result).toBeUndefined();
        });
    });

    describe('tryRefresh', () => {
        it('returns the new access token on success', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse(200, { access_token: 'fresh-token' }),
            );

            const token = await api.tryRefresh();

            expect(token).toBe('fresh-token');
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/auth/refresh',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                }),
            );
        });

        it('returns null when the refresh response is not ok', async () => {
            fetchMock.mockResolvedValue(jsonResponse(401, {}));

            const token = await api.tryRefresh();

            expect(token).toBeNull();
        });

        it('returns null when fetch throws', async () => {
            fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

            const token = await api.tryRefresh();

            expect(token).toBeNull();
        });
    });

    describe('logout', () => {
        it('posts to /api/auth/logout with credentials included', async () => {
            fetchMock.mockResolvedValue(jsonResponse(204, {}));

            await api.logout();

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                }),
            );
        });
    });
});
