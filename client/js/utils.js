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
