import './App.css'
import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import BookingForm from './components/BookingForm.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import MyAppointment from './components/MyAppointment.jsx'
import { API } from './api/client.js'

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetch(`${API}/admin/me`, { credentials: 'include' })
      .then(r => { if (r.ok) setIsAdminAuthenticated(true) })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  const handleLoginSuccess = () => { setIsAdminAuthenticated(true); navigate('/admin/barbers') }
  const handleLogout = async () => {
    await fetch(`${API}/admin/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    setIsAdminAuthenticated(false)
    navigate('/')
  }

  const navCls = ({ isActive }) => `nav-tab${isActive ? ' active' : ''}`

  const isMyAppointmentPage = location.pathname.startsWith('/meu-agendamento')
  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            <img src="/logo.png" alt="Espaço Vip" />
          </div>
          <div className="app-brand-text">
            <span className="app-brand-name">ESPAÇO VIP</span>
            <span className="app-brand-sub">Barbearia</span>
          </div>
        </div>
        {!isMyAppointmentPage && (
          <nav className="app-nav">
            <NavLink to="/" className={navCls} end>Agendar</NavLink>
            {isAdminAuthenticated && (
              <>
                <NavLink to="/admin" className={navCls}>Admin</NavLink>
                <button className="btn-danger" onClick={handleLogout}>Sair</button>
              </>
            )}
          </nav>
        )}
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<div className="client-layout"><BookingForm /></div>} />
          <Route path="/meu-agendamento" element={<MyAppointment />} />
          <Route path="/admin" element={<Navigate to="/admin/barbers" replace />} />
          <Route
            path="/admin/:tab"
            element={
              !authChecked
                ? <div className="loading-msg" style={{ padding: 60, textAlign: 'center' }}>Verificando autenticação...</div>
                : isAdminAuthenticated
                  ? <AdminPanel />
                  : <AdminLogin onSuccess={handleLoginSuccess} />
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default App