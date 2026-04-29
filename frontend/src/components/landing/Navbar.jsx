import { useState, useEffect } from 'react'

const A = '#e8824a'
const links = [
  { label: 'Accueil',    id: 'accueil' },
  { label: 'Menu',       id: 'menu' },
  { label: 'Réserver',   id: 'reservation' },
  { label: 'Avis',       id: 'avis' },
  { label: 'Emploi',     id: 'emplois' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setOpen(false) }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(10,20,8,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid rgba(232,130,74,0.12)` : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => scrollTo('accueil')} className="group flex items-center">
          <span
            className="text-2xl font-light tracking-wider text-white group-hover:text-white transition-colors duration-300"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.1em' }}
          >
            SKY<span style={{ color: A }}>07</span>
          </span>
        </button>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => scrollTo(l.id)}
                className="relative group text-xs tracking-[0.2em] uppercase transition-colors duration-200"
                style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.color = A}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.5)'}
              >
                {l.label}
                <span
                  className="absolute -bottom-1 left-0 w-0 h-px group-hover:w-full transition-all duration-300"
                  style={{ background: A }}
                />
              </button>
            </li>
          ))}
        </ul>

        {/* Mobile burger */}
        <button
          className="md:hidden w-8 h-8 flex flex-col justify-center gap-1.5"
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-px bg-white transition-all duration-300"
              style={{
                transform: i === 0 && open ? 'rotate(45deg) translateY(5px)' :
                           i === 2 && open ? 'rotate(-45deg) translateY(-5px)' : 'none',
                opacity: i === 1 && open ? 0 : 1,
              }}
            />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: open ? '280px' : '0',
          background: 'rgba(10,20,8,0.97)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <ul className="px-6 py-4 flex flex-col gap-4" style={{ borderTop: '1px solid rgba(232,130,74,0.1)' }}>
          {links.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => scrollTo(l.id)}
                className="text-xs tracking-[0.2em] uppercase transition-colors duration-200 w-full text-left py-1"
                style={{ color: 'rgba(245,240,232,0.6)', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.color = A}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.6)'}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
