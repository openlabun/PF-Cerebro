function ModeStats({ activeMode, stats, onModeChange }) {
  const modes = ['sudoku', 'torneos', 'pvp']
  const modeLabels = {
    sudoku: 'Sudoku',
    torneos: 'Torneos',
    pvp: 'PvP',
  }

  return (
    <>
      <div className="profile-grid mode-grid-selector" aria-label="Modos del usuario">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`mode-card ${activeMode === mode ? 'active' : ''}`}
            data-mode={mode}
            onClick={() => onModeChange(mode)}
          >
            <h4>{modeLabels[mode]}</h4>
          </button>
        ))}
      </div>

      <article className="mode-detail" id="mode-detail" aria-live="polite">
        <h4>Estadísticas · {modeLabels[activeMode]}</h4>
        <ul>
          {stats[activeMode]?.map((stat, index) => (
            <li key={index}>{stat}</li>
          ))}
        </ul>
      </article>
    </>
  )
}

export default ModeStats
