document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/public/login', { // <-- Use the public login route
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                
                if (response.ok) {
                    // Handle successful login, e.g., redirect to index.html
                    window.location.href = '/pages/index.html';
                } else {
                    // Handle login error, e.g., show an error message
                    const errorData = await response.json();
                    console.error('Login error:', errorData.message);
                    alert('Login failed: ' + errorData.message);
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('An error occurred. Please try again later.');
            }
        });
    }
});