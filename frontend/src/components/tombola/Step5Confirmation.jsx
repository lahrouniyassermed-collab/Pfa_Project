import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const A = '#e8824a'
const TEXT = '#f5f0e8'
const CIRC = 289 // 2π × r=46

export default function Step5Confirmation() {
  const navigate = useNavigate()
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="text-center" style={{ animation: 'fadeSlideIn 0.45s ease both' }}>
      {/* Cercle animé SVG — taille adaptative */}
      <div
        className="relative mx-auto mb-7 sm:mb-9"
        style={{ width: 'clamp(88px, 20vw, 112px)', height: 'clamp(88px, 20vw, 112px)' }}
      >
        {/* Glow backdrop */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 68%)',
            animation: drawn ? 'ringPulse 2.2s ease-in-out 1.6s infinite' : 'none',
          }}
        />
        {/* Anneau de progression */}
        <svg
          width="100%" height="100%" viewBox="0 0 104 104"
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(74,222,128,0.12)" strokeWidth="2.5" />
          <circle
            cx="52" cy="52" r="46" fill="none"
            stroke="#4ade80" strokeWidth="2.8" strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={drawn ? 0 : CIRC}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) 0.15s' }}
          />
        </svg>
        {/* Checkmark */}
        <svg
          width="100%" height="100%" viewBox="0 0 104 104"
          className="absolute inset-0"
          style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.25s ease 0.75s' }}
        >
          <polyline
            points="30,54 45,69 74,36"
            fill="none" stroke="#4ade80"
            strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="66"
            strokeDashoffset={drawn ? 0 : 66}
            style={{ transition: 'stroke-dashoffset 0.45s ease 1s' }}
          />
        </svg>
      </div>

      <h2
        className="font-light mb-3 sm:mb-4"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
          color: TEXT,
        }}
      >
        Participation enregistrée !
      </h2>

      <p
        className="text-sm leading-relaxed mb-8 sm:mb-10 max-w-xs mx-auto"
        style={{ color: 'rgba(245,240,232,0.45)', fontFamily: "'Inter', sans-serif" }}
      >
        Votre participation est en cours de vérification.
        <br />
        Vous recevrez un email de confirmation sous 24h.
      </p>

      {/* Divider déco */}
      <div className="flex items-center gap-4 mb-7 sm:mb-9 max-w-xs mx-auto">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(232,130,74,0.3))' }} />
        <div className="w-1 h-1 rotate-45" style={{ background: A, opacity: 0.55 }} />
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(232,130,74,0.3))' }} />
      </div>

      <button
        onClick={() => navigate('/')}
        className="px-10 sm:px-12 py-3.5 sm:py-4 font-semibold tracking-[0.2em] text-xs uppercase transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)`,
          color: '#0a1408',
          borderRadius: '2px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 30px rgba(232,130,74,0.45)` }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
      >
        Retour à l'accueil
      </button>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
