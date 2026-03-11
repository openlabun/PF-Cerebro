import { createBrowserRouter } from 'react-router-dom'
import App from '../App.jsx'
import RequireAuth from '../components/RequireAuth.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import SignUpPage from '../pages/SignUpPage.jsx'
import SimulationPage from '../pages/SimulationPage.jsx'

const router = createBrowserRouter([
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
        element: <RequireAuth />,
        children: [
          {
            path: 'simulacion',
            element: <SimulationPage />,
          },
        ],
      },
    ],
  },
])

export default router
