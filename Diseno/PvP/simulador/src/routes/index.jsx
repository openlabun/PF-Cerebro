import { createBrowserRouter } from 'react-router-dom'
import App from '../App.jsx'
import RequireAuth from '../components/RequireAuth.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import SignUpPage from '../pages/SignUpPage.jsx'
import SimulationPage from '../pages/SimulationPage.jsx'
import PvpMatchPage from '../pages/PvpMatchPage.jsx'
import SudokuPage from '../pages/SudokuPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          index: true,
          element: <HomePage />,
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
          path: 'profile',
          element: <ProfilePage />,
        },
        {
          element: <RequireAuth />,
          children: [
            {
              path: 'simulacion',
              element: <SimulationPage />,
            },
            {
              path: 'sudoku',
              element: <SudokuPage />,
            },
            {
              path: 'pvp/:matchId',
              element: <PvpMatchPage />,
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
