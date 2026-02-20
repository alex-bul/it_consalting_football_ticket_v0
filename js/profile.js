// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadProfile();
    setupEventListeners();
    setupCancelModal();
});

function loadProfile() {
    const user = Auth.getCurrentUser();
    
    // Display profile info
    displayProfileInfo(user);
    
    // Display Fan IDs list
    displayFanIdsList(user.id);
    
    // Display preorders
    displayPreorders(user.id);
    
    // Display cards
    displayCards(user.id);
}

function displayProfileInfo(user) {
    const container = document.getElementById('profileInfo');
    container.innerHTML = `
        <div class="info-row">
            <span class="info-label">ФИО:</span>
            <span class="info-value">${user.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${user.email}</span>
        </div>
    `;
}

function displayFanIdsList(userId) {
    const container = document.getElementById('fanIdsList');
    const fanIds = FanIdManager.getAll(userId);
    
    if (fanIds.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">У вас пока нет добавленных Fan ID</p>';
        return;
    }
    
    container.innerHTML = '';
    
    fanIds.forEach(fanId => {
        const fanIdDiv = document.createElement('div');
        fanIdDiv.className = 'fan-id-item';
        fanIdDiv.innerHTML = `
            <div>
                <div class="fan-id-name"><strong>${fanId.name}</strong></div>
                <div class="fan-id-number">🎫 ${fanId.number}</div>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteFanId('${fanId.id}')">Удалить</button>
        `;
        container.appendChild(fanIdDiv);
    });
}

function displayPreorders(userId) {
    const container = document.getElementById('preordersList');
    const preorders = PreorderManager.getUserPreorders(userId);
    
    if (preorders.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">У вас пока нет предзаказов</p>';
        return;
    }
    
    container.innerHTML = '';
    
    // Sort by date (newest first)
    preorders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    preorders.forEach(preorder => {
        const preorderDiv = document.createElement('div');
        preorderDiv.className = `preorder-item ${preorder.status}`;
        
        const statusText = {
            'pending': 'Ожидает выдачи',
            'cancelled': 'Отменён',
            'completed': 'Выполнен'
        };
        
        const canCancel = preorder.status === 'pending';
        
        // Handle both old format (seats) and new format (zone)
        const seatingInfo = preorder.zone
            ? `🎫 Зона: ${preorder.zone}${preorder.ticketCount > 1 ? ' (места будут в один ряд)' : ''}`
            : `🎫 Сектор ${preorder.sector}, ${preorder.seats || 'Места не указаны'}`;
        
        // Handle Fan IDs - can be array of objects or single value
        let fanIdInfo = '';
        if (preorder.fanIds && Array.isArray(preorder.fanIds)) {
            if (preorder.fanIds.length > 0) {
                // Check if fanIds are objects with name and number
                if (typeof preorder.fanIds[0] === 'object' && preorder.fanIds[0].name) {
                    const fanIdList = preorder.fanIds.map(f => `${f.name} (${f.number})`).join(', ');
                    fanIdInfo = `<p>🎫 Fan ID: ${fanIdList}</p>`;
                } else {
                    // Old format - just numbers
                    fanIdInfo = `<p>🎫 Fan ID: ${preorder.fanIds.join(', ')}</p>`;
                }
            }
        } else if (preorder.fanId) {
            fanIdInfo = `<p>🎫 Fan ID: ${preorder.fanId}</p>`;
        }
        
        preorderDiv.innerHTML = `
            <div class="preorder-header">
                <div class="preorder-title">${preorder.matchTitle}</div>
                <span class="preorder-status ${preorder.status}">${statusText[preorder.status]}</span>
            </div>
            <div class="preorder-details">
                <p><strong>${preorder.tournament}</strong></p>
                <p>📅 ${formatDate(preorder.date)} в ${preorder.time}</p>
                <p>🏟️ ${preorder.stadium}</p>
                <p>${seatingInfo}</p>
                <p>💰 Лимит цены: ${preorder.priceLimit} ₽ × ${preorder.ticketCount} билет(ов) = ${preorder.priceLimit * preorder.ticketCount} ₽</p>
                ${fanIdInfo}
                <p style="font-size: 0.75rem; margin-top: 0.5rem;">Создан: ${new Date(preorder.createdAt).toLocaleString('ru-RU')}</p>
            </div>
            ${canCancel ? `<button class="btn btn-danger" onclick="cancelPreorder('${preorder.id}')">Отменить предзаказ</button>` : ''}
        `;
        
        container.appendChild(preorderDiv);
    });
}

function displayCards(userId) {
    const container = document.getElementById('cardsList');
    const cards = CardManager.getAll(userId);
    
    if (cards.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">У вас нет привязанных карт</p>';
        return;
    }
    
    container.innerHTML = '';
    
    cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.innerHTML = `
            <div>
                <div class="card-number">💳 ${card.maskedNumber}</div>
                <div style="font-size: 0.875rem; color: var(--text-light);">Действует до ${card.expiry}</div>
            </div>
            <button class="btn btn-danger" onclick="deleteCard('${card.id}')">Удалить</button>
        `;
        container.appendChild(cardDiv);
    });
}

