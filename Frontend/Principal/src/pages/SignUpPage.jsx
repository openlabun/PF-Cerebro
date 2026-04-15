import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,}$/

function SignUpPage() {
  const navigate = useNavigate()
  const { signup, isAuthenticated } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('Escribe y confirma tu contraseña.')
  const [tone, setTone] = useState('info')

  useEffect(() => {
    if (!isAuthenticated) return
    navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validateForm() {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      return 'Completa todos los campos del registro.'
    }

    if (!passwordPolicy.test(form.password)) {
      return 'La contraseña debe tener mínimo 8 caracteres, mayúscula, número y símbolo.'
    }

    if (form.password !== form.confirmPassword) {
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
    setMessage('Creando cuenta...')

    try {
      const normalizedEmail = form.email.trim().toLowerCase()
      const result = await signup({
        name: form.name.trim(),
        email: normalizedEmail,
        password: form.password,
      })

      if (result.session) {
        navigate('/', { replace: true })
        return
      }

      navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`, {
        replace: true,
        state: {
          message:
            'Cuenta creada. Revisa tu correo, copia el código y valida tu cuenta para poder iniciar sesión.',
        },
      })
    } catch (error) {
      setTone('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible crear la cuenta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="auth-page">
        <div className="auth-page-header">
          <h1>Crear cuenta</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <Link className="auth-tab" to="/login">
                Iniciar sesión
              </Link>
              <button className="auth-tab active" type="button">
                Crear cuenta
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Nombre de usuario</span>
                <input
                  autoComplete="username"
                  name="name"
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  type="text"
                  value={form.name}
                />
              </label>

              <label className="auth-field">
                <span>Correo</span>
                <input
                  autoComplete="email"
                  name="email"
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  type="email"
                  value={form.email}
                />
              </label>

              <label className="auth-field">
                <span>Contrasena</span>
                <input
                  autoComplete="new-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres, una mayúscula y un símbolo"
                  type="password"
                  value={form.password}
                />
              </label>

              <label className="auth-field">
                <span>Confirmar contraseña</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  type="password"
                  value={form.confirmPassword}
                />
              </label>

              <p className={`auth-feedback auth-feedback--inline${tone !== 'info' ? ` ${tone}` : ''}`}>
                {message}
              </p>

              <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Creando...' : 'Crear cuenta'}
              </button>
            </form>

            <p className="auth-links">
              Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>

            <p className="auth-links">
              Ya tienes un código? <Link to="/verify-email">Verificar correo</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default SignUpPage
