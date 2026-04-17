import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import LandingPage from './pages/LandingPage'
import GerantDashboard from './pages/GerantDashboard'
import GerantMenu from './pages/GerantMenu'
import GerantTables from './pages/GerantTables'
import GerantReservations from './pages/GerantReservations'
import GerantPersonnel from './pages/GerantPersonnel'
import GerantTombola from './pages/GerantTombola'
import GerantSettings from './pages/GerantSettings'
import ServeurTables from './pages/ServeurTables'
import ServeurCommande from './pages/ServeurCommande'
import CuisinierInterface from './pages/CuisinierInterface'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Setup & Auth */}
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Gérant */}
          <Route path="/gerant" element={<Navigate to="/gerant/dashboard" replace />} />
          <Route path="/gerant/dashboard" element={<GerantDashboard />} />
          <Route path="/gerant/menu" element={<GerantMenu />} />
          <Route path="/gerant/tables" element={<GerantTables />} />
          <Route path="/gerant/reservations" element={<GerantReservations />} />
          <Route path="/gerant/personnel" element={<GerantPersonnel />} />
          <Route path="/gerant/tombola" element={<GerantTombola />} />
          <Route path="/gerant/settings" element={<GerantSettings />} />

          {/* Serveur */}
          <Route path="/serveur" element={<ServeurTables />} />
          <Route path="/serveur/commande" element={<ServeurCommande />} />

          {/* Cuisinier */}
          <Route path="/cuisinier" element={<CuisinierInterface />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
