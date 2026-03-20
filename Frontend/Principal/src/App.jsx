import { Outlet } from 'react-router-dom'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'

function App() {
  return (
    <>
      <Header />
      <Outlet />

      <Footer />
    </>
  )
}

export default App
