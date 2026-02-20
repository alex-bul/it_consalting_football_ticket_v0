// Booking page functionality with zone selection using Fabric.js
let currentMatch = null;
let selectedCard = null;
let selectedSector = null;
let preferredSeats = []; // Array to store preferred seating zone (can be many seats)
let selectedFanIds = []; // Array to store selected Fan ID objects for each ticket
let brushSize = 1; // Brush size (1x1, 3x3, 5x5, etc.)
let canvas = null; // Fabric.js canvas
let seatObjects = {}; // Store seat objects by ID for quick access
let isDrawing = false; // Track if user is drawing

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
    const addNewFanIdBtn = document.getElementById('addNewFanIdBtn');
    
    if (!currentMatch.fanIdRequired) {
        fanIdSection.style.display = 'none';
        selectedFanIds = [];
        return;
    }
    
    fanIdSection.style.display = 'block';
    fanIdContainer.innerHTML = '';
    addNewFanIdBtn.style.display = 'block';
    
    const user = Auth.getCurrentUser();
    const savedFanIds = FanIdManager.getAll(user.id);
    
    // Initialize selectedFanIds array
    selectedFanIds = new Array(ticketCount).fill(null);
    
    for (let i = 0; i < ticketCount; i++) {
        const fanIdGroup = document.createElement('div');
        fanIdGroup.className = 'form-group fan-id-selector';
        fanIdGroup.style.marginBottom = '1.5rem';
        
        let selectOptions = '<option value="">Выберите Fan ID</option>';
        savedFanIds.forEach(fanId => {
            selectOptions += `<option value="${fanId.id}">${fanId.name} - ${fanId.number}</option>`;
        });
        
        fanIdGroup.innerHTML = `
            <label for="fanIdSelect${i}">Fan ID для билета ${i + 1}</label>
            <select id="fanIdSelect${i}" class="fan-id-select" data-ticket-index="${i}" required>
                ${selectOptions}
            </select>
            <span class="field-hint warning">⚠️ Обязательное поле для посещения матча</span>
        `;
        fanIdContainer.appendChild(fanIdGroup);
        
        // Add event listener to select
        setTimeout(() => {
            const select = document.getElementById(`fanIdSelect${i}`);
            select.addEventListener('change', function() {
                const index = parseInt(this.dataset.ticketIndex);
                const fanIdId = this.value;
                
                if (fanIdId) {
                    const fanId = FanIdManager.getById(fanIdId);
                    selectedFanIds[index] = fanId;
                } else {
                    selectedFanIds[index] = null;
                }
                
                checkFormCompletion();
            });
        }, 0);
    }
}

