// const authState = {
//     accessToken: null,
// };

export const setAccessToken = (token) => {
    //authState.accessToken = token;
    sessionStorage.setItem('accessToken', token);
};

//export const getAccessToken = () => authState.accessToken;
export const getAccessToken = () => sessionStorage.getItem('accessToken');

export const clearAccessToken = () => {
    //authState.accessToken = null;
    sessionStorage.removeItem('accessToken');
};
