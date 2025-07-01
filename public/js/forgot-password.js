// Replace your existing forgot-password.js with this:
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetBtn = document.getElementById('resetBtn');
    const emailInput = document.getElementById('email');

    // Email domain validation function (same as registration)
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
                emailInput.classList.add('invalid');
                emailInput.classList.remove('valid');
                
                // Show error message
                let errorMsg = emailInput.parentNode.querySelector('.email-error');
                if (!errorMsg) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'email-error';
                    emailInput.parentNode.appendChild(errorMsg);
                }
                
                const domain = email.split('@')[1];
                errorMsg.textContent = `Email domain "${domain}" is not supported. Please use Gmail, Outlook, Yahoo, iCloud, or other major providers.`;
            } else if (email) {
                emailInput.classList.add('valid');
                emailInput.classList.remove('invalid');
                
                // Remove error message
                const errorMsg = emailInput.parentNode.querySelector('.email-error');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
    }

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        // Client-side validation
        if (!email) {
            showMessage('Please enter your email address.', 'error');
            return;
        }

        if (!validateEmailDomain(email)) {
            showMessage('Please use a supported email provider (Gmail, Outlook, Yahoo, iCloud, etc.)', 'error');
            return;
        }

        // Show loading state
        resetBtn.classList.add('loading');
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // *** UPDATED ENDPOINT URL ***
            const response = await fetch('/api/public/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Password reset instructions sent to your email!', 'success');
                
                // For testing purposes, show the reset link in console
                if (data.resetLink) {
                    console.log('🔗 Reset link for testing:', data.resetLink);
                    showMessage(`Reset link: ${data.resetLink}`, 'info');
                }
                
                forgotPasswordForm.reset();
            } else {
                showMessage(data.message || 'Failed to send reset email. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            showMessage('Network error. Please try again later.', 'error');
        } finally {
            resetBtn.classList.remove('loading');
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    });

    // Show messages
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message, .info-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `${type}-message`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // Insert before form
        forgotPasswordForm.parentNode.insertBefore(messageEl, forgotPasswordForm);

        // Auto-hide after 8 seconds (longer for reset links)
        setTimeout(() => {
            messageEl.remove();
        }, 8000);
    }
});