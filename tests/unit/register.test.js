import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const apiMock = { post: vi.fn() };
const authMock = {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
};

vi.mock('../../client/js/api.js', () => ({ default: apiMock }));
vi.mock('../../client/js/auth.js', () => authMock);

const VALID = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'Secret123',
    confirmPassword: 'Secret123',
    terms: true,
};

function renderRegisterPage() {
    document.body.innerHTML = `
        <form class="Form RegisterForm" method="post" novalidate>
            <div class="Field">
                <input type="text" id="reg-name" />
                <div class="Field__error" id="reg-name-error"></div>
            </div>
            <div class="Field">
                <input type="email" id="reg-email" />
                <div class="Field__error" id="reg-email-error"></div>
            </div>
            <div class="Field">
                <input type="password" id="reg-password" />
                <button class="TogglePassword" type="button" id="reg-password-toggle-btn"></button>
                <div class="Field__error" id="reg-password-error"></div>
            </div>
            <div class="Field">
                <input type="password" id="reg-confirm-password" />
                <button class="TogglePassword" type="button" id="reg-confirm-password-toggle-btn"></button>
                <div class="Field__error" id="reg-confirm-password-error"></div>
            </div>
            <div class="Field">
                <input type="checkbox" id="reg-terms" />
                <div class="Field__error" id="reg-terms-error"></div>
            </div>
            <div class="Form__error" id="reg-form-error" role="alert"></div>
            <div class="Toast" id="success-toast"></div>
            <button class="Btn Btn--submit" type="submit">Create account</button>
        </form>
    `;
}

function fillForm(overrides = {}) {
    const values = { ...VALID, ...overrides };
    document.getElementById('reg-name').value = values.name;
    document.getElementById('reg-email').value = values.email;
    document.getElementById('reg-password').value = values.password;
    document.getElementById('reg-confirm-password').value =
        values.confirmPassword;
    document.getElementById('reg-terms').checked = values.terms;
}

