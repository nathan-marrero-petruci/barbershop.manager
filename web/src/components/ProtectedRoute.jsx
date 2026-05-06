import { useAuth } from '../context/AuthContext.jsx'
import AdminPanel from './AdminPanel.jsx'
import AdminLogin from './AdminLogin.jsx'

export default function ProtectedRoute() {
  const { isAdminAuthenticated, handleLoginSuccess } = useAuth()

  return isAdminAuthenticated
    ? <AdminPanel />
    : <AdminLogin onSuccess={handleLoginSuccess} />
}
