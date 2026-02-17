// Booking page functionality
let currentMatch = null;
let selectedCard = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!Auth.isLoggedIn()) {
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('matchId');
        window.location.href = `login.html?redirect=booking&matchId=${matchId}`;
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('matchId');
    
    if (!matchId) {
        window.location.href = 'index.html';
        return;
    }
    
    currentMatch = getMatchById(matchId);
    
    if (!currentMatch) {
        window.location.href = 'index.html';
        return;
    }
    
    initializeBookingForm();
});

function initializeBookingForm() {
    const user = Auth.getCurrentUser();
    
    // Display match info
    displayMatchInfo();
    
    // Populate sectors
    populateSectors();
    
    // Pre-fill user data
    document.getElementById('fullName').value = user.name;
    document.getElementById('email').value = user.email;
    
    // Show Fan ID field if required
    if (currentMatch.fanIdRequired) {
        const fanIdSection = document.getElementById('fanIdSection');
        fanIdSection.style.display = 'block';
        document.getElementById('fanId').required = true;
        
        if (user.fanId) {
            document.getElementById('fanId').value = user.fanId;
        }
    }
    
    // Load saved cards
    loadSavedCards();
    
    // Event listeners
    setupEventListeners();
}

function displayMatchInfo() {
    const container = document.getElementById('matchInfo');
    container.innerHTML = `
        <h3>${currentMatch.homeTeam.name} ${currentMatch.homeTeam.logo} VS ${currentMatch.awayTeam.logo} ${currentMatch.awayTeam.name}</h3>
        <p><strong>${currentMatch.tournament}</strong></p>
        <p>📅 ${formatDate(currentMatch.date)} в ${currentMatch.time}</p>
        <p>🏟️ ${currentMatch.stadium}</p>
        ${currentMatch.fanIdRequired ? '<p style="color: var(--accent-color); font-weight: 600;">⚠️ Требуется Fan ID</p>' : ''}
    `;
}

function populateSectors() {
    const select = document.getElementById('sectorSelect');
    currentMatch.sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.id;
        option.textContent = `${sector.name} (от ${sector.price} ₽)`;
        option.dataset.price = sector.price;
        select.appendChild(option);
    });
    
    // Display stadium map
    const stadiumMap = document.getElementById('stadiumMap');
    stadiumMap.innerHTML = '';
    currentMatch.sectors.forEach(sector => {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'sector';
        sectorDiv.dataset.sectorId = sector.id;
        sectorDiv.innerHTML = `
            <div class="sector-name">${sector.name}</div>
            <div class="sector-price">от ${sector.price} ₽</div>
        `;
        sectorDiv.onclick = () => selectSectorFromMap(sector.id);
        stadiumMap.appendChild(sectorDiv);
    });
}

function selectSectorFromMap(sectorId) {
    // Update select
    document.getElementById('sectorSelect').value = sectorId;
    
    // Update visual selection
    document.querySelectorAll('.sector').forEach(s => s.classList.remove('selected'));
    document.querySelector(`[data-sector-id="${sectorId}"]`).classList.add('selected');
    
    // Update base price
    updateBasePrice();
}

function updateBasePrice() {
    const sectorSelect = document.getElementById('sectorSelect');
    const selectedOption = sectorSelect.options[sectorSelect.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.price) {
        const price = selectedOption.dataset.price;
        document.getElementById('basePrice').textContent = `${price} ₽`;
        document.getElementById('priceLimit').min = price;
        document.getElementById('priceLimit').value = price;
    }
}

function loadSavedCards() {
    const user = Auth.getCurrentUser();
    const cards = CardManager.getAll(user.id);
    const container = document.getElementById('savedCards');
    
    container.innerHTML = '';
    
    if (cards.length > 0) {
        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-item';
            cardDiv.dataset.cardId = card.id;
            cardDiv.innerHTML = `
                <div>
                    <div class="card-number">💳 ${card.maskedNumber}</div>
                    <div style="font-size: 0.875rem; color: var(--text-light);">Действует до ${card.expiry}</div>
                </div>
                <div>✓</div>
            `;
            cardDiv.onclick = () => selectCard(card.id);
            container.appendChild(cardDiv);
        });
        
        // Auto-select first card
        selectCard(cards[0].id);
    }
}

