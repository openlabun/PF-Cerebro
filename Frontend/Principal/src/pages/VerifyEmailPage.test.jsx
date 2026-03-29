import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import VerifyEmailPage from './VerifyEmailPage.jsx'

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: {
    verifyEmail: vi.fn(),
  },
}))

vi.mock('../services/apiClient.js', () => ({
  apiClient: mockApiClient,
}))

function renderPage(initialEntry = '/verify-email') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  )
}

function getSubmitButton() {
  const form = document.querySelector('form.auth-form')
  expect(form).not.toBeNull()
  return within(form).getByRole('button', { name: 'Verificar correo' })
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    mockApiClient.verifyEmail.mockReset()
  })

  it('prefills email and code from the query string and verifies them', async () => {
    const user = userEvent.setup()
    mockApiClient.verifyEmail.mockResolvedValue({ ok: true })
    renderPage('/verify-email?email=USER%40Example.com&code=ABC123')

    expect(screen.getByLabelText('Correo')).toHaveValue('USER@Example.com')
    expect(screen.getByLabelText('Codigo')).toHaveValue('ABC123')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockApiClient.verifyEmail).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: 'ABC123',
      })
    })

    expect(
      screen.getByText('Correo verificado. Ya puedes iniciar sesion con tu cuenta.'),
    ).toBeInTheDocument()
  })

  it('shows validation when email or code is missing', async () => {
    const user = userEvent.setup()
    renderPage('/verify-email')

    await user.click(getSubmitButton())

    expect(
      screen.getByText('Completa el correo y el codigo de verificacion.'),
    ).toBeInTheDocument()
    expect(mockApiClient.verifyEmail).not.toHaveBeenCalled()
  })
})
