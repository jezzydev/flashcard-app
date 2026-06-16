const authState = {
    accessToken: null,
};

export const setAccessToken = (token) => {
    authState.accessToken = token;
};

export const getAccessToken = () => authState.accessToken;

export const clearAccessToken = () => {
    authState.accessToken = null;
};

export const isLoggedIn = () => !!authState.accessToken;

//TODO: save token into sessionStorage
