const achievementBadges = [
  {
    key: 'first-game',
    label: 'Primera partida',
    icon: '🏁',
    description: 'Completa tu primera partida de Sudoku.',
  },
  {
    key: 'five-games',
    label: '5 partidas',
    icon: '5️⃣',
    description: 'Completa 5 partidas de Sudoku.',
  },
  {
    key: 'ten-games',
    label: '10 partidas',
    icon: '🔟',
    description: 'Completa 10 partidas de Sudoku.',
  },
  {
    key: 'score-over-500',
    label: 'Puntaje >500',
    icon: '🏏',
    description: 'Alcanza un puntaje mayor a 500 en una partida.',
  },
]

function BadgeModal({ show, onClose, activeBadgeSlot, selectedBadges, unlockedBadges, onBadgeSelect }) {
  if (!show || activeBadgeSlot === null) return null

  const handleBadgeSelect = (badgeKey) => {
    onBadgeSelect(badgeKey)
  }

  return (
    <div id="badge-modal" className="picker-modal" aria-hidden={!show}>
      <div className="picker-backdrop" data-close-picker="badge" onClick={onClose}></div>
      <div className="picker-card" role="dialog" aria-modal="true" aria-labelledby="badge-modal-title">
        <button
          type="button"
          className="picker-x"
          data-close-picker="badge"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ✖
        </button>
        <h3 id="badge-modal-title">Elige insignia</h3>
        <div className="picker-options" id="badge-options">
          {achievementBadges.map((badge) => {
            const unlocked = unlockedBadges.has(badge.key)
            const isSelected = selectedBadges[activeBadgeSlot] === badge.key

            return (
              <button
                key={badge.key}
                type="button"
                className={`picker-option ${!unlocked ? 'locked' : ''} ${isSelected ? 'active' : ''}`}
                title={unlocked ? badge.label : `${badge.label} (bloqueado)`}
                onClick={() => unlocked && handleBadgeSelect(badge.key)}
                disabled={!unlocked}
              >
                {badge.icon}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BadgeModal
