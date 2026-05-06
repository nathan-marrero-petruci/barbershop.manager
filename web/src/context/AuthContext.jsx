import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API}/admin/me`, { credentials: 'include' })
      .then(r => { if (r.ok) setIsAdminAuthenticated(true) })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true)
    navigate('/admin/barbers')
  }

  const handleLogout = async () => {
    await fetch(`${API}/admin/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    setIsAdminAuthenticated(false)
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ isAdminAuthenticated, authChecked, handleLoginSuccess, handleLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
