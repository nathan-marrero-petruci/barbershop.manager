import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import BookingForm from './components/BookingForm.jsx'
import MyAppointment from './components/MyAppointment.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import NotFound from './components/NotFound.jsx'
import { MainLayout, AdminLayout, BlankLayout } from './components/layouts.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function AppRoutes() {
  const { authChecked } = useAuth()

  if (!authChecked) {
    return (
      <div className="loading-msg" style={{ padding: 60, textAlign: 'center' }}>
        Verificando autenticação...
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<div className="client-layout"><BookingForm /></div>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Navigate to="/admin/barbers" replace />} />
        <Route path="/admin/:tab" element={<ProtectedRoute />} />
      </Route>
      <Route element={<BlankLayout />}>
        <Route path="/meu-agendamento" element={<MyAppointment />} />
      </Route>
    </Routes>
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