function selectCard(cardId) {
    selectedCard = cardId;
    document.querySelectorAll('.card-item').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-card-id="${cardId}"]`)?.classList.add('selected');
    checkFormCompletion();
}

function setupEventListeners() {
    // Sector change
    document.getElementById('sectorSelect').addEventListener('change', function() {
        updateBasePrice();
        
        // Update visual selection
        document.querySelectorAll('.sector').forEach(s => s.classList.remove('selected'));
        if (this.value) {
            document.querySelector(`[data-sector-id="${this.value}"]`)?.classList.add('selected');
        }
    });
    
    // Oferta modal
    const ofertaModal = document.getElementById('ofertaModal');
    const ofertaLink = document.getElementById('ofertaLink');
    const closeOferta = document.getElementById('closeOferta');
    const ofertaAccept = document.getElementById('ofertaAccept');
    
    ofertaLink.onclick = (e) => {
        e.preventDefault();
        ofertaModal.classList.add('show');
    };
    
    closeOferta.onclick = () => {
        ofertaModal.classList.remove('show');
    };
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = function() {
            this.closest('.modal').classList.remove('show');
        };
    });
    
    ofertaAccept.addEventListener('change', checkFormCompletion);
    
    // Card modal
    const cardModal = document.getElementById('cardModal');
    const addCardBtn = document.getElementById('addCardBtn');
    
    addCardBtn.onclick = () => {
        cardModal.classList.add('show');
    };
    
    // Card form
    const cardForm = document.getElementById('cardForm');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    
    cardNumberInput.addEventListener('input', function() {
        this.value = formatCardNumber(this.value);
    });
    
    cardExpiryInput.addEventListener('input', function() {
        this.value = formatExpiry(this.value);
    });
    
    cardForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const cardNumber = document.getElementById('cardNumber').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCvc = document.getElementById('cardCvc').value;
        const autoPaymentConsent = document.getElementById('autoPaymentConsent').checked;
        const errorDiv = document.getElementById('cardError');
        
        errorDiv.classList.remove('show');
        
        if (!validateCardNumber(cardNumber)) {
            errorDiv.textContent = 'Некорректный номер карты';
            errorDiv.classList.add('show');
            return;
        }
        
        if (!validateCardExpiry(cardExpiry)) {
            errorDiv.textContent = 'Некорректный срок действия';
            errorDiv.classList.add('show');
            return;
        }
        
        if (!validateCardCvc(cardCvc)) {
            errorDiv.textContent = 'Некорректный CVC код';
            errorDiv.classList.add('show');
            return;
        }
        
        if (!autoPaymentConsent) {
            errorDiv.textContent = 'Необходимо согласие на автосписание';
            errorDiv.classList.add('show');
            return;
        }
        
        const user = Auth.getCurrentUser();
        const result = CardManager.add(user.id, {
            number: cardNumber.replace(/\s/g, ''),
            expiry: cardExpiry
        });
        
        if (result.success) {
            cardModal.classList.remove('show');
            cardForm.reset();
            loadSavedCards();
        }
    });
    
    // Booking form submission
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', handleBookingSubmit);
    
    // Form validation
    bookingForm.addEventListener('input', checkFormCompletion);
}

function checkFormCompletion() {
    const sector = document.getElementById('sectorSelect').value;
    const row = document.getElementById('rowInput').value;
    const seats = document.getElementById('seatsInput').value;
    const priceLimit = document.getElementById('priceLimit').value;
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const ofertaAccept = document.getElementById('ofertaAccept').checked;
    
    let fanIdValid = true;
    if (currentMatch.fanIdRequired) {
        const fanId = document.getElementById('fanId').value;
        fanIdValid = fanId.trim() !== '';
    }
    
    const submitBtn = document.getElementById('submitBooking');
    
    if (sector && row && seats && priceLimit && fullName && email && ofertaAccept && selectedCard && fanIdValid) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

function handleBookingSubmit(e) {
    e.preventDefault();
    
    const user = Auth.getCurrentUser();
    const errorDiv = document.getElementById('bookingError');
    errorDiv.classList.remove('show');
    
    // Collect form data
    const bookingData = {
        userId: user.id,
        matchId: currentMatch.id,
        matchTitle: `${currentMatch.homeTeam.name} - ${currentMatch.awayTeam.name}`,
        tournament: currentMatch.tournament,
        date: currentMatch.date,
        time: currentMatch.time,
        stadium: currentMatch.stadium,
        sector: document.getElementById('sectorSelect').value,
        row: document.getElementById('rowInput').value,
        seats: document.getElementById('seatsInput').value,
        ticketCount: parseInt(document.getElementById('ticketCount').value),
        priceLimit: parseInt(document.getElementById('priceLimit').value),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        fanId: currentMatch.fanIdRequired ? document.getElementById('fanId').value : null,
        cardId: selectedCard
    };
    
    // Validate Fan ID if required
    if (currentMatch.fanIdRequired && !bookingData.fanId) {
        errorDiv.textContent = 'Для данного матча требуется Fan ID';
        errorDiv.classList.add('show');
        return;
    }
    
    // Create preorder
    const result = PreorderManager.create(bookingData);
    
    if (result.success) {
        // Update user's Fan ID if provided
        if (bookingData.fanId && bookingData.fanId !== user.fanId) {
            Auth.updateProfile({ fanId: bookingData.fanId });
        }
        
        // Show success and redirect
        alert('Предзаказ успешно оформлен! Вы получите уведомление на email при выдаче билета.');
        window.location.href = 'profile.html';
    } else {
        errorDiv.textContent = 'Ошибка при оформлении предзаказа';
        errorDiv.classList.add('show');
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};
