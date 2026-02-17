// Utility functions for cookie management
const CookieManager = {
    set: function(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
    },
    
    get: function(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(c.substring(nameEQ.length, c.length));
                } catch(e) {
                    return c.substring(nameEQ.length, c.length);
                }
            }
        }
        return null;
    },
    
    delete: function(name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
    }
};

// Auth state management with email verification code
const Auth = {
    isLoggedIn: function() {
        return CookieManager.get('currentUser') !== null;
    },
    
    getCurrentUser: function() {
        return CookieManager.get('currentUser');
    },
    
    // Send verification code to email
    sendVerificationCode: function(email) {
        if (!validateEmail(email)) {
            return { success: false, error: 'Некорректный формат email' };
        }
        
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code with expiration (5 minutes)
        const verificationData = {
            email: email,
            code: code,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        };
        
        CookieManager.set('verificationCode', verificationData, 1/24); // 1 hour cookie
        
        // In real app, send email here
        console.log(`Verification code for ${email}: ${code}`);
        console.log(`MOCKUP MODE: Use any 6-digit code to login`);
        
        return { success: true, message: 'Код отправлен на ваш email' };
    },
    
    // Verify code and login/register
    verifyCode: function(email, code, name = null) {
        // MOCKUP MODE: Accept any 6-digit code
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            return { success: false, error: 'Код должен содержать 6 цифр' };
        }
        
        // In mockup mode, we accept any valid 6-digit code
        // Clear verification data if exists
        CookieManager.delete('verificationCode');
        
        // Check if user exists
        const users = CookieManager.get('users') || [];
        let user = users.find(u => u.email === email);
        
        if (!user) {
            // Create new user without requiring name
            user = {
                id: Date.now().toString(),
                name: name && name.trim() !== '' ? name.trim() : email.split('@')[0],
                email: email,
                fanId: null,
                createdAt: new Date().toISOString()
            };
            
            users.push(user);
            CookieManager.set('users', users);
        }
        
        // Login user
        CookieManager.set('currentUser', {
            id: user.id,
            name: user.name,
            email: user.email,
            fanId: user.fanId || null
        });
        
        return { success: true, isNewUser: !users.find(u => u.email === email) };
    },
    
    logout: function() {
        CookieManager.delete('currentUser');
        window.location.href = 'index.html';
    },
    
    updateProfile: function(updates) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return { success: false };
        
        const users = CookieManager.get('users') || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates };
            CookieManager.set('users', users);
            
            const updatedCurrentUser = { ...currentUser, ...updates };
            CookieManager.set('currentUser', updatedCurrentUser);
            
            return { success: true };
        }
        
        return { success: false };
    }
};

// Update navigation based on auth state
function updateNavigation() {
    const authLink = document.getElementById('authLink');
    const profileLink = document.getElementById('profileLink');
    
    if (Auth.isLoggedIn()) {
        if (authLink) {
            authLink.textContent = 'Выйти';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                Auth.logout();
            };
        }
    } else {
        if (authLink) {
            authLink.textContent = 'Войти';
            authLink.href = 'login.html';
            authLink.onclick = null;
        }
    }
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', updateNavigation);

