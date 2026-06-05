import * as auth from './auth.js';
class ApiClient {
    constructor(baseUrl, defaultHeaders = {}) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = defaultHeaders;
    }

    async #request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = auth.getAccessToken();
        const headers = {
            'Content-Type': 'application/json',
            ...this.defaultHeaders,
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };

        const config = {
            ...options,
            headers,
        };

        //Stringify body for non-GET requests
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        let res = await fetch(url, config);

        //silent refresh
        if (res.status === 401) {
            const newToken = await this.tryRefresh();

            if (!newToken) {
                window.location.replace('./index.html');
                return;
            }

            auth.setAccessToken(newToken);

            //retry original request with the new access token
            return fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    Authorization: `Bearer ${newToken}`,
                },
            });
        }

        return res;
    }

    get(endpoint, headers) {
        return this.#request(endpoint, { method: 'GET', headers });
    }

    post(endpoint, body, headers) {
        return this.#request(endpoint, { method: 'POST', body, headers });
    }

    put(endpoint, body, headers) {
        return this.#request(endpoint, { method: 'PUT', body, headers });
    }

    delete(endpoint, headers) {
        return this.#request(endpoint, { method: 'DELETE', headers });
    }

    async tryRefresh() {
        try {
            const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!res) return null;

            const data = await res.json();
            return data.access_token;
        } catch (error) {
            return null;
        }
    }
}

const API_BASE_URL = '';

const api = new ApiClient(`${API_BASE_URL}`, {
    Authorization: 'Bearer AUTH_TOKEN',
});

export default api;
