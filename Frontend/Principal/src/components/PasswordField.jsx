import { useId, useState } from 'react'

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M1.5 12s3.8-6.5 10.5-6.5S22.5 12 22.5 12s-3.8 6.5-10.5 6.5S1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" fill="none" r="3.25" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const fieldId = useId()
  const normalizedLabel = String(label || 'contraseña').toLowerCase()

  return (
    <label className="auth-field" htmlFor={fieldId}>
      <span>{label}</span>
      <div className="auth-password-row">
        <input
          id={fieldId}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect="off"
          className="auth-password-input"
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          spellCheck="false"
          type={isVisible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={`${isVisible ? 'Ocultar' : 'Mostrar'} ${normalizedLabel}`}
          aria-pressed={isVisible}
          className={`auth-password-toggle${isVisible ? ' is-visible' : ''}`}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          <EyeIcon />
        </button>
      </div>
    </label>
  )
}

export default PasswordField
