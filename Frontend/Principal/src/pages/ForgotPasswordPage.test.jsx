import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage.jsx'

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: {
    forgotPassword: vi.fn(),
  },
}))

vi.mock('../services/apiClient.js', () => ({
  apiClient: mockApiClient,
}))

function renderPage(initialEntry = '/forgot-password') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockApiClient.forgotPassword.mockReset()
  })

  it('shows validation when the email is missing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))

    expect(screen.getByText('Ingresa el correo asociado a tu cuenta.')).toBeInTheDocument()
    expect(mockApiClient.forgotPassword).not.toHaveBeenCalled()
  })

  it('normalizes the email and starts the recovery flow', async () => {
    const user = userEvent.setup()
    mockApiClient.forgotPassword.mockResolvedValue({ ok: true })
    renderPage('/forgot-password?email=USER%40Example.com')

    expect(screen.getByLabelText('Correo')).toHaveValue('USER@Example.com')

    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))

    await waitFor(() => {
      expect(mockApiClient.forgotPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
      })
    })

    expect(
      screen.getByText(
        'Si el correo existe, revisa tu bandeja y sigue las instrucciones para recuperar tu contrasena.',
      ),
    ).toBeInTheDocument()
  })
})
