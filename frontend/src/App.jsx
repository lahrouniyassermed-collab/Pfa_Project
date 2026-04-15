import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Layout from './components/shared/Layout'
import LoginPage from './pages/LoginPage'
import GerantDashboard from './pages/GerantDashboard'
import GerantMenu from './pages/GerantMenu'
import GerantIngredients from './pages/GerantIngredients'
import GerantTables from './pages/GerantTables'
import GerantReservations from './pages/GerantReservations'
import GerantPersonnel from './pages/GerantPersonnel'
import GerantTombola from './pages/GerantTombola'
import CuisinierInterface from './pages/CuisinierInterface'
import CuisinierProposer from './pages/CuisinierProposer'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
