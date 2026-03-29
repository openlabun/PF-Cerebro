import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import TournamentForm from './TournamentForm.jsx'

describe('TournamentForm', () => {
  it('preserves hidden config extras such as esOficial when editing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TournamentForm
        mode="edit"
        submitLabel="Guardar cambios"
        onSubmit={onSubmit}
        initialTournament={{
          nombre: 'Serie oficial',
          descripcion: 'Torneo destacado',
          esPublico: true,
          tipo: 'SERIE',
          fechaInicio: '2026-03-28T14:00:00.000Z',
          fechaFin: '2026-03-29T14:00:00.000Z',
          recurrencia: 'NINGUNA',
          configuracion: {
            duracionMaximaMin: 20,
            dificultad: 'Intermedio',
            numeroTableros: 3,
            esOficial: true,
          },
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        configuracion: expect.objectContaining({
          duracionMaximaMin: 20,
          dificultad: 'Intermedio',
          numeroTableros: 3,
          esOficial: true,
        }),
      }),
    )
  })
})
