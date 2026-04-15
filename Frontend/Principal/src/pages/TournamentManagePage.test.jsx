import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import TournamentManagePage from './TournamentManagePage.jsx'

const { mockNavigate, mockAuth, mockApiClient } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAuth: {
    accessToken: null,
    isAuthenticated: false,
    user: null,
  },
  mockApiClient: {
    getTournament: vi.fn(),
    getPublicTournament: vi.fn(),
    getTournamentParticipants: vi.fn(),
    getPublicTournamentParticipants: vi.fn(),
    getTournamentRanking: vi.fn(),
    getPublicTournamentRanking: vi.fn(),
    updateTournament: vi.fn(),
    updateTournamentState: vi.fn(),
    deleteTournament: vi.fn(),
    joinTournament: vi.fn(),
  },
}))

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../services/apiClient.js', () => ({
  apiClient: mockApiClient,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage(initialEntry = '/torneos/torneo-1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/torneos/:tournamentId" element={<TournamentManagePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentManagePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockAuth.accessToken = null
    mockAuth.isAuthenticated = false
    mockAuth.user = null
    Object.values(mockApiClient).forEach((fn) => fn.mockReset())
  })

  it('asks guests to sign in when they open a private invite link', async () => {
    renderPage('/torneos/torneo-1?codigo=ABC123')

    expect(
      screen.getByRole('heading', { name: /esta invitaci.n privada requiere sesi.n/i }),
    ).toBeInTheDocument()
    expect(mockApiClient.getPublicTournament).not.toHaveBeenCalled()
  })

  it('shows the current user name for participant and ranking rows when names are missing', async () => {
    mockAuth.accessToken = 'token-123'
    mockAuth.isAuthenticated = true
    mockAuth.user = {
      sub: 'user-1',
      name: 'Alice',
    }
    mockApiClient.getTournament.mockResolvedValue({
      _id: 'torneo-1',
      nombre: 'Serie abierta',
      descripcion: 'Descripcion',
      tipo: 'SERIE',
      estado: 'ACTIVO',
      esPublico: true,
      fechaInicio: '2026-03-29T14:00:00.000Z',
      fechaFin: '2026-03-30T14:00:00.000Z',
      creadorId: 'admin-1',
      configuracion: {
        duracionMaximaMin: 20,
        dificultad: 'Intermedio',
        numeroTableros: 3,
      },
    })
    mockApiClient.getTournamentParticipants.mockResolvedValue([
      {
        _id: 'participant-1',
        usuarioId: 'user-1',
        fechaUnion: '2026-03-29T14:05:00.000Z',
      },
    ])
    mockApiClient.getTournamentRanking.mockResolvedValue([
      {
        _id: 'result-1',
        usuarioId: 'user-1',
        puntaje: 120,
        tiempo: 180,
        fechaRegistro: '2026-03-29T14:20:00.000Z',
      },
    ])

    renderPage('/torneos/torneo-1')

    await waitFor(() => {
      expect(screen.getByText('Serie abierta')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.queryByText('user-1')).not.toBeInTheDocument()
  })

  it('uses the invite code from the query string when joining a private tournament', async () => {
    const user = userEvent.setup()
    mockAuth.accessToken = 'token-123'
    mockAuth.isAuthenticated = true
    mockAuth.user = {
      sub: 'user-2',
      name: 'Bob',
    }
    mockApiClient.getTournament.mockResolvedValue({
      _id: 'torneo-1',
      nombre: 'Serie privada',
      descripcion: 'Descripcion',
      tipo: 'SERIE',
      estado: 'PROGRAMADO',
      esPublico: false,
      codigoAcceso: 'ABC123',
      fechaInicio: '2026-03-29T14:00:00.000Z',
      fechaFin: '2026-03-30T14:00:00.000Z',
      creadorId: 'admin-1',
      configuracion: {
        duracionMaximaMin: 20,
        dificultad: 'Intermedio',
        numeroTableros: 3,
      },
    })
    mockApiClient.getTournamentParticipants.mockResolvedValue([])
    mockApiClient.getTournamentRanking.mockResolvedValue([])
    mockApiClient.joinTournament.mockResolvedValue({ ok: true })

    renderPage('/torneos/torneo-1?codigo=ABC123')

    await waitFor(() => {
      expect(screen.getByText('Serie privada')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Unirme al torneo' }))

    await waitFor(() => {
      expect(mockApiClient.joinTournament).toHaveBeenCalledWith(
        'torneo-1',
        { codigoAcceso: 'ABC123' },
        'token-123',
      )
    })
  })
})
