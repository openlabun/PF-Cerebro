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
  const [message, setMessage] = useState('Escribe y confirma tu contrasena.')
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
      return 'La contrasena debe tener minimo 8 caracteres, mayuscula, numero y simbolo.'
    }

    if (form.password !== form.confirmPassword) {
      return 'Las contrasenas no coinciden.'
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
      const result = await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })

      if (result.session) {
        navigate('/', { replace: true })
        return
      }

      setTone('success')
      setMessage('Cuenta creada. Si tu backend exige verificacion, revisa tu correo antes de iniciar sesion.')
      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
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
          <h1>Iniciar sesion</h1>
        </div>

        <div className="auth-shell">
          <article className="auth-card">
            <div className="auth-tabs">
              <Link className="auth-tab" to="/login">
                Iniciar sesion
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
                  placeholder="Minimo 8 caracteres, una mayuscula y un simbolo"
                  type="password"
                  value={form.password}
                />
              </label>

              <label className="auth-field">
                <span>Confirmar contrasena</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Repite tu contrasena"
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
              Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default SignUpPage
