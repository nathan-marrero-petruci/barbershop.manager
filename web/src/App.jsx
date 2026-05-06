import './App.css'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import BookingForm from './components/BookingForm.jsx'
import MyAppointment from './components/MyAppointment.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function AppRoutes() {
  const { isAdminAuthenticated, authChecked, handleLogout } = useAuth()
  const navCls = ({ isActive }) => `nav-tab${isActive ? ' active' : ''}`

  if (!authChecked) {
    return (
      <div className="loading-msg" style={{ padding: 60, textAlign: 'center' }}>
        Verificando autenticação...
      </div>
    )
  }

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
        <nav className="app-nav">
          <NavLink to="/" className={navCls} end>Agendar</NavLink>
          {isAdminAuthenticated && (
            <>
              <NavLink to="/admin" className={navCls}>Admin</NavLink>
              <button className="btn-danger" onClick={handleLogout}>Sair</button>
            </>
          )}
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<div className="client-layout"><BookingForm /></div>} />
          <Route path="/meu-agendamento" element={<MyAppointment />} />
          <Route path="/admin" element={<Navigate to="/admin/barbers" replace />} />
          <Route path="/admin/:tab" element={<ProtectedRoute />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App