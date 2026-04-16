import { useState, useEffect } from 'react'
import AvatarSection from './profile/AvatarSection.jsx'
import BadgesSection from './profile/BadgesSection.jsx'
import ModeStats from './profile/ModeStats.jsx'
import AvatarModal from './profile/AvatarModal.jsx'
import BadgeModal from './profile/BadgeModal.jsx'
import StreakModal from './profile/StreakModal.jsx'

function ProfileCard({
  profileData,
  profileModeStats,
  isAuthenticated,
  loading,
  unlockedBadges: parentUnlockedBadges,
  selectedFrame: parentSelectedFrame,
  activeMode,
  onModeChange,
}) {
  const [selectedAvatar, setSelectedAvatar] = useState('♔')
  const [selectedFrame, setSelectedFrame] = useState(parentSelectedFrame || 'frame-royal')
  const [selectedBadges, setSelectedBadges] = useState(Array(6).fill(null))
  const [unlockedBadges, setUnlockedBadges] = useState(new Set(parentUnlockedBadges || []))
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [activeBadgeSlot, setActiveBadgeSlot] = useState(null)
  const [showStreakModal, setShowStreakModal] = useState(false)

  const xpParaSiguienteNivel = (nivel) => {
    const lvl = Number(nivel) || 1
    if (lvl >= 1 && lvl <= 10) return lvl * 100
    if (lvl >= 11 && lvl <= 30) return lvl * 150
    return lvl * 250
  }

  const nivel = profileData?.nivel || 47
  const xpNext = xpParaSiguienteNivel(nivel)
  const safeXp = Math.max(0, Math.min(profileData?.experiencia || 0, xpNext))
  const progressPct = (safeXp / xpNext) * 100

  useEffect(() => {
    if (parentSelectedFrame) {
      setSelectedFrame(parentSelectedFrame)
    }
  }, [parentSelectedFrame])

  useEffect(() => {
    if (parentUnlockedBadges) {
      const unlocked = new Set(parentUnlockedBadges)
      setUnlockedBadges(unlocked)

      setSelectedBadges((prev) => {
        const next = [...prev]
        const unlockedArray = Array.from(unlocked)

        for (let i = 0; i < next.length; i += 1) {
          if (!next[i] && unlockedArray[i]) {
            next[i] = unlockedArray[i]
          }
        }

        return next
      })
    }
  }, [parentUnlockedBadges])

  if (loading) {
    return <div className="board-card profile-card">Cargando perfil...</div>
  }

  return (
    <>
      <div className="board-card profile-card lol-profile">
        <AvatarSection
          avatar={selectedAvatar}
          frame={selectedFrame}
          name={profileData?.name || 'Invitado#0001'}
          nivel={nivel}
          experiencia={safeXp}
          xpNext={xpNext}
          rachaActual={profileData?.rachaActual || 0}
          isAuthenticated={isAuthenticated}
          onAvatarClick={() => setShowAvatarModal(true)}
          onStreakClick={() => setShowStreakModal(true)}
        />

        <BadgesSection
          selectedBadges={selectedBadges}
          unlockedBadges={unlockedBadges}
          isAuthenticated={isAuthenticated}
          onBadgeSlotClick={(slot) => {
            setActiveBadgeSlot(slot)
            setShowBadgeModal(true)
          }}
        />

        <ModeStats
          activeMode={activeMode}
          stats={profileModeStats}
          onModeChange={onModeChange}
        />
      </div>

      <AvatarModal 
        show={showAvatarModal} 
        onClose={() => setShowAvatarModal(false)} 
        onSelect={setSelectedAvatar} 
        selectedFrame={selectedFrame} 
        onFrameChange={setSelectedFrame} 
        isFrameUnlocked={(frame) => {
          const streak = Number(profileData?.rachaActual || 0)
          const min = Number(frame?.minStreak || 0)
          return streak >= min || frame?.key === parentSelectedFrame
        }} 
      />

      <BadgeModal 
        show={showBadgeModal} 
        onClose={() => setShowBadgeModal(false)} 
        activeBadgeSlot={activeBadgeSlot} 
        selectedBadges={selectedBadges} 
        unlockedBadges={unlockedBadges} 
        onBadgeSelect={(badgeKey) => {
          const newBadges = [...selectedBadges]
          newBadges[activeBadgeSlot] = badgeKey
          setSelectedBadges(newBadges)
          setShowBadgeModal(false)
        }} 
      />

      <StreakModal 
        show={showStreakModal} 
        onClose={() => setShowStreakModal(false)} 
        streakDays={profileData?.rachaActual || 0} 
      />
    </>
  )
}

export default ProfileCard

