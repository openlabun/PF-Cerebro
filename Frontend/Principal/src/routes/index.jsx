import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from '../App.jsx'
import RequireAuth from '../components/RequireAuth.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx'
import SignUpPage from '../pages/SignUpPage.jsx'
import SimulationPage from '../pages/SimulationPage.jsx'
import PvpMatchPage from '../pages/PvpMatchPage.jsx'
import SudokuPage from '../pages/SudokuPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import TournamentsPage from '../pages/TournamentsPage.jsx'
import TournamentManagePage from '../pages/TournamentManagePage.jsx'
import TournamentSudokuPage from '../pages/TournamentSudokuPage.jsx'
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          index: true,
          element: <SudokuPage />,
        },
        {
          path: 'login',
          element: <LoginPage />,
        },
        {
          path: 'signup',
          element: <SignUpPage />,
        },
        {
          path: 'verify-email',
          element: <VerifyEmailPage />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPasswordPage />,
        },
        {
          path: 'reset-password',
          element: <ResetPasswordPage />,
        },
        {
          path: 'sudoku',
          element: <Navigate to="/" replace />,
        },
        {
          path: 'profile',
          element: <ProfilePage />,
        },
        {
          path: 'torneos',
          element: <TournamentsPage />,
        },
        {
          path: 'torneos/:tournamentId',
          element: <TournamentManagePage />,
        },
        {
          element: <RequireAuth />,
          children: [
            {
              path: 'simulacion',
              element: <SimulationPage />,
            },
            {
              path: 'pvp/:matchId',
              element: <PvpMatchPage />,
            },
            {
              path: 'torneos/:tournamentId/jugar',
              element: <TournamentSudokuPage />,
            },
          ],
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)

export default router
