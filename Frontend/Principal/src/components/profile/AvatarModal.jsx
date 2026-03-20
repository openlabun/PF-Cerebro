import { useState } from 'react'

const avatarOptions = ['♔', '♕', '♖', '♗', '♘', '♙']

const frameOptions = [
  { key: 'frame-royal', label: 'Real', minStreak: 0 },
  { key: 'frame-arcane', label: 'Arcano', minStreak: 0 },
  { key: 'frame-neon', label: 'Neon', minStreak: 0 },
  { key: 'frame-ember', label: 'Ascua', minStreak: 0 },
  { key: 'frame-ice', label: 'Hielo', minStreak: 0 },
  { key: 'frame-inferno', label: 'Inferno', minStreak: 11 },
]

function AvatarModal({ show, onClose, onSelect, selectedFrame, onFrameChange, isFrameUnlocked }) {
  const [activeTab, setActiveTab] = useState('avatar')

  const handleAvatarSelect = (avatar) => {
    onSelect(avatar)
    onClose()
  }

  const handleFrameSelect = (frame) => {
    if (isFrameUnlocked(frame)) {
      onFrameChange(frame.key)
      onClose()
    }
  }

  if (!show) return null

  return (
    <div id="avatar-modal" className="picker-modal" aria-hidden={!show}>
      <div
        className="picker-backdrop"
        data-close-picker="avatar"
        onClick={onClose}
      ></div>
      <div className="picker-card" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title">
        <button
          type="button"
          className="picker-x"
          data-close-picker="avatar"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ✖
        </button>
        <h3 id="avatar-modal-title">Personaliza perfil</h3>

        <div className="picker-switch">
          <button
            type="button"
            className={`picker-tab ${activeTab === 'avatar' ? 'active' : ''}`}
            data-picker-tab="avatar"
            onClick={() => setActiveTab('avatar')}
          >
            Foto
          </button>
          <button
            type="button"
            className={`picker-tab ${activeTab === 'frame' ? 'active' : ''}`}
            data-picker-tab="frame"
            onClick={() => setActiveTab('frame')}
          >
            Marco
          </button>
        </div>

        {activeTab === 'avatar' && (
          <div className="picker-options" id="avatar-options">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                type="button"
                className="picker-option"
                onClick={() => handleAvatarSelect(avatar)}
              >
                {avatar}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'frame' && (
          <div className="picker-options" id="frame-options">
            {frameOptions.map((frame) => {
              const unlocked = isFrameUnlocked(frame)
              return (
                <button
                  key={frame.key}
                  type="button"
                  className={`picker-option frame-option ${frame.key} ${!unlocked ? 'locked' : ''} ${selectedFrame === frame.key ? 'active' : ''}`}
                  data-frame={frame.key}
                  title={unlocked ? frame.label : `${frame.label} (desbloquea con racha > 10)`}
                  onClick={() => handleFrameSelect(frame)}
                  disabled={!unlocked}
                >
                  {!unlocked ? 'LOCK' : ''}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AvatarModal
