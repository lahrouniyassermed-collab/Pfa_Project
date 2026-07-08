import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Disc, Gift, Smartphone, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/client/dashboard',    icon: Home,       label: 'Accueil' },
  { to: '/client/roue',         icon: Disc,       label: 'Roue' },
  { to: '/client/parrainage',   icon: Gift,       label: 'Parrainage' },
  { to: '/client/verification', icon: Smartphone, label: 'Téléphone' },
  { to: '/client/reservation',  icon: Calendar,   label: 'Réserver' },
]

export default function ClientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/client/login') }

  return (
    <div className="flex min-h-screen" style={{ background: '#0a1408' }}>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-60 z-40"
             style={{ background: '#0d180b', borderRight: '1px solid rgba(245,240,232,0.05)' }}>
        <div className="px-5 py-7" style={{ borderBottom: '1px solid rgba(245,240,232,0.05)' }}>
          <div className="font-display text-3xl font-bold tracking-wider" style={{ color: '#e8824a', fontFamily: "'Playfair Display', serif" }}>SKY07</div>
          <div className="text-xs tracking-[0.3em] uppercase mt-1" style={{ color: '#a89880' }}>Restaurant & Lounge</div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-2 ${
                  isActive ? 'border-[#e8824a] text-[#e8824a]' : 'border-transparent text-[#a89880] hover:text-[#f5f0e8]'
                }`
              }
              style={({ isActive }) => isActive ? { background: 'rgba(232,130,74,0.1)' } : {}}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(245,240,232,0.05)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
               style={{ background: 'rgba(232,130,74,0.15)', color: '#e8824a', border: '1.5px solid rgba(232,130,74,0.3)' }}>
            {user?.prenom?.[0] ?? 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#f5f0e8' }}>{user?.prenom} {user?.nom}</div>
            <div className="text-xs" style={{ color: '#a89880' }}>Client fidèle</div>
          </div>
          <button onClick={handleLogout} className="p-1 transition-colors" style={{ color: '#a89880' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f5f0e8'}
            onMouseLeave={e => e.currentTarget.style.color = '#a89880'}>
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2"
           style={{ background: 'rgba(10,20,8,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(232,130,74,0.1)' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${isActive ? 'text-[#e8824a]' : 'text-[#a89880]'}`}>
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={1.75} color={isActive ? '#e8824a' : '#a89880'} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{label.split(' ')[0]}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
