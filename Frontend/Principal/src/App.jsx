import { Outlet, useLocation } from 'react-router-dom'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import { useLiveHeartbeat } from './hooks/useLiveHeartbeat.js'

function isDedicatedActivityRoute(pathname) {
  if (pathname === '/' || pathname === '/sudoku' || pathname === '/simulacion') {
    return true
  }

  if (/^\/pvp\/[^/]+/i.test(pathname)) {
    return true
  }

  return /^\/torneos\/[^/]+\/jugar/i.test(pathname)
}

function AppPresenceReporter() {
  const location = useLocation()
  const pathname = location.pathname || '/'
  const search = location.search || ''
  const enabled = !isDedicatedActivityRoute(pathname)
  const state = pathname === '/profile' ? 'profile' : pathname.startsWith('/torneos') ? 'exploring_tournaments' : 'exploring'

  useLiveHeartbeat(
    {
      mode: 'browsing',
      state,
      path: `${pathname}${search}`,
    },
    { enabled },
  )

  return null
}

function App() {
  return (
    <>
      <AppPresenceReporter />
      <Header />
      <Outlet />

      <Footer />
    </>
  )
}

export default App
