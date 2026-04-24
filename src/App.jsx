import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import NavBar from './components/NavBar'
import MicDebug from './components/Micdebug'
import HsdPage from './pages/HsdPage'
import GiaPage from './pages/GiaPage'
import MasPage from './pages/MasPage'
import ExpiryPage from './pages/ExpiryPage'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const toggleDark = () => setDarkMode(d => !d)

  return (
    <div className="app-shell">
      <div className="safe-top" />
      <Header darkMode={darkMode} onToggleDark={toggleDark} />
      <NavBar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/hsd" replace />} />
          <Route path="/hsd" element={<HsdPage />} />
          <Route path="/gia" element={<GiaPage />} />
          <Route path="/mas" element={<MasPage />} />
          <Route path="/expiry" element={<ExpiryPage />} />
          <Route path="/debug" element={<MicDebug />} />
        </Routes>
      </div>
    </div>
  )
}