function createStadiumVisualization() {
    const container = document.getElementById('stadiumSectors');
    
    // Clear existing sectors
    container.innerHTML = '';
    
    // Create 3x3 grid layout with field in center
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

function selectZone(sector) {
    selectedSector = sector;
    preferredSeats = []; // Reset preferred seats when changing sector
    
    // Update visual selection
    document.querySelectorAll('.stadium-sector').forEach(s => s.classList.remove('selected'));
    document.querySelector(`[data-sector-id="${sector.id}"]`).classList.add('selected');
    
    // Update info
    document.getElementById('selectedSectorName').textContent = sector.name;
    document.getElementById('selectedSectorPrice').textContent = `${sector.price} ₽`;
    
    // Update base price
    document.getElementById('basePrice').textContent = `${sector.price} ₽`;
    document.getElementById('priceLimit').min = sector.price;
    document.getElementById('priceLimit').value = sector.price;
    
    // Show seat map for zone selection
    displaySeatMap(sector);
    
    updateTotalPrice();
    checkFormCompletion();
}

function displaySeatMap(sector) {
    const container = document.getElementById('seatMapContainer');
    const currentSectorName = document.getElementById('currentSectorName');
    
    // Show container
    container.style.display = 'block';
    currentSectorName.textContent = sector.name;
    
    // Initialize Fabric.js canvas
    initializeFabricCanvas(sector);
    
    updatePreferredZoneDisplay();
}

function initializeFabricCanvas(sector) {
    const canvasElement = document.getElementById('seatCanvas');
    
    // Clear existing canvas if any
    if (canvas) {
        canvas.dispose();
    }
    
    seatObjects = {};
    
    // Calculate canvas dimensions with mobile responsiveness
    const isMobile = window.innerWidth <= 768;
    const seatSize = isMobile ? 24 : 30; // Smaller seats on mobile
    const seatGap = isMobile ? 3 : 5; // Smaller gap on mobile
    const rowLabelWidth = isMobile ? 50 : 60; // Narrower labels on mobile
    const canvasWidth = rowLabelWidth + (sector.seatsPerRow * (seatSize + seatGap)) + 20;
    const canvasHeight = (sector.rows * (seatSize + seatGap)) + 40;
    
    // Set canvas size
    canvasElement.width = canvasWidth;
    canvasElement.height = canvasHeight;
    
    // Initialize Fabric canvas
    canvas = new fabric.Canvas('seatCanvas', {
        selection: false,
        backgroundColor: '#f8f9fa'
    });
    
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // Generate seats
    const fontSize = isMobile ? 11 : 14;
    const seatFontSize = isMobile ? 10 : 12;
    
    for (let row = 1; row <= sector.rows; row++) {
        // Add row label
        const rowLabel = new fabric.Text(`Ряд ${row}`, {
            left: 10,
            top: 20 + (row - 1) * (seatSize + seatGap) + seatSize / 3,
            fontSize: fontSize,
            fontFamily: 'Arial',
            fill: '#333',
            selectable: false
        });
        canvas.add(rowLabel);
        
        for (let seat = 1; seat <= sector.seatsPerRow; seat++) {
            const seatId = `${row}-${seat}`;
            const x = rowLabelWidth + (seat - 1) * (seatSize + seatGap);
            const y = 20 + (row - 1) * (seatSize + seatGap);
            
            // Randomly mark some seats as occupied (for demo purposes)
            const isOccupied = Math.random() < 0.3; // 30% occupied
            
            // Create seat rectangle
            const seatRect = new fabric.Rect({
                left: x,
                top: y,
                width: seatSize,
                height: seatSize,
                fill: isOccupied ? '#e74c3c' : '#2ecc71',
                stroke: '#333',
                strokeWidth: 1,
                rx: 3,
                ry: 3,
                selectable: false,
                hoverCursor: isOccupied ? 'not-allowed' : 'pointer'
            });
            
            // Create seat number text
            const seatText = new fabric.Text(seat.toString(), {
                left: x + seatSize / 2,
                top: y + seatSize / 2,
                fontSize: seatFontSize,
                fontFamily: 'Arial',
                fill: '#fff',
                originX: 'center',
                originY: 'center',
                selectable: false
            });
            
            // Group seat and text
            const seatGroup = new fabric.Group([seatRect, seatText], {
                selectable: false,
                hoverCursor: isOccupied ? 'not-allowed' : 'pointer'
            });
            
            // Store seat data
            seatGroup.seatData = {
                id: seatId,
                row: row,
                seat: seat,
                isOccupied: isOccupied,
                isSelected: false,
                rect: seatRect
            };
            
            seatObjects[seatId] = seatGroup;
            canvas.add(seatGroup);
        }
    }
    
    // Add mouse event handlers for brush painting
    canvas.on('mouse:down', function(options) {
        isDrawing = true;
        handleCanvasClick(options);
    });
    
    canvas.on('mouse:move', function(options) {
        if (isDrawing) {
            handleCanvasClick(options);
        }
    });
    
    canvas.on('mouse:up', function() {
        isDrawing = false;
    });
    
    // Add touch event handlers for mobile devices
    canvas.on('touch:gesture', function(e) {
        e.e.preventDefault();
    });
    
    canvas.on('touch:drag', function(options) {
        if (isDrawing) {
            handleCanvasClick(options);
        }
    });
    
    // Handle window resize for responsive canvas
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (selectedSector) {
                displaySeatMap(selectedSector);
            }
        }, 250);
    });
    
    canvas.renderAll();
}

