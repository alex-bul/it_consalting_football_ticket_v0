// Auth page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (Auth.isLoggedIn()) {
        window.location.href = 'profile.html';
        return;
    }
    
    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabName = this.dataset.tab;
            if (tabName === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        });
    });
    
    // Login form
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        const result = Auth.login(email, password);
        
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
    
    // Register form
    const registerBtn = document.getElementById('registerBtn');
    
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        
        // Clear previous messages
        errorDiv.classList.remove('show');
        successDiv.classList.remove('show');
        
        // Validate email
        if (!validateEmail(email)) {
            errorDiv.textContent = 'Некорректный формат email';
            errorDiv.classList.add('show');
            return;
        }
        
        // Validate password
        if (!validatePassword(password)) {
            errorDiv.textContent = 'Пароль должен содержать минимум 8 символов, цифры и заглавные буквы';
            errorDiv.classList.add('show');
            return;
        }
        
        // Check password match
        if (password !== passwordConfirm) {
            errorDiv.textContent = 'Пароли не совпадают';
            errorDiv.classList.add('show');
            return;
        }
        
        const result = Auth.register(name, email, password);
        
        if (result.success) {
            successDiv.textContent = result.message;
            successDiv.classList.add('show');
            registerForm.reset();
            
            // Auto-login after 2 seconds
            setTimeout(() => {
                Auth.login(email, password);
                window.location.href = 'profile.html';
            }, 2000);
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('show');
        }
    });
    
    // Real-time validation
    document.getElementById('registerEmail').addEventListener('blur', function() {
        if (this.value && !validateEmail(this.value)) {
            this.style.borderColor = 'var(--danger-color)';
        } else {
            this.style.borderColor = '';
        }
    });
    
    document.getElementById('registerPassword').addEventListener('input', function() {
        const btn = document.getElementById('registerBtn');
        if (this.value && !validatePassword(this.value)) {
            this.style.borderColor = 'var(--danger-color)';
            btn.disabled = true;
        } else {
            this.style.borderColor = '';
            btn.disabled = false;
        }
    });
});
