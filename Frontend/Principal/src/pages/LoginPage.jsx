import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PasswordField from '../components/PasswordField.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('info')

  const nextLocation = location.state?.from || { pathname: '/' }
  const nextPath = `${nextLocation.pathname || '/'}${nextLocation.search || ''}${nextLocation.hash || ''}`

  useEffect(() => {
    if (!isAuthenticated) return
    navigate(nextPath, { replace: true })
  }, [isAuthenticated, navigate, nextPath])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    if (!form.email.trim() || !form.password) {
      setTone('error')
      setMessage('Completa correo y contraseña.')
      return
    }

    setIsSubmitting(true)
    setTone('info')
    setMessage('Iniciando sesión...')

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      navigate(nextPath, { replace: true })
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesión.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="auth-page">
        <div className="auth-page-header">
          <h1>Iniciar sesión</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <button className="auth-tab active" type="button">
                Iniciar sesión
              </button>
              <Link className="auth-tab" to="/signup">
                Crear cuenta
              </Link>
            </div>

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

              <PasswordField
                autoComplete="current-password"
                label="Contraseña"
                name="password"
                onChange={handleChange}
                placeholder="Tu contraseña"
                value={form.password}
              />

              <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className={`auth-feedback${tone !== 'info' ? ` ${tone}` : ''}`}>{message || ' '}</p>

            <p className="auth-links">
              ¿Olvidaste tu contraseña? <Link to="/forgot-password">Recuperarla</Link>
            </p>

            <p className="auth-links">
              ¿Tienes un código de verificación? <Link to="/verify-email">Validar correo</Link>
            </p>

            <p className="auth-links">
              ¿No tienes cuenta? <Link to="/signup">Crear cuenta</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