function handleCanvasClick(options) {
    const pointer = canvas.getPointer(options.e);
    
    // Find which seat was clicked
    const objects = canvas.getObjects();
    for (let obj of objects) {
        if (obj.seatData && obj.containsPoint(pointer)) {
            if (!obj.seatData.isOccupied) {
                paintWithBrush(obj.seatData.row, obj.seatData.seat);
            }
            break;
        }
    }
}

function paintWithBrush(centerRow, centerSeat) {
    const radius = Math.floor(brushSize / 2);
    
    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
        for (let s = centerSeat - radius; s <= centerSeat + radius; s++) {
            const seatId = `${r}-${s}`;
            const seatObj = seatObjects[seatId];
            
            if (seatObj && !seatObj.seatData.isOccupied && !seatObj.seatData.isSelected) {
                // Mark as selected
                seatObj.seatData.isSelected = true;
                seatObj.seatData.rect.set('fill', '#3498db');
                
                // Add to preferred seats
                preferredSeats.push({
                    id: seatId,
                    row: r,
                    seat: s
                });
            }
        }
    }
    
    canvas.renderAll();
    updatePreferredZoneDisplay();
    checkFormCompletion();
}

function clearAllSelections() {
    preferredSeats.forEach(s => {
        const seatObj = seatObjects[s.id];
        if (seatObj && !seatObj.seatData.isOccupied) {
            seatObj.seatData.isSelected = false;
            seatObj.seatData.rect.set('fill', '#2ecc71');
        }
    });
    
    preferredSeats = [];
    canvas.renderAll();
    updatePreferredZoneDisplay();
    checkFormCompletion();
}