// Hardcoded matches data
const MATCHES_DATA = [
    {
        id: '1',
        tournament: 'Российская Премьер-Лига',
        homeTeam: {
            name: 'ЦСКА',
            logo: '🔴'
        },
        awayTeam: {
            name: 'Зенит',
            logo: '🔵'
        },
        date: '2026-03-15',
        time: '19:00',
        stadium: 'ВЭБ Арена',
        address: 'Москва, Автозаводская ул., 23А',
        minPrice: 2400,
        fanIdRequired: true,
        preorderAvailable: true,
        description: 'Центральный матч тура РПЛ между двумя грандами российского футбола',
        sectors: [
            { id: 'A', name: 'Сектор A', price: 2400, rows: 20, seatsPerRow: 30 },
            { id: 'B', name: 'Сектор B', price: 3000, rows: 20, seatsPerRow: 30 },
            { id: 'C', name: 'Сектор C', price: 3500, rows: 15, seatsPerRow: 25 },
            { id: 'D', name: 'Сектор D', price: 2400, rows: 20, seatsPerRow: 30 },
            { id: 'E', name: 'Сектор E', price: 3000, rows: 20, seatsPerRow: 30 },
            { id: 'VIP', name: 'VIP', price: 8000, rows: 5, seatsPerRow: 20 }
        ]
    },
    {
        id: '2',
        tournament: 'Кубок России',
        homeTeam: {
            name: 'Спартак',
            logo: '⚪'
        },
        awayTeam: {
            name: 'Локомотив',
            logo: '🟢'
        },
        date: '2026-03-20',
        time: '18:00',
        stadium: 'Открытие Арена',
        address: 'Москва, Волоколамское ш., 69',
        minPrice: 1800,
        fanIdRequired: false,
        preorderAvailable: true,
        description: 'Четвертьфинал Кубка России - московское дерби',
        sectors: [
            { id: 'A', name: 'Сектор A', price: 1800, rows: 20, seatsPerRow: 30 },
            { id: 'B', name: 'Сектор B', price: 2200, rows: 20, seatsPerRow: 30 },
            { id: 'C', name: 'Сектор C', price: 2800, rows: 15, seatsPerRow: 25 },
            { id: 'D', name: 'Сектор D', price: 1800, rows: 20, seatsPerRow: 30 },
            { id: 'E', name: 'Сектор E', price: 2200, rows: 20, seatsPerRow: 30 },
            { id: 'VIP', name: 'VIP', price: 6000, rows: 5, seatsPerRow: 20 }
        ]
    }
];

// Get match by ID
function getMatchById(id) {
    return MATCHES_DATA.find(m => m.id === id);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

// Preorder management
const PreorderManager = {
    getAll: function() {
        return CookieManager.get('preorders') || [];
    },
    
    getUserPreorders: function(userId) {
        const preorders = this.getAll();
        return preorders.filter(p => p.userId === userId);
    },
    
    create: function(preorderData) {
        const preorders = this.getAll();
        const newPreorder = {
            id: Date.now().toString(),
            ...preorderData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        preorders.push(newPreorder);
        CookieManager.set('preorders', preorders);
        return { success: true, preorder: newPreorder };
    },
    
    cancel: function(preorderId) {
        const preorders = this.getAll();
        const index = preorders.findIndex(p => p.id === preorderId);
        
        if (index !== -1) {
            preorders[index].status = 'cancelled';
            preorders[index].cancelledAt = new Date().toISOString();
            CookieManager.set('preorders', preorders);
            return { success: true };
        }
        
        return { success: false };
    },
    
    getById: function(id) {
        const preorders = this.getAll();
        return preorders.find(p => p.id === id);
    }
};

// Card management
const CardManager = {
    getAll: function(userId) {
        const cards = CookieManager.get('cards') || [];
        return cards.filter(c => c.userId === userId);
    },
    
    add: function(userId, cardData) {
        const cards = CookieManager.get('cards') || [];
        const newCard = {
            id: Date.now().toString(),
            userId: userId,
            number: cardData.number,
            maskedNumber: '**** **** **** ' + cardData.number.slice(-4),
            expiry: cardData.expiry,
            addedAt: new Date().toISOString()
        };
        cards.push(newCard);
        CookieManager.set('cards', cards);
        return { success: true, card: newCard };
    },
    
    delete: function(cardId) {
        let cards = CookieManager.get('cards') || [];
        cards = cards.filter(c => c.id !== cardId);
        CookieManager.set('cards', cards);
        return { success: true };
    }
};

// Validation functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    // Minimum 8 characters, at least one uppercase letter and one number
    const re = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(password);
}

function validateCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    return /^\d{16}$/.test(cleaned);
}

function validateCardExpiry(expiry) {
    return /^\d{2}\/\d{2}$/.test(expiry);
}

function validateCardCvc(cvc) {
    return /^\d{3}$/.test(cvc);
}

// Format card number input
function formatCardNumber(value) {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
}

// Format expiry input
function formatExpiry(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
        return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
}
