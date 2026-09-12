// login.js - JanSetu Login Logic

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const signinBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    // Password Visibility Toggle
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';

            const newLabel = isPassword ? 'Hide password' : 'Show password';
            togglePasswordBtn.setAttribute('aria-label', newLabel);
            togglePasswordBtn.title = newLabel;

            const iconSpan = togglePasswordBtn.querySelector('.eye-icon');
            if (iconSpan) {
                iconSpan.textContent = isPassword ? '🙈' : '👁️';
            }
        });
    }

    // Form Submission (Email + Password ONLY)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email) {
                alert('Please enter your email address.');
                if (emailInput) emailInput.focus();
                return;
            }

            if (!password) {
                alert('Please enter your password.');
                if (passwordInput) passwordInput.focus();
                return;
            }

            // Button loading state
            const originalBtnText = signinBtn ? signinBtn.innerText : 'Sign In';
            if (signinBtn) {
                signinBtn.disabled = true;
                signinBtn.innerText = 'Signing In...';
            }

            try {
                // Submit ONLY email and password to POST /api/auth/login
                const response = await window.JanSetuAuth.login({
                    email,
                    password
                });

                if (response.ok && response.data && response.data.success) {
                    const { token, user } = response.data;

                    // Store JWT token and user info
                    window.JanSetuAuth.setToken(token);
                    window.JanSetuAuth.setUser(user);

                    // Read user role directly from database response
                    if (user && user.role) {
                        const targetUrl = window.JanSetuAuth.getDashboardUrl(user.role);
                        window.location.href = targetUrl;
                    } else {
                        // User has not yet selected a role
                        window.location.href = 'role.html';
                    }
                } else {
                    const message = response.data && response.data.message 
                        ? response.data.message 
                        : 'Invalid email or password.';
                    alert(message);
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('Unable to connect to the server. Please check if the backend is running.');
            } finally {
                if (signinBtn) {
                    signinBtn.disabled = false;
                    signinBtn.innerText = originalBtnText;
                }
            }
        });
    }
});