function updatePreferredZoneDisplay() {
    const countSpan = document.getElementById('selectedSeatsCount');
    const listSpan = document.getElementById('selectedSeatsList');
    
    countSpan.textContent = preferredSeats.length;
    
    if (preferredSeats.length > 0) {
        // Group by rows for better display
        const rowGroups = {};
        preferredSeats.forEach(s => {
            if (!rowGroups[s.row]) rowGroups[s.row] = [];
            rowGroups[s.row].push(s.seat);
        });
        
        const displayText = Object.keys(rowGroups)
            .sort((a, b) => a - b)
            .map(row => {
                const seats = rowGroups[row].sort((a, b) => a - b);
                return `Ряд ${row}: места ${seats.join(', ')}`;
            })
            .join('; ');
        
        listSpan.textContent = displayText;
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
    // Add new Fan ID button
    const addNewFanIdBtn = document.getElementById('addNewFanIdBtn');
    const addFanIdModal = document.getElementById('addFanIdModal');
    const addFanIdForm = document.getElementById('addFanIdForm');
    const newFanIdNameInput = document.getElementById('newFanIdName');
    const newFanIdNumberInput = document.getElementById('newFanIdNumber');
    
    addNewFanIdBtn.addEventListener('click', function() {
        addFanIdModal.classList.add('show');
        newFanIdNameInput.focus();
    });
    
    // Format Fan ID input
    newFanIdNumberInput.addEventListener('input', function() {
        this.value = formatFanId(this.value);
    });
    
    // Add Fan ID form submission
    addFanIdForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const user = Auth.getCurrentUser();
        const name = newFanIdNameInput.value.trim();
        const number = newFanIdNumberInput.value.trim();
        const errorDiv = document.getElementById('addFanIdError');
        
        errorDiv.classList.remove('show');
        
        if (!name || !number) {
            errorDiv.textContent = 'Заполните все поля';
            errorDiv.classList.add('show');
            return;
        }
        
        if (!validateFanId(number)) {
            errorDiv.textContent = 'Fan ID должен содержать 9 цифр';
            errorDiv.classList.add('show');
            return;
        }
        
        const result = FanIdManager.add(user.id, { name, number });
        
        if (result.success) {
            addFanIdModal.classList.remove('show');
            addFanIdForm.reset();
            
            // Refresh Fan ID fields to show new option
            const ticketCount = parseInt(document.getElementById('ticketCount').value);
            updateFanIdFields(ticketCount);
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message show';
            successDiv.textContent = 'Fan ID успешно добавлен';
            document.querySelector('.booking-container h2').after(successDiv);
            setTimeout(() => successDiv.remove(), 3000);
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('show');
        }
    });
    
    // Brush size selector
    document.querySelectorAll('.brush-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            brushSize = parseInt(this.dataset.size);
        });
    });
    
    // Clear selection button
    document.getElementById('clearSelectionBtn').addEventListener('click', clearAllSelections);
    
    // Ticket count change
    document.getElementById('ticketCount').addEventListener('change', function() {
        const newCount = parseInt(this.value);
        
        // Update Fan ID fields
        if (currentMatch.fanIdRequired) {
            updateFanIdFields(newCount);
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
        // Check if all Fan IDs are selected
        fanIdValid = selectedFanIds.every(fanId => fanId !== null);
    }
    
    const submitBtn = document.getElementById('submitBooking');
    
    // Check if sector is selected and at least some preferred seats are selected
    const sectorSelected = selectedSector !== null;
    const hasPreferredZone = preferredSeats.length > 0;
    
    if (sectorSelected && hasPreferredZone && priceLimit && fullName && email && ofertaAccept && selectedCard && fanIdValid) {
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
    
    // Validate sector selection
    if (!selectedSector) {
        errorDiv.textContent = 'Выберите сектор на карте стадиона';
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate preferred zone selection
    if (preferredSeats.length === 0) {
        errorDiv.textContent = 'Выберите предпочитаемую зону посадки в секторе (можно выбрать несколько мест)';
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate that selected area is greater than or equal to ticket count
    if (preferredSeats.length < ticketCount) {
        errorDiv.textContent = `Выбранная область должна содержать минимум ${ticketCount} мест(а). Сейчас выбрано: ${preferredSeats.length}`;
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate Fan IDs if required
    if (currentMatch.fanIdRequired) {
        const allFanIdsSelected = selectedFanIds.every(fanId => fanId !== null);
        if (!allFanIdsSelected) {
            errorDiv.textContent = 'Необходимо выбрать Fan ID для каждого билета';
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
        sector: selectedSector.name,
        sectorId: selectedSector.id,
        ticketCount: ticketCount,
        preferredZone: preferredSeats, // Preferred seating zone
        priceLimit: parseInt(document.getElementById('priceLimit').value),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        fanIds: currentMatch.fanIdRequired ? selectedFanIds.map(f => ({ id: f.id, name: f.name, number: f.number })) : null,
        cardId: selectedCard
    };
    
    // Create preorder
    const result = PreorderManager.create(bookingData);
    
    if (result.success) {
        // Show success and redirect
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message show';
        
        // Group preferred seats by rows for display
        const rowGroups = {};
        preferredSeats.forEach(s => {
            if (!rowGroups[s.row]) rowGroups[s.row] = [];
            rowGroups[s.row].push(s.seat);
        });
        const zoneInfo = Object.keys(rowGroups)
            .sort((a, b) => a - b)
            .map(row => {
                const seats = rowGroups[row].sort((a, b) => a - b);
                return `Ряд ${row}: места ${seats.join(', ')}`;
            })
            .join('; ');
        
        successDiv.innerHTML = `<strong>Предзаказ успешно оформлен!</strong><br><br>Сектор: ${bookingData.sector}<br>Предпочитаемая зона: ${zoneInfo}<br>Количество билетов: ${ticketCount}<br><br>Система постарается подобрать ${ticketCount} билет(ов) в выбранной зоне.<br>Вы получите уведомление на email.`;
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
