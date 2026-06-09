export const togglePassword = (id) => {
    const pw = document.getElementById(id);
    pw.type = pw.type === 'password' ? 'text' : 'password';
};

export const clearErrorMsg = (input, error) => {
    input.classList.remove('isError');
    input.removeAttribute('aria-invalid');

    error.textContent = '';
    error.classList.remove('show');
};

export const showErrorMsg = (input, error, errorMsg) => {
    input.classList.remove('isSuccess');
    input.classList.add('isError');
    input.setAttribute('aria-invalid', true);

    error.textContent = errorMsg;
    error.classList.add('show');
};

export const extractUserData = (accessToken) => {
    const payload = accessToken.split('.')[1];
    return JSON.parse(decodeFromBase64(payload));
};

export const decodeFromBase64 = (encodedStr) => {
    const base64 = encodedStr.replace(/-/g, '+').replace(/_/, '/');
    return atob(base64);
};

export const fetchTemplate = async (templateFilename, templateId) => {
    const response = await fetch(templateFilename);
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    return doc.getElementById(templateId);
};
