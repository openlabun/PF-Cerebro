import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('info')

  const nextPath = location.state?.from?.pathname || '/'

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
      setMessage('Completa correo y contrasena.')
      return
    }

    setIsSubmitting(true)
    setTone('info')
    setMessage('Iniciando sesion...')

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      navigate(nextPath, { replace: true })
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="auth-page">
        <div className="auth-page-header">
          <h1>Iniciar sesion</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <button className="auth-tab active" type="button">
                Iniciar sesion
              </button>
              <Link className="auth-tab" to="/signup">
                Crear cuenta
              </Link>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Correo</span>
                <input
                  autoComplete="email"
                  autoCapitalize="none"
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
                <span>Contrasena</span>
                <input
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  name="password"
                  onChange={handleChange}
                  placeholder="Tu contrasena"
                  spellCheck="false"
                  type="password"
                  value={form.password}
                />
              </label>

              <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className={`auth-feedback${tone !== 'info' ? ` ${tone}` : ''}`}>{message || ' '}</p>

            <p className="auth-links">
              No tienes cuenta? <Link to="/signup">Crear cuenta</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
