import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useEffect, useState, useRef } from 'react'
import { getNotifs, marquerNotifLue, toutLireNotifs } from '../../services/api'

function NotifBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  async function load() {
    try { const r = await getNotifs(); setNotifs(r.data) } catch { /* silent */ }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  // Fermer en cliquant dehors
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function lireTout() {
    await toutLireNotifs()
    setNotifs([])
    setOpen(false)
  }

  const count = notifs.length

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${count > 0 ? 'text-amber-400 hover:bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Notifications
        {count > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full bottom-0 ml-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col" style={{ maxHeight: '80vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
              )}
            </div>
            {count > 0 && (
              <button onClick={lireTout} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Tout effacer</button>
            )}
          </div>

          {/* Liste */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <span className="text-3xl mb-2">🔔</span>
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : notifs.map(n => {
              const isAnnulation = n.type === 'annulation'
              return (
                <div key={n.id}
                  style={{ borderLeft: `4px solid ${isAnnulation ? '#EF4444' : '#3B82F6'}` }}
                  className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <span className="text-xl shrink-0 mt-0.5">{isAnnulation ? '❌' : 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${isAnnulation ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isAnnulation ? 'Annulation' : 'Info'}
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.date_heure).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      {' à '}
                      {new Date(n.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => marquerNotifLue(n.id).then(load)}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-100 hover:text-red-500 transition-colors text-xs mt-0.5">
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const GERANT_NAV = [
  {
    to: '/gerant', end: true, label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/gerant/menu', label: 'Menu & Plats',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/gerant/stocks', label: 'Stocks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    to: '/gerant/tables', label: 'Tables',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    to: '/gerant/reservations', label: 'Réservations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/gerant/personnel', label: 'Personnel',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/gerant/revenues', label: 'Revenus',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/gerant/spins', label: 'Roue — Spins',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    to: '/gerant/settings', label: 'Paramètres',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const SERVEUR_NAV = [
  {
    to: '/serveur', end: true, label: 'Tables',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    to: '/serveur/commande', label: 'Commande',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
]

const CUISINIER_NAV = [
  {
    to: '/cuisinier', end: true, label: 'Commandes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/cuisinier/proposer', label: 'Proposer un plat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
]

export default function Layout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = role === 'gerant' ? GERANT_NAV : role === 'serveur' ? SERVEUR_NAV : CUISINIER_NAV

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg tracking-tight">MangerManger</h1>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">{role}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Notifications (gérant seulement) */}
        {role === 'gerant' && <NotifBell />}

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-gray-300 text-sm font-medium truncate">
            {user?.prenom} {user?.nom}
          </p>
          <p className="text-gray-500 text-xs truncate mb-3">{user?.identifiant}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
