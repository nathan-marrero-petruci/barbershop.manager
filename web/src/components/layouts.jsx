import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function MainLayout() {
  const navCls = ({ isActive }) => `nav-tab${isActive ? ' active' : ''}`

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
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </>
  )
}

export function AdminLayout() {
  const { isAdminAuthenticated, handleLogout } = useAuth()

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
        {isAdminAuthenticated && (
          <nav className="app-nav">
            <button className="btn-danger" onClick={handleLogout}>Sair</button>
          </nav>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </>
  )
}

export function BlankLayout() {
  return (
    <main className="app-content">
      <Outlet />
    </main>
  )
}
