// Load and display matches on index page
document.addEventListener('DOMContentLoaded', function() {
    const matchesContainer = document.getElementById('matchesContainer');
    const noMatches = document.getElementById('noMatches');
    
    if (!matchesContainer) return;
    
    if (MATCHES_DATA.length === 0) {
        matchesContainer.style.display = 'none';
        noMatches.style.display = 'block';
        return;
    }
    
    MATCHES_DATA.forEach(match => {
        const matchCard = createMatchCard(match);
        matchesContainer.appendChild(matchCard);
    });
});

function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.onclick = () => {
        window.location.href = `match.html?id=${match.id}`;
    };
    
    // Only show badge if preorder is available AND Fan ID is required
    let badge = '';
    if (match.preorderAvailable && match.fanIdRequired) {
        badge = `<span class="match-badge fan-id-required">🎫 Fan ID</span>`;
    }
    
    card.innerHTML = `
        ${badge}
        <div class="match-teams">
            <div class="team">
                <div class="team-logo">${match.homeTeam.logo}</div>
                <div class="team-name">${match.homeTeam.name}</div>
            </div>
            <div class="vs">VS</div>
            <div class="team">
                <div class="team-logo">${match.awayTeam.logo}</div>
                <div class="team-name">${match.awayTeam.name}</div>
            </div>
        </div>
        <div class="match-info">
            <div class="match-info-row">
                <span class="match-info-label">Турнир:</span>
                <span class="match-info-value">${match.tournament}</span>
            </div>
            <div class="match-info-row">
                <span class="match-info-label">Дата:</span>
                <span class="match-info-value">${formatDate(match.date)} в ${match.time}</span>
            </div>
            <div class="match-info-row">
                <span class="match-info-label">Стадион:</span>
                <span class="match-info-value">${match.stadium}</span>
            </div>
            <div class="match-info-row">
                <span class="match-info-label">От:</span>
                <span class="match-price">${match.minPrice} ₽</span>
            </div>
        </div>
    `;
    
    return card;
}
