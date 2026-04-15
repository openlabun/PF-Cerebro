import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { apiClient } from '../services/apiClient.js'

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,}$/

function ResetPasswordPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(() => ({
    token: String(location.state?.token || searchParams.get('token') || '').trim(),
    newPassword: '',
    confirmPassword: '',
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState(
    'Pega el token recibido por correo y define una nueva contraseña segura.',
  )
  const [tone, setTone] = useState('info')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validateForm() {
    if (!form.token.trim() || !form.newPassword || !form.confirmPassword) {
      return 'Completa el token, la nueva contraseña y su confirmación.'
    }

    if (!passwordPolicy.test(form.newPassword)) {
      return 'La contraseña debe tener mínimo 8 caracteres, mayúscula, número y símbolo.'
    }

    if (form.newPassword !== form.confirmPassword) {
      return 'Las contraseñas no coinciden.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const validationError = validateForm()
    if (validationError) {
      setTone('error')
      setMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setTone('info')
    setMessage('Actualizando contraseña...')

    try {
      await apiClient.resetPassword({
        token: form.token.trim(),
        newPassword: form.newPassword,
      })
      setTone('success')
      setMessage('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.')
      setForm((current) => ({
        ...current,
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible restablecer la contraseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="auth-page">
        <div className="auth-page-header">
          <h1>Restablecer contraseña</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <Link className="auth-tab" to="/login">
                Iniciar sesión
              </Link>
              <Link className="auth-tab" to="/forgot-password">
                Recuperar acceso
              </Link>
              <button className="auth-tab active" type="button">
                Nueva contraseña
              </button>
            </div>

            <p className="auth-copy">
              Si abriste un enlace desde tu correo y trae el token en la URL, lo dejamos precargado
              para que solo tengas que escribir la nueva clave.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Token de recuperación</span>
                <input
                  autoCapitalize="none"
                  autoCorrect="off"
                  name="token"
                  onChange={handleChange}
                  placeholder="Pega el token recibido"
                  spellCheck="false"
                  type="text"
                  value={form.token}
                />
              </label>

              <label className="auth-field">
                <span>Nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  name="newPassword"
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres, una mayúscula y un símbolo"
                  type="password"
                  value={form.newPassword}
                />
              </label>

              <label className="auth-field">
                <span>Confirmar nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Repite tu nueva contraseña"
                  type="password"
                  value={form.confirmPassword}
                />
              </label>

              <p className={`auth-feedback auth-feedback--inline${tone !== 'info' ? ` ${tone}` : ''}`}>
                {message}
              </p>

              <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </button>
            </form>

            <p className="auth-links">
              Aún no tienes token? <Link to="/forgot-password">Solicitar recuperación</Link>
            </p>

            <p className="auth-links">
              Ya quedo lista tu clave? <Link to="/login">Volver al login</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default ResetPasswordPage