function setupEventListeners() {
    // Edit profile button
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    
    editProfileBtn.addEventListener('click', function() {
        const user = Auth.getCurrentUser();
        document.getElementById('editName').value = user.name;
        document.getElementById('editEmail').value = user.email;
        editProfileModal.classList.add('show');
    });
    
    editProfileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('editName').value;
        const email = document.getElementById('editEmail').value;
        const errorDiv = document.getElementById('editError');
        
        errorDiv.classList.remove('show');
        
        if (!validateEmail(email)) {
            errorDiv.textContent = 'Некорректный формат email';
            errorDiv.classList.add('show');
            return;
        }
        
        const result = Auth.updateProfile({ name, email });
        
        if (result.success) {
            editProfileModal.classList.remove('show');
            loadProfile();
        } else {
            errorDiv.textContent = 'Ошибка при обновлении профиля';
            errorDiv.classList.add('show');
        }
    });
    
    // Fan ID management
    const addFanIdBtn = document.getElementById('addFanIdBtn');
    const fanIdForm = document.getElementById('fanIdForm');
    const cancelFanId = document.getElementById('cancelFanId');
    const fanIdNameInput = document.getElementById('fanIdName');
    const fanIdNumberInput = document.getElementById('fanIdNumber');
    
    addFanIdBtn.addEventListener('click', function() {
        fanIdForm.style.display = 'block';
        addFanIdBtn.style.display = 'none';
        fanIdNameInput.focus();
    });
    
    cancelFanId.addEventListener('click', function() {
        fanIdForm.style.display = 'none';
        addFanIdBtn.style.display = 'inline-block';
        fanIdForm.reset();
    });
    
    // Format Fan ID input (only digits)
    fanIdNumberInput.addEventListener('input', function() {
        this.value = formatFanId(this.value);
    });
    
    fanIdForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const user = Auth.getCurrentUser();
        const name = fanIdNameInput.value.trim();
        const number = fanIdNumberInput.value.trim();
        
        if (!name || !number) {
            showError('Заполните все поля');
            return;
        }
        
        if (!validateFanId(number)) {
            showError('Fan ID должен содержать 9 цифр');
            return;
        }
        
        const result = FanIdManager.add(user.id, { name, number });
        
        if (result.success) {
            fanIdForm.style.display = 'none';
            addFanIdBtn.style.display = 'inline-block';
            fanIdForm.reset();
            displayFanIdsList(user.id);
            
            // Show success message
            showSuccess('Fan ID успешно добавлен');
        } else {
            showError(result.error);
        }
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            Auth.logout();
        }
    });
    
    // Close modals
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = function() {
            this.closest('.modal').classList.remove('show');
        };
    });
}

// Cancel preorder function (global for onclick)
let preorderToCancel = null;

function cancelPreorder(preorderId) {
    preorderToCancel = preorderId;
    const modal = document.getElementById('cancelModal');
    modal.classList.add('show');
}

function setupCancelModal() {
    const confirmCancel = document.getElementById('confirmCancel');
    const cancelCancelBtn = document.getElementById('cancelCancelBtn');
    const cancelModal = document.getElementById('cancelModal');
    
    if (confirmCancel) {
        confirmCancel.addEventListener('click', function() {
            if (preorderToCancel) {
                const result = PreorderManager.cancel(preorderToCancel);
                
                if (result.success) {
                    cancelModal.classList.remove('show');
                    const user = Auth.getCurrentUser();
                    displayPreorders(user.id);
                    
                    // Show success message
                    showSuccess('Предзаказ успешно отменён');
                }
                
                preorderToCancel = null;
            }
        });
    }
    
    if (cancelCancelBtn) {
        cancelCancelBtn.addEventListener('click', function() {
            cancelModal.classList.remove('show');
            preorderToCancel = null;
        });
    }
}

// Delete card function (global for onclick)
function deleteCard(cardId) {
    if (confirm('Вы уверены, что хотите удалить эту карту?')) {
        const result = CardManager.delete(cardId);
        
        if (result.success) {
            const user = Auth.getCurrentUser();
            displayCards(user.id);
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message show';
            successDiv.textContent = 'Карта успешно удалена';
            document.querySelector('.profile-container h2').after(successDiv);
            setTimeout(() => successDiv.remove(), 3000);
        }
    }
}

// Delete Fan ID function (global for onclick)
function deleteFanId(fanIdId) {
    if (confirm('Вы уверены, что хотите удалить этот Fan ID?')) {
        const user = Auth.getCurrentUser();
        const result = FanIdManager.delete(fanIdId, user.id);
        
        if (result.success) {
            displayFanIdsList(user.id);
            showSuccess('Fan ID успешно удалён');
        } else {
            showError(result.error || 'Ошибка при удалении Fan ID');
        }
    }
}

// Helper functions for messages
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message show';
    successDiv.textContent = message;
    document.querySelector('.profile-container h2').after(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    document.querySelector('.profile-container h2').after(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};
