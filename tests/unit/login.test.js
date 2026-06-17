import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const API_PATH = '../../client/js/api.js';
const AUTH_PATH = '../../client/js/auth.js';

const apiMock = { post: vi.fn() };
const authMock = {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
};

vi.mock('../../client/js/api.js', () => ({ default: apiMock }));
vi.mock('../../client/js/auth.js', () => authMock);

function renderLoginPage() {
    document.body.innerHTML = `
        <form class="Form LoginForm" method="post" novalidate>
            <div class="Field">
                <input type="email" id="login-email" />
                <div class="Field__error" id="login-email-error" role="alert"></div>
            </div>
            <div class="Field">
                <input type="password" id="login-password" />
                <button class="TogglePassword" type="button"></button>
                <div class="Field__error" id="login-password-error" role="alert"></div>
            </div>
            <div class="Form__error" id="login-form-error" role="alert"></div>
            <div class="Toast" id="registered-toast"></div>
            <button class="Btn Btn--submit" type="submit" id="login-submit">Log in</button>
        </form>
    `;
}

function fillForm({ email, password }) {
    document.getElementById('login-email').value = email ?? '';
    document.getElementById('login-password').value = password ?? '';
}

async function submitForm() {
    const form = document.querySelector('.LoginForm');
    form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
    );
    // let the async submit handler's microtasks flush
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadLoginPage({ search = '' } = {}) {
    vi.stubGlobal('location', {
        ...window.location,
        search,
        replace: vi.fn(),
    });
    await import('../../client/js/pages/login.js');
}

describe('login page', () => {
    beforeEach(() => {
        renderLoginPage();
        apiMock.post.mockReset();
        authMock.getAccessToken.mockReset().mockReturnValue(null);
        authMock.setAccessToken.mockReset();
    });

    afterEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    describe('on load', () => {
        it('redirects to dashboard.html when already authenticated', async () => {
            authMock.getAccessToken.mockReturnValue('existing-token');

            await loadLoginPage();

            expect(window.location.replace).toHaveBeenCalledWith(
                './dashboard.html',
            );
        });

        it('does not redirect when there is no token', async () => {
            authMock.getAccessToken.mockReturnValue(null);

            await loadLoginPage();

            expect(window.location.replace).not.toHaveBeenCalled();
        });

        it('shows the success toast when ?registered=1 is present', async () => {
            await loadLoginPage({ search: '?registered=1' });

            expect(
                document
                    .getElementById('registered-toast')
                    .classList.contains('show'),
            ).toBe(true);
        });

        it('does not show the success toast without the registered param', async () => {
            await loadLoginPage();

            expect(
                document
                    .getElementById('registered-toast')
                    .classList.contains('show'),
            ).toBe(false);
        });
    });

    describe('client-side validation', () => {
        beforeEach(async () => {
            await loadLoginPage();
        });

        it('rejects an empty email and does not call the API', async () => {
            fillForm({ email: '', password: 'secret123' });

            await submitForm();

            expect(
                document.getElementById('login-email-error').textContent,
            ).toMatch(/valid email/i);
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects a malformed email', async () => {
            fillForm({ email: 'not-an-email', password: 'secret123' });

            await submitForm();

            expect(
                document.getElementById('login-email-error').textContent,
            ).toMatch(/valid email/i);
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('rejects an empty password', async () => {
            fillForm({ email: 'user@example.com', password: '' });

            await submitForm();

            expect(
                document.getElementById('login-password-error').textContent,
            ).toMatch(/enter password/i);
            expect(apiMock.post).not.toHaveBeenCalled();
        });

        it('clears previous field errors once input becomes valid', async () => {
            fillForm({ email: '', password: '' });
            await submitForm();
            expect(
                document.getElementById('login-email-error').textContent,
            ).not.toBe('');

            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ access_token: 'token' }),
            });
            fillForm({ email: 'user@example.com', password: 'secret123' });
            await submitForm();

            expect(
                document.getElementById('login-email-error').textContent,
            ).toBe('');
        });
    });

    describe('submitting the form', () => {
        beforeEach(async () => {
            await loadLoginPage();
            fillForm({ email: 'user@example.com', password: 'secret123' });
        });

        it('posts the entered credentials to /api/auth/login', async () => {
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ access_token: 'token' }),
            });

            await submitForm();

            expect(apiMock.post).toHaveBeenCalledWith('/api/auth/login', {
                email: 'user@example.com',
                password: 'secret123',
            });
        });

        it('stores the access token and redirects to dashboard.html on success', async () => {
            apiMock.post.mockResolvedValue({
                ok: true,
                json: async () => ({ access_token: 'abc123' }),
            });

            await submitForm();

            expect(authMock.setAccessToken).toHaveBeenCalledWith('abc123');
            expect(window.location.replace).toHaveBeenCalledWith(
                './dashboard.html',
            );
        });

        it('shows the server error message inline and does not redirect on failure', async () => {
            apiMock.post.mockResolvedValue({
                ok: false,
                json: async () => ({ message: 'Invalid email or password.' }),
            });

            await submitForm();

            const formError = document.getElementById('login-form-error');
            expect(formError.textContent).toBe('Invalid email or password.');
            expect(formError.classList.contains('show')).toBe(true);
            expect(authMock.setAccessToken).not.toHaveBeenCalled();
            expect(window.location.replace).not.toHaveBeenCalled();
        });

        it('shows a generic error message when the request throws', async () => {
            apiMock.post.mockRejectedValue(new TypeError('Failed to fetch'));

            await submitForm();

            const formError = document.getElementById('login-form-error');
            expect(formError.textContent).toBe('Unable to login.');
            expect(formError.classList.contains('show')).toBe(true);
        });
    });
});
