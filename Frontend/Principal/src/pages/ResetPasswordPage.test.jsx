import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ResetPasswordPage from './ResetPasswordPage.jsx'

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: {
    resetPassword: vi.fn(),
  },
}))

vi.mock('../services/apiClient.js', () => ({
  apiClient: mockApiClient,
}))

function renderPage(initialEntry = '/reset-password') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockApiClient.resetPassword.mockReset()
  })

  it('shows an error when the passwords do not match', async () => {
    const user = userEvent.setup()
    renderPage('/reset-password?token=abc123')

    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave1!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'OtraClave1!')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(mockApiClient.resetPassword).not.toHaveBeenCalled()
  })

  it('uses the token from the query string and clears the password fields after success', async () => {
    const user = userEvent.setup()
    mockApiClient.resetPassword.mockResolvedValue({ ok: true })
    renderPage('/reset-password?token=reset-token')

    expect(screen.getByLabelText('Token de recuperación')).toHaveValue('reset-token')

    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave1!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NuevaClave1!')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    await waitFor(() => {
      expect(mockApiClient.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token',
        newPassword: 'NuevaClave1!',
      })
    })

    expect(
      screen.getByText('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveValue('')
  })
})
