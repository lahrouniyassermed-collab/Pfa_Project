import { useState } from 'react'

const A = '#e8824a'
const TEXT = '#f5f0e8'
const MOCK_CODE = 'CMD-TEST-0001'

export default function Step1Verification({ onNext }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = () => {
    setError('')
    if (!code.trim()) {
      setError('Veuillez entrer votre code de caisse')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (code.trim().toUpperCase() === MOCK_CODE) {
        onNext({ code: code.trim() })
      } else {
        setError('Code invalide ou déjà utilisé')
      }
    }, 900)
  }

  return (
    <div style={{ animation: 'fadeSlideIn 0.45s ease both' }}>
      {/* Titre */}
      <div className="text-center mb-8 sm:mb-10">
        <h2
          className="font-light mb-3"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 5vw, 2.1rem)',
            color: TEXT,
          }}
        >
          Participez à notre tombola
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgba(245,240,232,0.45)', fontFamily: "'Inter', sans-serif" }}
        >
          Entrez le code imprimé sur votre ticket de caisse
        </p>
      </div>

      <div className="space-y-3">
        {/* Champ code */}
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder="CMD-..."
          autoCapitalize="characters"
          className="w-full text-center outline-none transition-all duration-300"
          style={{
            background: 'rgba(245,240,232,0.04)',
            border: error ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(245,240,232,0.1)',
            color: TEXT,
            fontFamily: "'Inter', monospace",
            fontSize: 'clamp(1rem, 4vw, 1.25rem)',
            letterSpacing: '0.18em',
            borderRadius: '2px',
            padding: 'clamp(14px, 3vw, 20px) 16px',
          }}
        />

        {/* Erreur */}
        {error && (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: 'rgba(239,68,68,0.8)', animation: 'fadeSlideIn 0.3s ease' }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0">
              <circle cx="7.5" cy="7.5" r="6.5" stroke="rgba(239,68,68,0.8)" strokeWidth="1.4" />
              <path d="M7.5 4.5v3.5M7.5 10.5v.4" stroke="rgba(239,68,68,0.8)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "'Inter', sans-serif" }}>{error}</span>
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-3.5 sm:py-4 font-semibold tracking-[0.2em] text-xs uppercase transition-all duration-300"
          style={{
            background: loading ? 'rgba(232,130,74,0.45)' : `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)`,
            color: '#0a1408',
            borderRadius: '2px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = `0 0 28px rgba(232,130,74,0.4)` }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(10,20,8,0.3)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#0a1408" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Vérification…
            </span>
          ) : (
            'Vérifier mon code'
          )}
        </button>
      </div>

      <p
        className="text-center mt-5 text-[11px]"
        style={{ color: 'rgba(245,240,232,0.17)', fontFamily: "'Inter', sans-serif" }}
      >
        Format : CMD-AAAAMMJJ-XXXX
      </p>
    </div>
  )
}
