import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function GerantDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">MangerManger</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.prenom} {user?.nom}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord</h2>
        <p className="text-gray-500 mb-8">Bienvenue, {user?.prenom} !</p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Rôle</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">{user?.role}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Identifiant</p>
            <p className="text-2xl font-bold text-gray-900">{user?.identifiant}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Statut</p>
            <p className="text-2xl font-bold text-green-600">Connecté</p>
          </div>
        </div>

        {/* Menu rapide */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Menu rapide</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Menu', desc: 'Gérer les plats' },
              { label: 'Tables', desc: 'Voir le plan' },
              { label: 'Réservations', desc: 'Gérer les résa' },
              { label: 'Personnel', desc: 'Gérer le staff' },
            ].map(item => (
              <div
                key={item.label}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <p className="font-semibold text-gray-800">{item.label}</p>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
