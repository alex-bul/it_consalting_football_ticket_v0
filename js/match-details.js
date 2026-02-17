// Match details page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');
    
    if (!matchId) {
        window.location.href = 'index.html';
        return;
    }
    
    const match = getMatchById(matchId);
    
    if (!match) {
        window.location.href = 'index.html';
        return;
    }
    
    displayMatchDetails(match);
});

function displayMatchDetails(match) {
    const container = document.getElementById('matchDetails');
    
    const fanIdWarning = match.fanIdRequired ? 
        '<div class="fan-id-warning">⚠️ Для посещения данного матча требуется Fan ID</div>' : '';
    
    container.innerHTML = `
        <div class="match-detail-header">
            <div style="text-align: center; margin-bottom: 1rem;">
                <span style="color: var(--text-light); font-weight: 600;">${match.tournament}</span>
            </div>
            
            <div class="match-detail-teams">
                <div class="match-detail-team">
                    <div class="match-detail-logo">${match.homeTeam.logo}</div>
                    <div class="match-detail-name">${match.homeTeam.name}</div>
                </div>
                <div class="match-detail-vs">VS</div>
                <div class="match-detail-team">
                    <div class="match-detail-logo">${match.awayTeam.logo}</div>
                    <div class="match-detail-name">${match.awayTeam.name}</div>
                </div>
            </div>
            
            ${fanIdWarning}
            
            <div class="match-detail-info">
                <div class="info-item">
                    <div class="info-label">Дата и время</div>
                    <div class="info-value">${formatDate(match.date)}<br>${match.time}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Стадион</div>
                    <div class="info-value">${match.stadium}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Адрес</div>
                    <div class="info-value">${match.address}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Минимальная цена</div>
                    <div class="info-value" style="color: var(--primary-color);">${match.minPrice} ₽</div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <p style="color: var(--text-light); margin-bottom: 1rem;">${match.description}</p>
            </div>
        </div>
        
        <div style="text-align: center; margin: 2rem 0;">
            <button class="btn btn-primary btn-large" id="bookBtn" style="max-width: 400px;">
                Оформить предзаказ
            </button>
        </div>
    `;
    
    // Book button handler
    document.getElementById('bookBtn').addEventListener('click', function() {
        if (!Auth.isLoggedIn()) {
            window.location.href = `login.html?redirect=booking&matchId=${match.id}`;
        } else {
            window.location.href = `booking.html?matchId=${match.id}`;
        }
    });
}
