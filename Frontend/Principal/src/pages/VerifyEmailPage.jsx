import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { apiClient } from '../services/apiClient.js'

function VerifyEmailPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(() => ({
    email: String(location.state?.email || searchParams.get('email') || '').trim(),
    code: String(searchParams.get('code') || '').trim(),
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState(() => {
    const initialMessage = location.state?.message
    if (typeof initialMessage === 'string' && initialMessage.trim()) {
      return initialMessage.trim()
    }
    return 'Ingresa el correo y el código que recibiste para activar tu cuenta.'
  })
  const [tone, setTone] = useState('info')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    if (!form.email.trim() || !form.code.trim()) {
      setTone('error')
      setMessage('Completa el correo y el código de verificación.')
      return
    }

    setIsSubmitting(true)
    setTone('info')
    setMessage('Verificando correo...')

    try {
      await apiClient.verifyEmail({
        email: form.email.trim().toLowerCase(),
        code: form.code.trim(),
      })
      setTone('success')
      setMessage('Correo verificado. Ya puedes iniciar sesión con tu cuenta.')
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible verificar el correo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="auth-page">
        <div className="auth-page-header">
          <h1>Verificar correo</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <Link className="auth-tab" to="/login">
                Iniciar sesión
              </Link>
              <Link className="auth-tab" to="/signup">
                Crear cuenta
              </Link>
              <button className="auth-tab active" type="button">
                Verificar correo
              </button>
            </div>

            <p className="auth-copy">
              Si el registro quedo pendiente, escribe el mismo correo con el que creaste la
              cuenta y el código recibido por email.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Correo</span>
                <input
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  name="email"
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  spellCheck="false"
                  type="email"
                  value={form.email}
                />
              </label>

              <label className="auth-field">
                <span>Codigo</span>
                <input
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  name="code"
                  onChange={handleChange}
                  placeholder="Ingresa tu código"
                  spellCheck="false"
                  type="text"
                  value={form.code}
                />
              </label>

              <p className={`auth-feedback auth-feedback--inline${tone !== 'info' ? ` ${tone}` : ''}`}>
                {message}
              </p>

              <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Verificando...' : 'Verificar correo'}
              </button>
            </form>

            <p className="auth-links">
              Ya puedes iniciar sesión? <Link to="/login">Volver al login</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default VerifyEmailPage
