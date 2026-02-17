// Auth page functionality - Email + Code verification
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (Auth.isLoggedIn()) {
        window.location.href = 'profile.html';
        return;
    }
    
    const emailForm = document.getElementById('emailForm');
    const codeForm = document.getElementById('codeForm');
    const emailInput = document.getElementById('email');
    const emailDisplay = document.getElementById('emailDisplay');
    const verificationCodeInput = document.getElementById('verificationCode');
    const nameSection = document.getElementById('nameSection');
    const userNameInput = document.getElementById('userName');
    const resendCodeBtn = document.getElementById('resendCode');
    const changeEmailBtn = document.getElementById('changeEmail');
    
    let currentEmail = '';
    
    // Step 1: Email submission
    emailForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const errorDiv = document.getElementById('emailError');
        
        errorDiv.classList.remove('show');
        
        if (!validateEmail(email)) {
            errorDiv.textContent = 'Некорректный формат email';
            errorDiv.classList.add('show');
            return;
        }
        
        // Send verification code
        const result = Auth.sendVerificationCode(email);
        
        if (result.success) {
            currentEmail = email;
            emailDisplay.textContent = email;
            
            // Switch to code form
            emailForm.style.display = 'none';
            codeForm.style.display = 'block';
            
            // Focus on code input
            setTimeout(() => verificationCodeInput.focus(), 100);
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('show');
        }
    });
    
    // Step 2: Code verification
    codeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const code = verificationCodeInput.value.trim();
        const errorDiv = document.getElementById('codeError');
        
        errorDiv.classList.remove('show');
        
        if (code.length !== 6) {
            errorDiv.textContent = 'Код должен содержать 6 цифр';
            errorDiv.classList.add('show');
            return;
        }
        
        // Verify code without requiring name
        const result = Auth.verifyCode(currentEmail, code);
        
        if (result.success) {
            // Check if there's a redirect URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            const matchId = urlParams.get('matchId');
            
            if (redirect === 'booking' && matchId) {
                window.location.href = `booking.html?matchId=${matchId}`;
            } else {
                window.location.href = 'profile.html';
            }
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('show');
        }
    });
    
    // Resend code
    resendCodeBtn.addEventListener('click', function() {
        const errorDiv = document.getElementById('codeError');
        errorDiv.classList.remove('show');
        
        const result = Auth.sendVerificationCode(currentEmail);
        
        if (result.success) {
            // Show success message without blocking alert
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message show';
            successMsg.textContent = 'Новый код отправлен на ' + currentEmail + ' (MOCKUP: используйте любой 6-значный код)';
            errorDiv.parentNode.insertBefore(successMsg, errorDiv);
            
            setTimeout(() => successMsg.remove(), 5000);
            
            verificationCodeInput.value = '';
            verificationCodeInput.focus();
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('show');
        }
    });
    
    // Change email
    changeEmailBtn.addEventListener('click', function() {
        codeForm.style.display = 'none';
        emailForm.style.display = 'block';
        verificationCodeInput.value = '';
        nameSection.style.display = 'none';
        userNameInput.value = '';
        document.getElementById('codeError').classList.remove('show');
        document.getElementById('emailError').classList.remove('show');
        emailInput.focus();
    });
    
    // Auto-format code input (only digits)
    verificationCodeInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });
});
