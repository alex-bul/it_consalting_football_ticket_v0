// Booking page functionality with interactive seat map
let currentMatch = null;
let selectedCard = null;
let selectedSector = null;
let selectedSeats = [];

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

function createStadiumVisualization() {
    const container = document.getElementById('stadiumSectors');
    container.innerHTML = '';
    
    // Create sector layout (simulating stadium structure)
    const sectorLayout = [
        ['A', null, 'B'],
        ['D', 'FIELD', 'E'],
        ['C', null, 'VIP']
    ];
    
    sectorLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'sector-row';
        
        row.forEach(sectorId => {
            if (sectorId === 'FIELD') {
                // Field is already displayed separately
                return;
            } else if (sectorId === null) {
                const spacer = document.createElement('div');
                spacer.className = 'sector-spacer';
                rowDiv.appendChild(spacer);
            } else {
                const sector = currentMatch.sectors.find(s => s.id === sectorId);
                if (sector) {
                    const sectorDiv = document.createElement('div');
                    sectorDiv.className = 'stadium-sector';
                    sectorDiv.dataset.sectorId = sector.id;
                    sectorDiv.innerHTML = `
                        <div class="sector-name">${sector.name}</div>
                        <div class="sector-price">от ${sector.price} ₽</div>
                        <div class="sector-capacity">${sector.rows}x${sector.seatsPerRow} мест</div>
                    `;
                    sectorDiv.onclick = () => selectSector(sector);
                    rowDiv.appendChild(sectorDiv);
                }
            }
        });
        
        container.appendChild(rowDiv);
    });
}

function selectSector(sector) {
    selectedSector = sector;
    selectedSeats = [];
    
    // Update visual selection
    document.querySelectorAll('.stadium-sector').forEach(s => s.classList.remove('selected'));
    document.querySelector(`[data-sector-id="${sector.id}"]`).classList.add('selected');
    
    // Update info
    document.getElementById('selectedSectorName').textContent = sector.name;
    document.getElementById('selectedSectorPrice').textContent = `${sector.price} ₽`;
    document.getElementById('currentSectorName').textContent = sector.name;
    
    // Update base price
    document.getElementById('basePrice').textContent = `${sector.price} ₽`;
    document.getElementById('priceLimit').min = sector.price;
    document.getElementById('priceLimit').value = sector.price;
    
    // Show seat map
    document.getElementById('seatMapContainer').style.display = 'block';
    createSeatGrid(sector);
    
    updateTotalPrice();
    checkFormCompletion();
}

function createSeatGrid(sector) {
    const grid = document.getElementById('seatGrid');
    grid.innerHTML = '';
    grid.style.setProperty('--seats-per-row', sector.seatsPerRow);
    
    // Simulate some occupied seats (random for demo)
    const occupiedSeats = generateOccupiedSeats(sector.rows, sector.seatsPerRow);
    
    for (let row = 1; row <= sector.rows; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        // Row label
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = `Ряд ${row}`;
        rowDiv.appendChild(rowLabel);
        
        // Seats
        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'seats-container';
        
        for (let seat = 1; seat <= sector.seatsPerRow; seat++) {
            const seatDiv = document.createElement('div');
            const seatId = `${row}-${seat}`;
            const isOccupied = occupiedSeats.has(seatId);
            
            seatDiv.className = 'seat';
            if (isOccupied) {
                seatDiv.classList.add('occupied');
            } else {
                seatDiv.classList.add('available');
            }
            
            seatDiv.dataset.row = row;
            seatDiv.dataset.seat = seat;
            seatDiv.dataset.seatId = seatId;
            seatDiv.textContent = seat;
            
            if (!isOccupied) {
                seatDiv.onclick = () => toggleSeat(seatDiv, row, seat);
            }
            
            seatsContainer.appendChild(seatDiv);
        }
        
        rowDiv.appendChild(seatsContainer);
        grid.appendChild(rowDiv);
    }
}

function generateOccupiedSeats(rows, seatsPerRow) {
    const occupied = new Set();
    const occupiedCount = Math.floor(rows * seatsPerRow * 0.3); // 30% occupied
    
    for (let i = 0; i < occupiedCount; i++) {
        const row = Math.floor(Math.random() * rows) + 1;
        const seat = Math.floor(Math.random() * seatsPerRow) + 1;
        occupied.add(`${row}-${seat}`);
    }
    
    return occupied;
}

function toggleSeat(seatDiv, row, seat) {
    const seatId = `${row}-${seat}`;
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
    
    if (seatDiv.classList.contains('selected')) {
        // Deselect
        seatDiv.classList.remove('selected');
        seatDiv.classList.add('available');
        selectedSeats = selectedSeats.filter(s => s.id !== seatId);
    } else {
        // Check if we can select more seats
        if (selectedSeats.length >= ticketCount) {
            alert(`Вы можете выбрать максимум ${ticketCount} мест. Измените количество билетов или отмените выбор других мест.`);
            return;
        }
        
        // Select
        seatDiv.classList.remove('available');
        seatDiv.classList.add('selected');
        selectedSeats.push({ id: seatId, row, seat });
    }
    
    updateSelectedSeatsDisplay();
    checkFormCompletion();
}

function updateSelectedSeatsDisplay() {
    document.getElementById('selectedSeatsCount').textContent = selectedSeats.length;
    
    if (selectedSeats.length > 0) {
        const seatsList = selectedSeats
            .sort((a, b) => a.row - b.row || a.seat - b.seat)
            .map(s => `Ряд ${s.row}, Место ${s.seat}`)
            .join('; ');
        document.getElementById('selectedSeatsList').textContent = seatsList;
    } else {
        document.getElementById('selectedSeatsList').textContent = '-';
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
        
        // If selected seats exceed new count, clear selection
        if (selectedSeats.length > newCount) {
            alert(`Количество выбранных мест (${selectedSeats.length}) превышает новое количество билетов. Выбор мест сброшен.`);
            clearSeatSelection();
        }
        
        updateTotalPrice();
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

function clearSeatSelection() {
    selectedSeats = [];
    document.querySelectorAll('.seat.selected').forEach(seat => {
        seat.classList.remove('selected');
        seat.classList.add('available');
    });
    updateSelectedSeatsDisplay();
}

function checkFormCompletion() {
    const ticketCount = parseInt(document.getElementById('ticketCount').value);
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
    
    // Check if sector is selected and seats are selected
    const sectorSelected = selectedSector !== null;
    const seatsSelected = selectedSeats.length === ticketCount;
    
    if (sectorSelected && seatsSelected && priceLimit && fullName && email && ofertaAccept && selectedCard && fanIdValid) {
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
    
    // Validate seat selection
    if (!selectedSector) {
        errorDiv.textContent = 'Выберите сектор на карте стадиона';
        errorDiv.classList.add('show');
        return;
    }
    
    if (selectedSeats.length !== ticketCount) {
        errorDiv.textContent = `Выберите ${ticketCount} мест на карте`;
        errorDiv.classList.add('show');
        return;
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
        sector: selectedSector.name,
        sectorId: selectedSector.id,
        seats: selectedSeats.map(s => `Ряд ${s.row}, Место ${s.seat}`).join('; '),
        seatDetails: selectedSeats,
        ticketCount: ticketCount,
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
        alert(`Предзаказ успешно оформлен!\n\nСектор: ${bookingData.sector}\nМеста: ${bookingData.seats}\n\nВы получите уведомление на email при выдаче билета.`);
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
