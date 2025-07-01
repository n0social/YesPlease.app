document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const profilePhotoInput = document.getElementById('profilePhoto');
    const photoPreview = document.getElementById('photoPreview');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    const registerBtn = document.getElementById('registerBtn');

    // Profile photo preview
    profilePhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showMessage('Profile photo must be less than 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Password validation - UPDATED FOR COMPACT DISPLAY
    const validatePassword = (password) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Update UI - using span elements instead of li
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(req);
            if (element) {
                element.classList.toggle('valid', requirements[req]);
            }
        });

        return Object.values(requirements).every(req => req);
    };

    // Real-time password validation
    passwordInput.addEventListener('input', (e) => {
        validatePassword(e.target.value);
        validateForm();
    });

    confirmPasswordInput.addEventListener('input', validateForm);
    agreeTermsCheckbox.addEventListener('change', validateForm);

    // Form validation
    function validateForm() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const isPasswordValid = validatePassword(password);
        const passwordsMatch = password === confirmPassword;
        const termsAccepted = agreeTermsCheckbox.checked;

        registerBtn.disabled = !(isPasswordValid && passwordsMatch && termsAccepted);
    }

    // Form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(registerForm);
        
        // Validate passwords match
        if (formData.get('password') !== formData.get('confirmPassword')) {
            showMessage('Passwords do not match!', 'error');
            return;
        }

        // Show loading state
        registerBtn.classList.add('loading');
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: formData // This will include the profile photo file
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Account created successfully! Please sign in.', 'success');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else {
                showMessage(data.message || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Network error. Please try again later.', 'error');
        } finally {
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
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
        registerForm.parentNode.insertBefore(messageEl, registerForm);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
});

// Add this to your register.js file:
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const emailInput = document.getElementById('email');
    
    // Email domain validation function (client-side)
    const validateEmailDomain = (email) => {
        const allowedDomains = [
            'gmail.com', 'googlemail.com',
            'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
            'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.au', 'ymail.com',
            'icloud.com', 'me.com', 'mac.com',
            'aol.com',
            'protonmail.com', 'proton.me',
            'tutanota.com', 'tuta.io',
            'mail.com',
            'gmx.com', 'gmx.net',
            'fastmail.com',
            'zoho.com',
            'yandex.com', 'yandex.ru'
        ];
        
        const domain = email.toLowerCase().split('@')[1];
        
        if (!domain) return false;
        
        return allowedDomains.includes(domain) || 
               domain.endsWith('.edu') || 
               domain.endsWith('.gov');
    };
    
    // Real-time email validation
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const email = emailInput.value.trim();
            
            if (email && !validateEmailDomain(email)) {
                emailInput.style.borderColor = '#ef4444';
                
                // Show error message
                let errorMsg = emailInput.parentNode.querySelector('.email-error');
                if (!errorMsg) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'email-error';
                    errorMsg.style.cssText = 'color: #ef4444; font-size: 0.8rem; margin-top: 0.3rem;';
                    emailInput.parentNode.appendChild(errorMsg);
                }
                
                const domain = email.split('@')[1];
                errorMsg.textContent = `Email domain "${domain}" is not supported. Please use Gmail, Outlook, Yahoo, iCloud, or other major providers.`;
            } else {
                emailInput.style.borderColor = '';
                
                // Remove error message
                const errorMsg = emailInput.parentNode.querySelector('.email-error');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
    }
    
    // Update form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());
            
            // Client-side email domain validation
            if (!validateEmailDomain(data.email)) {
                alert('Please use a supported email provider (Gmail, Outlook, Yahoo, iCloud, etc.)');
                return;
            }
            
            // Password confirmation check
            if (data.password !== data.confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            try {
                const response = await fetch('/api/public/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Registration successful! Welcome to the platform.');
                    window.location.href = '/pages/index.html';
                } else {
                    alert('Registration failed: ' + result.message);
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }
});