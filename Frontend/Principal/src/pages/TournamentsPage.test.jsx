import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import TournamentsPage from './TournamentsPage.jsx'

const { mockNavigate, mockAuth, mockApiClient } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAuth: {
    accessToken: null,
    isAuthenticated: false,
    user: null,
  },
  mockApiClient: {
    getPublicTournaments: vi.fn(),
    getTournaments: vi.fn(),
    createTournament: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <TournamentsPage />
    </MemoryRouter>,
  )
}

describe('TournamentsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockAuth.accessToken = null
    mockAuth.isAuthenticated = false
    mockAuth.user = null
    mockApiClient.getPublicTournaments.mockReset()
    mockApiClient.getTournaments.mockReset()
    mockApiClient.createTournament.mockReset()
  })

  it('shows the restricted guest state when public read is unavailable', async () => {
    mockApiClient.getPublicTournaments.mockRejectedValue(
      new Error('ROBLE_PUBLIC_READ_TOKEN no configurado'),
    )

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /debes iniciar sesi.n para ver los torneos en este entorno/i,
        }),
      ).toBeInTheDocument()
    })

    expect(
      screen.queryByText('Puedes navegar los torneos sin iniciar sesion'),
    ).not.toBeInTheDocument()
  })

  it('renders official tournaments in their own priority section', async () => {
    mockApiClient.getPublicTournaments.mockResolvedValue([
      {
        _id: 'torneo-oficial',
        nombre: 'Serie oficial semanal',
        descripcion: 'Competencia destacada',
        tipo: 'SERIE',
        estado: 'PROGRAMADO',
        esPublico: true,
        fechaInicio: '2026-03-30T14:00:00.000Z',
        fechaFin: '2026-03-31T14:00:00.000Z',
        creadorId: 'admin-1',
        creadorNombre: 'Admin',
        configuracion: {
          duracionMaximaMin: 20,
          dificultad: 'Intermedio',
          numeroTableros: 3,
          esOficial: true,
        },
      },
      {
        _id: 'torneo-normal',
        nombre: 'Serie abierta',
        descripcion: 'Competencia abierta',
        tipo: 'SERIE',
        estado: 'ACTIVO',
        esPublico: true,
        fechaInicio: '2026-03-29T14:00:00.000Z',
        fechaFin: '2026-03-30T14:00:00.000Z',
        creadorId: 'user-1',
        configuracion: {
          duracionMaximaMin: 15,
          dificultad: 'Iniciado',
          numeroTableros: 2,
        },
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Torneos oficiales')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Oficial').length).toBeGreaterThan(0)
    expect(screen.getByText('Serie oficial semanal')).toBeInTheDocument()
    expect(screen.getByText('Serie abierta')).toBeInTheDocument()
  })
})
