import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes/index.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { applyTheme, getStoredTheme } from './lib/theme.js'
import './styles.css'

applyTheme(getStoredTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)

const loadingScreen = document.getElementById('app-loading-screen')

if (loadingScreen) {
  window.setTimeout(() => {
    loadingScreen.classList.add('is-hidden')

    window.setTimeout(() => {
      loadingScreen.remove()
    }, 320)
  }, 1000)
}
