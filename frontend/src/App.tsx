import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HeroPage from './pages/HeroPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage from './pages/JobsPage'
import JobFormPage from './pages/JobFormPage'
import JobDetailPage from './pages/JobDetailPage'
import HomeConfigPage from './pages/HomeConfigPage'
import ChartsPage from './pages/ChartsPage'
import AIAssistantPage from './pages/AIAssistantPage'
import RolesPermissionsPage from './pages/RolesPermissionsPage'
import UsersPage from './pages/UsersPage'
import AuditPage from './pages/AuditPage'
import PlannerPage from './pages/PlannerPage'
import NotificationSettingsPage from './pages/NotificationSettingsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Páginas públicas */}
          <Route path="/" element={<HeroPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Área autenticada */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/novo" element={<JobFormPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/jobs/:id/editar" element={<JobFormPage />} />
            <Route path="/config-home" element={<HomeConfigPage />} />
            <Route path="/graficos" element={<ChartsPage />} />
            <Route path="/ia" element={<AIAssistantPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/papeis-permissoes" element={<RolesPermissionsPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
            <Route path="/notificacoes" element={<NotificationSettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
