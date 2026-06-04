import api from '../api.js';
import * as auth from '../auth.js';
import * as util from '../utils.js';

const regForm = document.querySelector('.RegisterForm');
const togglePasswords = document.querySelectorAll('.TogglePassword');

regForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name');
    const nameError = document.getElementById('reg-name-error');
    const email = document.getElementById('reg-email');
    const emailError = document.getElementById('reg-email-error');
    const pw = document.getElementById('reg-password');
    const pwError = document.getElementById('reg-password-error');
    const confPw = document.getElementById('reg-confirm-password');
    const confPwError = document.getElementById('reg-confirm-password-error');
    const terms = document.getElementById('reg-terms');
    const termsError = document.getElementById('reg-terms-error');

    //validate inputs
    const isValidName = validateName(name, nameError);
    const isValidEmail = validateEmail(email, emailError);
    const isValidPassword = validatePassword(pw, pwError);
    const isValidConfPassword = validateConfirmPassword(
        confPw,
        confPwError,
        pw.value,
    );
    const isValidTerms = validateTerms(terms, termsError);

    //submit form
    if (
        isValidName &&
        isValidEmail &&
        isValidPassword &&
        isValidConfPassword &&
        isValidTerms
    ) {
        try {
            const data = await api.post('/api/auth/register', {
                name: name.value,
                email: email.value,
                password: pw.value,
                terms: terms.checked,
            });

            //update toast message and redirect to login page after 2 sec
            if (data.user) {
                const toast = document.getElementById('success-toast');
                toast.classList.add('show');
                setTimeout(() => {
                    window.location.replace('./index.html');
                    return;
                }, 2000);
            }
        } catch (error) {
            const formError = document.getElementById('reg-form-error');
            formError.textContent = error.message;
            formError.classList.add('show');
        }
    }
});

togglePasswords.forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
        const input = document.querySelector(`input:has(+ #${toggle.id})`);
        util.togglePassword(`${input.id}`);
    });
});

function validateName(input, error) {
    if (!input.value) {
        util.showErrorMsg(input, error, 'Name is required.');
        return false;
    }

    let givenName = input.value.trim();
    if (givenName.length < 1 || givenName.length > 255) {
        util.showErrorMsg(input, error, 'Name must be 1-255 characters.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validateEmail(input, error) {
    const trimmed = input.value.trim();

    if (trimmed.length > 255) {
        util.showErrorMsg(
            input,
            error,
            'Email must not exceed 255 characters.',
        );
        return false;
    }

    const valid = /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(trimmed);
    if (!valid) {
        util.showErrorMsg(input, error, 'Enter a valid email address.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validatePassword(input, error) {
    const password = input.value;

    if (!password) {
        util.showErrorMsg(input, error, 'Enter password.');
        return false;
    }

    if (password.length < 8 || password.length > 255) {
        util.showErrorMsg(input, error, 'Password must be 8-255 characters.');
        return false;
    }

    const valid = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z]).+$/.test(password);
    if (!valid) {
        util.showErrorMsg(
            input,
            error,
            'Password must have at least 1 digit, 1 uppercase and 1 lowercase character.',
        );
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validateConfirmPassword(input, error, password) {
    const confPassword = input.value;

    if (!confPassword) {
        util.showErrorMsg(input, error, 'Re-type the password.');
        return false;
    }

    if (confPassword !== password) {
        util.showErrorMsg(input, error, 'Password does not match.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validateTerms(input, error) {
    if (!input.checked) {
        util.showErrorMsg(input, error, 'You must agree to the terms.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}
