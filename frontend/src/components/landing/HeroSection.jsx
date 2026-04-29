import { useEffect, useRef } from 'react'

const HERO_IMG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=85'
const A = '#e8824a'

export default function HeroSection() {
  const bgRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return
      bgRef.current.style.transform = `scale(1.12) translateY(${window.scrollY * 0.28}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="accueil" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax bg */}
      <div
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        style={{ backgroundImage: `url("${HERO_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.12)' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'rgba(5,12,4,0.65)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(5,12,4,0.6) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(to top, #0a1408, transparent)' }} />

      {/* Top gold line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${A}, transparent)`, opacity: 0.5 }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p className="tracking-[0.55em] text-xs uppercase mb-10"
          style={{ animation: 'fadeInDown 0.8s ease 0.3s both', fontFamily: "'Inter',sans-serif", color: A }}>
          Restaurant Gastronomique · Casablanca
        </p>

        <h1
          className="text-white mb-4 tracking-[0.06em] leading-none"
          style={{
            animation: 'fadeInUp 1s ease 0.55s both',
            fontFamily: "'Playfair Display',Georgia,serif",
            fontSize: 'clamp(5rem,18vw,13rem)',
            fontWeight: 400,
            textShadow: '0 2px 60px rgba(0,0,0,0.7)',
          }}
        >
          SKY<span style={{ color: A }}>07</span>
        </h1>

        {/* Decorative rule */}
        <div className="flex items-center justify-center gap-4 my-8" style={{ animation: 'fadeIn 0.8s ease 1s both' }}>
          <div className="h-px flex-1 max-w-24" style={{ background: `linear-gradient(to right, transparent, rgba(232,130,74,0.55))` }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ background: A, opacity: 0.65 }} />
          <div className="h-px flex-1 max-w-24" style={{ background: `linear-gradient(to left, transparent, rgba(232,130,74,0.55))` }} />
        </div>

        <p className="text-xl md:text-2xl font-light mb-14 tracking-widest"
          style={{
            animation: 'fadeIn 0.9s ease 1.15s both',
            fontFamily: "'Playfair Display',Georgia,serif",
            fontStyle: 'italic',
            color: 'rgba(245,240,232,0.65)',
          }}>
          Une expérience culinaire au-dessus de tout
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ animation: 'fadeInUp 0.9s ease 1.35s both' }}>
          <button
            onClick={() => scrollTo('reservation')}
            className="group relative px-12 py-4 overflow-hidden font-semibold tracking-[0.22em] text-xs uppercase transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)`, color: '#0a1408' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 40px rgba(232,130,74,0.45)` }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            Réserver une table
          </button>
          <button
            onClick={() => scrollTo('menu')}
            className="px-12 py-4 font-light tracking-[0.22em] text-xs uppercase transition-all duration-300"
            style={{ border: '1px solid rgba(245,240,232,0.28)', color: 'rgba(245,240,232,0.8)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = A; e.currentTarget.style.color = A }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,240,232,0.28)'; e.currentTarget.style.color = 'rgba(245,240,232,0.8)' }}
          >
            Découvrir le menu
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ animation: 'fadeIn 1s ease 2s both' }}>
        <span className="text-[9px] tracking-[0.5em] uppercase" style={{ color: 'rgba(245,240,232,0.22)', fontFamily: "'Inter',sans-serif" }}>
          Défiler
        </span>
        <div className="w-px h-14 overflow-hidden">
          <div className="w-full h-full" style={{ background: `linear-gradient(to bottom, ${A}, transparent)`, animation: 'scrollLine 2s ease-in-out infinite' }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInUp   { from{opacity:0;transform:translateY(28px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes scrollLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
      `}</style>
    </section>
  )
}
