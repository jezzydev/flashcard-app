class ApiClient {
    constructor(baseUrl, defaultHeaders = {}) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = defaultHeaders;
    }

    async #request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('URL:', url);
        const headers = {
            'Content-Type': 'application/json',
            ...this.defaultHeaders,
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
        };

        //Stringify body for non-GET requests
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            //Handle 204 - No content
            if (response.status === 204) {
                return null;
            }

            //Parse JSON response
            const data = await response.json();

            //Parse JSON response
            if (!response.ok) {
                throw new Error(
                    data.message || `HTTP Error! Status: ${response.status}`,
                );
            }

            return data;
        } catch (error) {
            console.error(`Fetch error: ${error}`);
            throw error;
        }
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
}

const API_BASE_URL = '';

const api = new ApiClient(`${API_BASE_URL}`, {
    Authorization: 'Bearer AUTH_TOKEN',
});

export default api;
