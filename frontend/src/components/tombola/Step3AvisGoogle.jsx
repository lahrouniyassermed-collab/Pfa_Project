const A = '#e8824a'
const TEXT = '#f5f0e8'

export default function Step3AvisGoogle({ onNext }) {
  return (
    <div style={{ animation: 'fadeSlideIn 0.45s ease both' }}>
      <div className="text-center mb-7 sm:mb-8">
        <h2
          className="font-light mb-3"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 5vw, 2.1rem)',
            color: TEXT,
          }}
        >
          Laissez votre avis sur Google
        </h2>
        <p
          className="text-sm leading-relaxed max-w-sm mx-auto"
          style={{ color: 'rgba(245,240,232,0.42)', fontFamily: "'Inter', sans-serif" }}
        >
          Partagez votre expérience chez SKY07. Votre retour nous aide à vous offrir
          toujours mieux — quelques mots font toute la différence.
        </p>
      </div>

      {/* Divider déco */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(232,130,74,0.28))' }} />
        <div className="w-1 h-1 rotate-45" style={{ background: A, opacity: 0.5 }} />
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(232,130,74,0.28))' }} />
      </div>

      {/* Étoiles déco */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mb-7 sm:mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} width="24" height="24" className="sm:w-7 sm:h-7" viewBox="0 0 24 24" fill={A}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      <div className="space-y-3">
        {/* Bouton Google Maps */}
        <a
          href="https://www.google.com/search?sca_esv=8a2ea42badc8ac50&sxsrf=ANbL-n7N8Wgi8xvBL43iKKEs1c8BhlFg4w:1777072257084&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOUX-Tfh82XshTULHyACz08V4QaZDGk5snvKrncWSv2KaaR4uuR4kCt4MAmvH1BoqIr4fpzF9Y9la4jxaxg2EsOB3THBh&q=Sky+07+Avis&sa=X&ved=2ahUKEwiDsP6EzoeUAxVYywIHHQGBIo8Q0bkNegQIMBAF&biw=1242&bih=545&dpr=1.1#lrd=0xda70d688b706c5f:0x410488f273de3c91,3,,,,"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-3.5 sm:py-4 font-medium text-sm tracking-wide transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(245,240,232,0.1)',
            color: TEXT,
            fontFamily: "'Inter', sans-serif",
            borderRadius: '2px',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(232,130,74,0.38)'
            e.currentTarget.style.background   = 'rgba(232,130,74,0.07)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245,240,232,0.1)'
            e.currentTarget.style.background   = 'rgba(255,255,255,0.04)'
          }}
        >
          {/* Logo Google G */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Ouvrir Google Maps
        </a>

        <button
          onClick={() => onNext()}
          className="w-full py-3.5 sm:py-4 font-semibold tracking-[0.2em] text-xs uppercase transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)`,
            color: '#0a1408',
            borderRadius: '2px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 28px rgba(232,130,74,0.4)` }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        >
          J'ai publié mon avis
        </button>
      </div>
    </div>
  )
}
