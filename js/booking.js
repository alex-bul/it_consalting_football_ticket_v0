// Booking page functionality with zone selection for preorders
let currentMatch = null;
let selectedCard = null;
let selectedZone = null;
let selectedSeats = []; // Array to store selected seats
let ticketFanIds = []; // Array to store Fan ID for each ticket

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
    
    // Create stadium visualization
    createStadiumVisualization();
    
    // Pre-fill user data
    document.getElementById('fullName').value = user.name;
    document.getElementById('email').value = user.email;
    
    // Initialize Fan ID fields based on match requirements
    initializeFanIdFields();
    
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
        ${currentMatch.fanIdRequired ? '<p style="color: var(--accent-color); font-weight: 600;">⚠️ Требуется Fan ID для каждого билета</p>' : ''}
    `;
}

function initializeFanIdFields() {
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    updateFanIdFields(ticketCount);
}

function updateFanIdFields(ticketCount) {
    const fanIdSection = document.getElementById('fanIdSection');
    const fanIdContainer = document.getElementById('fanIdContainer');
    
    if (!currentMatch.fanIdRequired) {
        fanIdSection.style.display = 'none';
        ticketFanIds = [];
        return;
    }
    
    fanIdSection.style.display = 'block';
    fanIdContainer.innerHTML = '';
    
    const user = Auth.getCurrentUser();
    
    for (let i = 0; i < ticketCount; i++) {
        const fanIdGroup = document.createElement('div');
        fanIdGroup.className = 'form-group';
        fanIdGroup.innerHTML = `
            <label for="fanId${i}">Fan ID для билета ${i + 1}</label>
            <input type="text" id="fanId${i}" class="fan-id-input" data-ticket-index="${i}" placeholder="Введите номер Fan ID" required>
            <span class="field-hint warning">⚠️ Обязательное поле для посещения матча</span>
        `;
        fanIdContainer.appendChild(fanIdGroup);
        
        // Pre-fill first ticket with user's Fan ID if available
        if (i === 0 && user.fanId) {
            setTimeout(() => {
                document.getElementById(`fanId${i}`).value = user.fanId;
            }, 0);
        }
    }
    
    // Initialize ticketFanIds array
    ticketFanIds = new Array(ticketCount).fill('');
    
    // Add event listeners to Fan ID inputs
    document.querySelectorAll('.fan-id-input').forEach(input => {
        input.addEventListener('input', function() {
            const index = parseInt(this.dataset.ticketIndex);
            ticketFanIds[index] = this.value.trim();
            checkFormCompletion();
        });
    });
}

function createStadiumVisualization() {
    const container = document.getElementById('stadiumSectors');
    
    // Clear existing sectors
    container.innerHTML = '';
    
    // Create 3x3 grid layout with field in center
    // All 8 positions around the field filled with sectors
    // Grid positions (row, col):
    // (1,1) A    (1,2) B    (1,3) VIP
    // (2,1) D    (2,2) FIELD (2,3) E
    // (3,1) C    (3,2) F    (3,3) G
    
    const sectorPositions = [
        { id: 'A', row: 1, col: 1 },
        { id: 'B', row: 1, col: 2 },
        { id: 'VIP', row: 1, col: 3 },
        { id: 'D', row: 2, col: 1 },
        { id: 'E', row: 2, col: 3 },
        { id: 'C', row: 3, col: 1 },
        { id: 'F', row: 3, col: 2 },
        { id: 'G', row: 3, col: 3 }
    ];
    
    sectorPositions.forEach(position => {
        const sector = currentMatch.sectors.find(s => s.id === position.id);
        if (sector) {
            const sectorDiv = document.createElement('div');
            sectorDiv.className = 'stadium-sector';
            sectorDiv.dataset.sectorId = sector.id;
            sectorDiv.style.gridRow = position.row;
            sectorDiv.style.gridColumn = position.col;
            sectorDiv.innerHTML = `
                <div class="sector-name">${sector.name}</div>
                <div class="sector-price">от ${sector.price} ₽</div>
                <div class="sector-capacity">${sector.rows}x${sector.seatsPerRow} мест</div>
            `;
            sectorDiv.onclick = () => selectZone(sector);
            container.appendChild(sectorDiv);
        }
    });
}

function selectZone(zone) {
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    
    // Check if zone has enough consecutive seats
    const maxConsecutiveSeats = zone.seatsPerRow;
    if (ticketCount > maxConsecutiveSeats) {
        const errorDiv = document.getElementById('bookingError');
        errorDiv.textContent = `В зоне "${zone.name}" максимум ${maxConsecutiveSeats} мест в ряду. Выберите другую зону или уменьшите количество билетов.`;
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 5000);
        return;
    }
    
    selectedZone = zone;
    selectedSeats = []; // Reset selected seats when changing zone
    
    // Update visual selection
    document.querySelectorAll('.stadium-sector').forEach(s => s.classList.remove('selected'));
    document.querySelector(`[data-sector-id="${zone.id}"]`).classList.add('selected');
    
    // Update info
    document.getElementById('selectedSectorName').textContent = zone.name;
    document.getElementById('selectedSectorPrice').textContent = `${zone.price} ₽`;
    
    // Update base price
    document.getElementById('basePrice').textContent = `${zone.price} ₽`;
    document.getElementById('priceLimit').min = zone.price;
    document.getElementById('priceLimit').value = zone.price;
    
    // Show seat map for seat selection
    displaySeatMap(zone);
    
    updateTotalPrice();
    checkFormCompletion();
}

function displaySeatMap(zone) {
    const container = document.getElementById('seatMapContainer');
    const seatGrid = document.getElementById('seatGrid');
    const currentSectorName = document.getElementById('currentSectorName');
    
    // Show container
    container.style.display = 'block';
    currentSectorName.textContent = zone.name;
    
    // Clear previous seats
    seatGrid.innerHTML = '';
    
    // Generate seat map
    for (let row = 1; row <= zone.rows; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = `Ряд ${row}`;
        rowDiv.appendChild(rowLabel);
        
        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'seats-container';
        
        for (let seat = 1; seat <= zone.seatsPerRow; seat++) {
            const seatDiv = document.createElement('div');
            seatDiv.className = 'seat';
            seatDiv.dataset.row = row;
            seatDiv.dataset.seat = seat;
            seatDiv.textContent = seat;
            
            // Randomly mark some seats as occupied (for demo purposes)
            const isOccupied = Math.random() < 0.3; // 30% occupied
            if (isOccupied) {
                seatDiv.classList.add('occupied');
            } else {
                seatDiv.classList.add('available');
                seatDiv.onclick = () => toggleSeatSelection(zone, row, seat);
            }
            
            seatsContainer.appendChild(seatDiv);
        }
        
        rowDiv.appendChild(seatsContainer);
        seatGrid.appendChild(rowDiv);
    }
    
    updateSelectedSeatsDisplay();
}

function toggleSeatSelection(zone, row, seat) {
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    const seatId = `${row}-${seat}`;
    const seatElement = document.querySelector(`[data-row="${row}"][data-seat="${seat}"]`);
    
    // Check if seat is already selected
    const seatIndex = selectedSeats.findIndex(s => s.id === seatId);
    
    if (seatIndex > -1) {
        // Deselect seat
        selectedSeats.splice(seatIndex, 1);
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
    } else {
        // Check if we can select more seats
        if (selectedSeats.length >= ticketCount) {
            const errorDiv = document.getElementById('bookingError');
            errorDiv.textContent = `Вы можете выбрать максимум ${ticketCount} мест. Отмените выбор других мест, чтобы выбрать это.`;
            errorDiv.classList.add('show');
            setTimeout(() => errorDiv.classList.remove('show'), 3000);
            return;
        }
        
        // Select seat
        selectedSeats.push({
            id: seatId,
            row: row,
            seat: seat,
            zone: zone.name,
            zoneId: zone.id
        });
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');
    }
    
    updateSelectedSeatsDisplay();
    checkFormCompletion();
}

function updateSelectedSeatsDisplay() {
    const countSpan = document.getElementById('selectedSeatsCount');
    const listSpan = document.getElementById('selectedSeatsList');
    
    countSpan.textContent = selectedSeats.length;
    
    if (selectedSeats.length > 0) {
        const seatsList = selectedSeats
            .map(s => `Ряд ${s.row}, Место ${s.seat}`)
            .join('; ');
        listSpan.textContent = seatsList;
    } else {
        listSpan.textContent = '-';
    }
}

function updateTotalPrice() {
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    const priceLimit = parseInt(document.getElementById('priceLimit').value) || 0;
    
    document.getElementById('totalTickets').textContent = ticketCount;
    document.getElementById('totalPrice').textContent = `${priceLimit * ticketCount} ₽`;
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
    // Ticket count change
    document.getElementById('ticketCount').addEventListener('change', function() {
        const newCount = parseInt(this.value);
        
        // Update Fan ID fields
        if (currentMatch.fanIdRequired) {
            updateFanIdFields(newCount);
        }
        
        // If zone is selected, reset seat selection and regenerate seat map
        if (selectedZone) {
            const maxConsecutiveSeats = selectedZone.seatsPerRow;
            if (newCount > maxConsecutiveSeats) {
                const errorDiv = document.getElementById('bookingError');
                errorDiv.textContent = `В выбранной зоне "${selectedZone.name}" максимум ${maxConsecutiveSeats} мест в ряду. Выберите другую зону или уменьшите количество билетов.`;
                errorDiv.classList.add('show');
                setTimeout(() => errorDiv.classList.remove('show'), 5000);
                selectedZone = null;
                selectedSeats = [];
                document.querySelectorAll('.stadium-sector').forEach(s => s.classList.remove('selected'));
                document.getElementById('seatMapContainer').style.display = 'none';
            } else {
                // Reset selected seats when ticket count changes
                selectedSeats = [];
                displaySeatMap(selectedZone);
            }
        }
        
        updateTotalPrice();
        checkFormCompletion();
    });
    
    // Price limit change
    document.getElementById('priceLimit').addEventListener('input', updateTotalPrice);
    
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
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    const priceLimit = document.getElementById('priceLimit').value;
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const ofertaAccept = document.getElementById('ofertaAccept').checked;
    
    let fanIdValid = true;
    if (currentMatch.fanIdRequired) {
        // Check if all Fan IDs are filled
        fanIdValid = ticketFanIds.every(fanId => fanId.trim() !== '');
    }
    
    const submitBtn = document.getElementById('submitBooking');
    
    // Check if zone is selected and correct number of seats are selected
    const zoneSelected = selectedZone !== null;
    const seatsSelected = selectedSeats.length === ticketCount;
    
    if (zoneSelected && seatsSelected && priceLimit && fullName && email && ofertaAccept && selectedCard && fanIdValid) {
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
    
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    
    // Validate zone selection
    if (!selectedZone) {
        errorDiv.textContent = 'Выберите зону на карте стадиона';
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate seat selection
    if (selectedSeats.length !== ticketCount) {
        errorDiv.textContent = `Необходимо выбрать ${ticketCount} мест в секторе`;
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate Fan IDs if required
    if (currentMatch.fanIdRequired) {
        const allFanIdsFilled = ticketFanIds.every(fanId => fanId.trim() !== '');
        if (!allFanIdsFilled) {
            errorDiv.textContent = 'Необходимо указать Fan ID для каждого билета';
            errorDiv.classList.add('show');
            return;
        }
    }
    
    // Collect form data
    const bookingData = {
        userId: user.id,
        matchId: currentMatch.id,
        matchTitle: `${currentMatch.homeTeam.name} - ${currentMatch.awayTeam.name}`,
        tournament: currentMatch.tournament,
        date: currentMatch.date,
        time: currentMatch.time,
        stadium: currentMatch.stadium,
        zone: selectedZone.name,
        zoneId: selectedZone.id,
        ticketCount: ticketCount,
        selectedSeats: selectedSeats, // Include selected seats
        priceLimit: parseInt(document.getElementById('priceLimit').value),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        fanIds: currentMatch.fanIdRequired ? ticketFanIds : null,
        cardId: selectedCard
    };
    
    // Create preorder
    const result = PreorderManager.create(bookingData);
    
    if (result.success) {
        // Update user's Fan ID if provided (use first Fan ID)
        if (bookingData.fanIds && bookingData.fanIds[0] && bookingData.fanIds[0] !== user.fanId) {
            Auth.updateProfile({ fanId: bookingData.fanIds[0] });
        }
        
        // Show success and redirect
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message show';
        const seatsInfo = selectedSeats.map(s => `Ряд ${s.row}, Место ${s.seat}`).join('; ');
        successDiv.innerHTML = `<strong>Предзаказ успешно оформлен!</strong><br><br>Зона: ${bookingData.zone}<br>Выбранные места: ${seatsInfo}<br>Количество билетов: ${ticketCount}<br><br>Вы получите уведомление на email.`;
        errorDiv.parentNode.insertBefore(successDiv, errorDiv);
        
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 3000);
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
