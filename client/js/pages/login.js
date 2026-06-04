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
            const formError = document.getElementById('login-form-error');
            formError.textContent = error.message;
            formError.classList.add('show');
        }
    }
});

togglePw.addEventListener('click', () => {
    util.togglePassword('reg-password');
});

function validateEmail(input, error) {
    const valid = /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(input.value);

    if (!valid) {
        util.showErrorMsg(input, error, 'Enter a valid email address.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validatePassword(input, error) {
    if (!input.value) {
        util.showErrorMsg(input, error, 'Enter password.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}
