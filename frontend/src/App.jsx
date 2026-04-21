import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Layout from './components/shared/Layout'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import LandingPage from './pages/LandingPage'
import CommandeQR from './pages/CommandeQR'

// Gérant
import GerantDashboard from './pages/GerantDashboard'
import GerantMenu from './pages/GerantMenu'
import GerantIngredients from './pages/GerantIngredients'
import GerantTables from './pages/GerantTables'
import GerantReservations from './pages/GerantReservations'
import GerantPersonnel from './pages/GerantPersonnel'
import GerantTombola from './pages/GerantTombola'
import GerantSettings from './pages/GerantSettings'

// Serveur
import ServeurTables from './pages/ServeurTables'
import ServeurCommande from './pages/ServeurCommande'

// Cuisinier
import CuisinierInterface from './pages/CuisinierInterface'
import CuisinierProposer from './pages/CuisinierProposer'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/commande" element={<CommandeQR />} />

          {/* Gérant */}
          <Route
            path="/gerant"
            element={
              <ProtectedRoute roles={['gerant']}>
                <Layout role="gerant" />
              </ProtectedRoute>
            }
          >
            <Route index element={<GerantDashboard />} />
            <Route path="menu" element={<GerantMenu />} />
            <Route path="stocks" element={<GerantIngredients />} />
            <Route path="tables" element={<GerantTables />} />
            <Route path="reservations" element={<GerantReservations />} />
            <Route path="personnel" element={<GerantPersonnel />} />
            <Route path="tombola" element={<GerantTombola />} />
            <Route path="settings" element={<GerantSettings />} />
          </Route>

          {/* Serveur */}
          <Route
            path="/serveur"
            element={
              <ProtectedRoute roles={['serveur', 'gerant']}>
                <Layout role="serveur" />
              </ProtectedRoute>
            }
          >
            <Route index element={<ServeurTables />} />
            <Route path="commande" element={<ServeurCommande />} />
          </Route>

          {/* Cuisinier */}
          <Route
            path="/cuisinier"
            element={
              <ProtectedRoute roles={['cuisinier']}>
                <Layout role="cuisinier" />
              </ProtectedRoute>
            }
          >
            <Route index element={<CuisinierInterface />} />
            <Route path="proposer" element={<CuisinierProposer />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
