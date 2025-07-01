document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const resetTokenInput = document.getElementById('resetToken');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('Invalid or missing reset token. Please request a new password reset.', 'error');
        resetPasswordBtn.disabled = true;
        return;
    }

    resetTokenInput.value = token;

    // Password validation
    const validatePassword = (password) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Update UI
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(req);
            if (element) {
                element.classList.toggle('valid', requirements[req]);
            }
        });

        return Object.values(requirements).every(req => req);
    };

    // Real-time password validation
    newPasswordInput.addEventListener('input', (e) => {
        validatePassword(e.target.value);
        validateForm();
    });

    confirmNewPasswordInput.addEventListener('input', validateForm);

    // Form validation
    function validateForm() {
        const password = newPasswordInput.value;
        const confirmPassword = confirmNewPasswordInput.value;
        const isPasswordValid = validatePassword(password);
        const passwordsMatch = password === confirmPassword;

        resetPasswordBtn.disabled = !(isPasswordValid && passwordsMatch);
    }

    // Form submission
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        // Validate passwords match
        if (newPassword !== confirmNewPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }

        // Show loading state
        resetPasswordBtn.classList.add('loading');
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

        try {
            const response = await fetch('/api/public/reset-password', {  // Changed from '/api/auth/reset-password'
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        token: token,
        newPassword: newPassword
    })
});

            const data = await response.json();

            if (response.ok) {
                showMessage('Password reset successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else {
                showMessage(data.message || 'Failed to reset password. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showMessage('Network error. Please try again later.', 'error');
        } finally {
            resetPasswordBtn.classList.remove('loading');
            resetPasswordBtn.disabled = false;
            resetPasswordBtn.innerHTML = '<i class="fas fa-key"></i> Reset Password';
        }
    });

    // Show messages
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `${type}-message`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // Insert before form
        resetPasswordForm.parentNode.insertBefore(messageEl, resetPasswordForm);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
});