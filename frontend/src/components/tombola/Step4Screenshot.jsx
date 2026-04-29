import { useState, useRef } from 'react'

const A = '#e8824a'
const TEXT = '#f5f0e8'

export default function Step4Screenshot({ onNext }) {
  const [preview,    setPreview]    = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

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
          Partagez votre avis
        </h2>
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'Inter', sans-serif" }}
        >
          Uploadez une capture d'écran de votre avis Google publié
        </p>
      </div>

      {/* Zone de dépôt */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className="relative cursor-pointer transition-all duration-300 mb-4 sm:mb-5 overflow-hidden"
        style={{
          border: `1.5px dashed ${isDragging ? A : 'rgba(245,240,232,0.14)'}`,
          background: isDragging ? 'rgba(232,130,74,0.07)' : preview ? 'transparent' : 'rgba(245,240,232,0.025)',
          borderRadius: '3px',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Aperçu de votre avis"
              className="w-full object-contain"
              style={{ maxHeight: '260px', display: 'block' }}
            />
            {/* Overlay hover pour changer */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'rgba(10,20,8,0.8)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke={A} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="text-xs tracking-wider uppercase" style={{ color: A, fontFamily: "'Inter', sans-serif" }}>
                Changer l'image
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-10 sm:py-14 px-5 select-none">
            {/* Icône image */}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 sm:mb-4" style={{ opacity: 0.2 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" stroke={TEXT} strokeWidth="1.4" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke={TEXT} strokeWidth="1.4" />
              <path d="M21 15l-5-5L5 21" stroke={TEXT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm mb-1" style={{ color: 'rgba(245,240,232,0.42)', fontFamily: "'Inter', sans-serif" }}>
              Glissez votre screenshot ici
            </p>
            <p className="text-xs" style={{ color: 'rgba(245,240,232,0.2)', fontFamily: "'Inter', sans-serif" }}>
              ou appuyez pour sélectionner · PNG, JPG, WEBP
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* Bouton soumettre */}
      <button
        onClick={() => { if (preview) onNext({ screenshot: true }) }}
        disabled={!preview}
        className="w-full py-3.5 sm:py-4 font-semibold tracking-[0.2em] text-xs uppercase transition-all duration-300"
        style={{
          background: preview ? `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)` : 'rgba(245,240,232,0.07)',
          color: preview ? '#0a1408' : 'rgba(245,240,232,0.22)',
          cursor: preview ? 'pointer' : 'not-allowed',
          borderRadius: '2px',
        }}
        onMouseEnter={(e) => { if (preview) e.currentTarget.style.boxShadow = `0 0 28px rgba(232,130,74,0.4)` }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
      >
        Soumettre ma participation
      </button>

      {!preview && (
        <p className="text-center mt-3 text-xs" style={{ color: 'rgba(245,240,232,0.18)', fontFamily: "'Inter', sans-serif" }}>
          Veuillez uploader votre screenshot pour continuer
        </p>
      )}
    </div>
  )
}
