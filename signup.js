// signup.js - JanSetu Registration Logic (Integrated with Backend API)

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const submitBtn = document.getElementById('submitBtn') || (signupForm ? signupForm.querySelector('button[type="submit"]') : null);

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');

    // Helper to setup password toggle button
    function setupPasswordToggle(button, input) {
        if (!button || !input) return;

        button.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            const newLabel = isPassword ? 'Hide password' : 'Show password';
            button.setAttribute('aria-label', newLabel);
            button.title = newLabel;

            const iconSpan = button.querySelector('.eye-icon');
            if (iconSpan) {
                iconSpan.textContent = isPassword ? '🙈' : '👁️';
            }
        });
    }

    setupPasswordToggle(togglePasswordBtn, passwordInput);
    setupPasswordToggle(toggleConfirmPasswordBtn, confirmPasswordInput);

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('fullName') || signupForm.querySelector('input[type="text"]');
            const emailInput = document.getElementById('email') || signupForm.querySelector('input[type="email"]');
            const mobileInput = document.getElementById('mobile') || signupForm.querySelector('input[type="tel"]');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            const mobile = mobileInput ? mobileInput.value.trim() : '';

            // Client-side validation checks
            if (!name) {
                alert('Please enter your full name.');
                if (nameInput) nameInput.focus();
                return;
            }

            if (!email) {
                alert('Please enter your email address.');
                if (emailInput) emailInput.focus();
                return;
            }

            if (password.length < 8) {
                alert('Password must be at least 8 characters long.');
                if (passwordInput) passwordInput.focus();
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match. Please re-enter.');
                if (confirmPasswordInput) confirmPasswordInput.focus();
                return;
            }

            // Disable submit button during request
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Create Account';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Creating Account...';
            }

            try {
                const response = await window.JanSetuAuth.signup({
                    name,
                    email,
                    mobile,
                    password,
                    confirmPassword
                });

                if (response.ok && response.data && response.data.success) {
                    // Store JWT token and authenticated user
                    window.JanSetuAuth.setToken(response.data.token);
                    window.JanSetuAuth.setUser(response.data.user);

                    // Navigate to Role Selection
                    window.location.href = 'role.html';
                } else {
                    const message = response.data && response.data.message 
                        ? response.data.message 
                        : 'Registration failed. Please try again.';
                    alert(message);
                }
            } catch (err) {
                console.error('Signup error:', err);
                alert('An error occurred during registration. Please check your network and try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    }
});
