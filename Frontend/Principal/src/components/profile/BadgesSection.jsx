const badgeEmojis = {
  'first-game': '🏁',
  'five-games': '5️⃣',
  'ten-games': '🔟',
  'score-over-500': '🏏',
}

function BadgesSection({ selectedBadges, unlockedBadges, isAuthenticated, onBadgeSlotClick }) {
  return (
    <div className="badges-panel" aria-label="Insignias del perfil">
      <h4 className="badges-title">Badges</h4>
      <p className="badge-help">{isAuthenticated ? 'Selecciona un círculo para elegir una insignia.' : 'Inicia sesión para desbloquear insignias.'}</p>
      <div className="badges-grid">
        {selectedBadges.map((badgeKey, index) => (
          <button
            key={index}
            type="button"
            className={`badge-slot ${badgeKey ? 'badge-selected' : ''}`}
            data-badge-slot={index}
            aria-label={`Badge ${index + 1}`}
            onClick={() => isAuthenticated && onBadgeSlotClick(index)}
            disabled={!isAuthenticated}
          >
            {badgeKey && badgeEmojis[badgeKey] ? badgeEmojis[badgeKey] : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BadgesSection
