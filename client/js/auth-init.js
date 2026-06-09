import * as auth from './auth.js';
import api from './api.js';

export const requireAuth = async () => {
    document.body.style.visibility = 'hidden';

    let token = auth.getAccessToken();

    if (!token) {
        token = await api.tryRefresh();
        auth.setAccessToken(token);
    }

    if (!token) {
        window.location.replace('./index.html');
        return null;
    }

    document.body.style.visibility = 'visible';
    return token;
};
