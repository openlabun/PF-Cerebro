import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import LoginPage from './LoginPage.jsx'

const { mockNavigate, mockLocation, mockAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLocation: {
    pathname: '/login',
    search: '',
    hash: '',
    state: undefined,
  },
  mockAuth: {
    login: vi.fn(),
    isAuthenticated: false,
  },
}))

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLocation.state = undefined
    mockAuth.isAuthenticated = false
    mockAuth.login.mockReset()
  })

  it('shows validation when email or password is missing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Completa correo y contraseña.')).toBeInTheDocument()
    expect(mockAuth.login).not.toHaveBeenCalled()
  })

  it('normalizes the email and delegates login before navigating', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockResolvedValue({})
    renderPage()

    await user.type(screen.getByLabelText('Correo'), 'USER@Example.COM')
    await user.type(screen.getByLabelText('Contraseña'), 'Secret1!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(mockAuth.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Secret1!',
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
