import * as util from '../utils.js';
import api from '../api.js';
import * as auth from '../auth.js';

const loginForm = document.querySelector('.LoginForm');
const togglePw = document.querySelector('.TogglePassword');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email');
    const emailError = document.getElementById('login-email-error');
    const pw = document.getElementById('login-password');
    const pwError = document.getElementById('login-password-error');

    //validate inputs
    const isValidEmail = validateEmail(email, emailError);
    const isValidPassword = validatePassword(pw, pwError);

    //submit form
    if (isValidEmail && isValidPassword) {
        try {
            const data = await api.post('/api/auth/login', {
                email: email.value,
                password: pw.value,
            });

            auth.setToken(data.access_token);
            window.location.replace('./dashboard.html');
            return;
        } catch (error) {
            email.classList.remove('isSuccess');
            pw.classList.remove('isSuccess');
            showErrorMsg(
                null,
                document.getElementById('login-password-error'),
                error.message,
            );
        }
    }
});

togglePw.addEventListener('click', () => {
    util.togglePassword('login-password');
});

function validateEmail(input, error) {
    const valid = /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(input.value);

    if (!valid) {
        showErrorMsg(input, error, 'Enter a valid email address');
        return false;
    }

    clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validatePassword(input, error) {
    if (!input.value) {
        showErrorMsg(input, error, 'Enter password');
        return false;
    }

    clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function clearErrorMsg(input, error) {
    if (input !== undefined && input !== null) {
        input.classList.remove('isError');
        input.removeAttribute('aria-invalid');
    }

    error.textContent = '';
    error.classList.remove('show');
}

function showErrorMsg(input, error, errorMsg) {
    if (input !== undefined && input !== null) {
        input.classList.add('isError');
        input.setAttribute('aria-invalid', true);
    }

    error.textContent = errorMsg;
    error.classList.add('show');
}
