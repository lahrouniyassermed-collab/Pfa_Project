import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/gerant/dashboard', label: 'Tableau de bord', icon: '📊' },
  { to: '/gerant/menu', label: 'Menu', icon: '🍽️' },
  { to: '/gerant/tables', label: 'Tables', icon: '🪑' },
  { to: '/gerant/reservations', label: 'Réservations', icon: '📅' },
  { to: '/gerant/personnel', label: 'Personnel', icon: '👥' },
  { to: '/gerant/settings', label: 'Paramètres', icon: '⚙️' },
]

export default function GerantLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-lg font-bold text-gray-900">MangerManger</p>
          <p className="text-xs text-gray-400 mt-0.5">Espace gérant</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-800">{user?.prenom} {user?.nom}</p>
          <button
            onClick={handleLogout}
            className="mt-1 text-xs text-red-500 hover:text-red-700"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
