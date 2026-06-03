const authState = {
    accessToken: null,
};

export const setToken = (token) => {
    authState.accessToken = token;
};

export const getToken = () => authState.accessToken;

export const clearToken = () => {
    authState.accessToken = null;
};

export const isLoggedIn = () => !!authState.accessToken;
