// public/admin_login_script.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        loginError.classList.add('hidden'); // Hide previous errors
        loginError.textContent = ''; // Clear previous error text

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            loginError.textContent = 'Please enter both username and password.';
            loginError.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response. Admin login endpoint may not exist.');
            }

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                // Login successful, redirect to admin dashboard
                window.location.href = '/admin';
            } else {
                // Login failed, display error message from backend
                loginError.textContent = result.message || 'Admin login failed. Please check your credentials.';
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Admin login request error:', error);
            if (error.message.includes('non-JSON')) {
                loginError.textContent = 'Admin login endpoint not found. Please contact system administrator.';
            } else {
                loginError.textContent = 'An unexpected error occurred during login. Please try again later.';
            }
            loginError.classList.remove('hidden');
        }
    });
});