async function submitForm() {
    const form = document.querySelector('.RegisterForm');
    form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadRegisterPage() {
    vi.stubGlobal('location', { ...window.location, replace: vi.fn() });
    await import('../../client/js/pages/register.js');
}

describe('register page', () => {
    beforeEach(async () => {
        renderRegisterPage();
        apiMock.post.mockReset();
        await loadRegisterPage();
    });

    afterEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe('client-side validation', () => {
        it('rejects an empty name', async () => {
            fillForm({ name: '' });

            await submitForm();

            expect(
                document.getElementById('reg-name-error').textContent,
            ).toBe('Name is required.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a whitespace-only name', async () => {
            fillForm({ name: '    ' });

            await submitForm();

            expect(
                document.getElementById('reg-name-error').textContent,
            ).toBe('Name must be 1-255 characters.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects an email over 255 characters', async () => {
            fillForm({ email: `${'a'.repeat(250)}@example.com` });

            await submitForm();

            expect(
                document.getElementById('reg-email-error').textContent,
            ).toBe('Email must not exceed 255 characters.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a malformed email', async () => {
            fillForm({ email: 'not-an-email' });

            await submitForm();

            expect(
                document.getElementById('reg-email-error').textContent,
            ).toBe('Enter a valid email address.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects an empty password', async () => {
            fillForm({ password: '', confirmPassword: '' });

            await submitForm();

            expect(
                document.getElementById('reg-password-error').textContent,
            ).toBe('Enter password.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a password shorter than 8 characters', async () => {
            fillForm({ password: 'Ab1', confirmPassword: 'Ab1' });

            await submitForm();

            expect(
                document.getElementById('reg-password-error').textContent,
            ).toBe('Password must be 8-255 characters.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a password missing an uppercase/digit/lowercase character', async () => {
            fillForm({ password: 'alllowercase', confirmPassword: 'alllowercase' });

            await submitForm();

            expect(
                document.getElementById('reg-password-error').textContent,
            ).toBe(
                'Password must have at least 1 digit, 1 uppercase and 1 lowercase character.',
            );
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects an empty confirm password', async () => {
            fillForm({ confirmPassword: '' });

            await submitForm();

            expect(
                document.getElementById('reg-confirm-password-error')
                    .textContent,
            ).toBe('Re-type the password.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a confirm password that does not match', async () => {
            fillForm({ confirmPassword: 'Different123' });

            await submitForm();

            expect(
                document.getElementById('reg-confirm-password-error')
                    .textContent,
            ).toBe('Password does not match.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects submission when terms are not accepted', async () => {
            fillForm({ terms: false });

            await submitForm();

            expect(
                document.getElementById('reg-terms-error').textContent,
            ).toBe('You must agree to the terms.');
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('clears a previous field error once input becomes valid', async () => {
            fillForm({ name: '' });
            await submitForm();
            expect(
                document.getElementById('reg-name-error').textContent,
            ).not.toBe('');

            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ user: { email: VALID.email } }),
            });
            fillForm();
            await submitForm();

            expect(
                document.getElementById('reg-name-error').textContent,
            ).toBe('');
        });
    });

    describe('submitting the form', () => {
        it('posts name, email, password and terms to /api/auth/register', async () => {
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ user: { email: VALID.email } }),
            });
            fillForm();

            await submitForm();

            expect(apiMock.post).toHaveBeenCalledWith('/api/auth/register', {
                name: VALID.name,
                email: VALID.email,
                password: VALID.password,
                terms: true,
            });
        });

        it('shows the success toast when registration succeeds', async () => {
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ user: { email: VALID.email } }),
            });
            fillForm();

            await submitForm();

            expect(
                document
                    .getElementById('success-toast')
                    .classList.contains('show'),
            ).toBe(true);
        });

        it('redirects to index.html?registered=1 two seconds after success', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ user: { email: VALID.email } }),
            });
            fillForm();

            const form = document.querySelector('.RegisterForm');
            form.dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true }),
            );
            await vi.advanceTimersByTimeAsync(2000);

            expect(window.location.replace).toHaveBeenCalledWith(
                './index.html?registered=1',
            );
        });

        it('does not redirect before the 2 second delay elapses', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ user: { email: VALID.email } }),
            });
            fillForm();

            const form = document.querySelector('.RegisterForm');
            form.dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true }),
            );
            await vi.advanceTimersByTimeAsync(1000);

            expect(window.location.replace).not.toHaveBeenCalled();
        });

        it('shows the server error message inline and does not show the toast on failure', async () => {
            apiMock.post.mockResolvedValue({
                ok: false,
                json: async () => ({ message: 'Email already registered.' }),
            });
            fillForm();

            await submitForm();

            const formError = document.getElementById('reg-form-error');
            expect(formError.textContent).toBe('Email already registered.');
            expect(formError.classList.contains('show')).toBe(true);
            expect(
                document
                    .getElementById('success-toast')
                    .classList.contains('show'),
            ).toBe(false);
        });

        it('shows a generic error message when the request throws', async () => {
            apiMock.post.mockRejectedValue(new TypeError('Failed to fetch'));
            fillForm();

            await submitForm();

            const formError = document.getElementById('reg-form-error');
            expect(formError.textContent).toBe('Registration failed.');
            expect(formError.classList.contains('show')).toBe(true);
        });
    });

    describe('password visibility toggles', () => {
        it('toggles the password field independently of the confirm password field', () => {
            const pw = document.getElementById('reg-password');
            const confPw = document.getElementById('reg-confirm-password');

            document.getElementById('reg-password-toggle-btn').click();

            expect(pw.type).toBe('text');
            expect(confPw.type).toBe('password');
        });

        it('toggles the confirm password field independently of the password field', () => {
            const pw = document.getElementById('reg-password');
            const confPw = document.getElementById('reg-confirm-password');

            document.getElementById('reg-confirm-password-toggle-btn').click();

            expect(confPw.type).toBe('text');
            expect(pw.type).toBe('password');
        });
    });
});
