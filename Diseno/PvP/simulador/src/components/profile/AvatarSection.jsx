function AvatarSection({
  avatar,
  frame,
  name,
  title,
  nivel,
  experiencia,
  xpNext,
  rachaActual,
  isAuthenticated,
  onAvatarClick,
  onStreakClick,
}) {
  // Asegurar que nivel es un número válido
  const safeNivel = Math.floor(Number(nivel) || 47)
  const safeExperiencia = Math.floor(Number(experiencia) || 0)
  const safeXpNext = Math.floor(Number(xpNext) || 1000)
  const safeRacha = Math.floor(Number(rachaActual) || 0)
  const progressPct = Math.min(100, (safeExperiencia / Math.max(1, safeXpNext)) * 100)

  return (
    <div className="summoner-header">
      <button
        className={`avatar-frame ${frame}`}
        type="button"
        aria-label="Elegir foto de perfil"
        onClick={onAvatarClick}
        disabled={!isAuthenticated}
      >
        <div className="avatar-inner">{avatar}</div>
        <span className="level-badge">{safeNivel}</span>
      </button>

      <div className="summoner-meta">
        <p className="eyebrow">{isAuthenticated ? 'Cuenta activa' : 'Invitado'}</p>
        <h3>{name}</h3>
        <p className="profile-title">{title}</p>

        {isAuthenticated && (
          <button
            type="button"
            className="streak-chip"
            aria-label="Ver racha"
            onClick={onStreakClick}
          >
            🔥<span>{safeRacha}</span>
          </button>
        )}

        <div className="profile-level-wrap" aria-label="Progreso de nivel">
          <div className="level-track">
            <div className="level-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
          <p className="level-text">
            Nivel {safeNivel} · {safeExperiencia} / {safeXpNext} XP
          </p>
        </div>
      </div>
    </div>
  )
}

export default AvatarSection
