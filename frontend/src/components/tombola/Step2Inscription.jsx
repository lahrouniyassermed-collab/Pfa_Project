import { useState } from 'react'

const A = '#e8824a'
const TEXT = '#f5f0e8'

const FIELDS = [
  { key: 'prenom', label: 'Prénom',  placeholder: 'Votre prénom',        type: 'text'  },
  { key: 'nom',    label: 'Nom',     placeholder: 'Votre nom de famille', type: 'text'  },
  { key: 'email',  label: 'Email',   placeholder: 'votre@email.com',      type: 'email' },
]

export default function Step2Inscription({ onNext }) {
  const [form,   setForm]   = useState({ prenom: '', nom: '', email: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.prenom.trim()) errs.prenom = 'Champ requis'
    if (!form.nom.trim())    errs.nom    = 'Champ requis'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Adresse email invalide'
    return errs
  }

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onNext({ user: form })
  }

  return (
    <div style={{ animation: 'fadeSlideIn 0.45s ease both' }}>
      <div className="text-center mb-8 sm:mb-10">
        <h2
          className="font-light mb-3"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 5vw, 2.1rem)',
            color: TEXT,
          }}
        >
          Vos informations
        </h2>
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'Inter', sans-serif" }}
        >
          Renseignez vos coordonnées pour valider votre participation
        </p>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {FIELDS.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label
              className="block mb-1.5 sm:mb-2 text-[10px] sm:text-xs tracking-[0.14em] uppercase"
              style={{ color: 'rgba(245,240,232,0.35)', fontFamily: "'Inter', sans-serif" }}
            >
              {label}
            </label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => {
                setForm((p) => ({ ...p, [key]: e.target.value }))
                setErrors((p) => ({ ...p, [key]: '' }))
              }}
              placeholder={placeholder}
              className="w-full py-3 sm:py-3.5 px-4 outline-none transition-all duration-300"
              style={{
                background: 'rgba(245,240,232,0.04)',
                border: errors[key] ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(245,240,232,0.1)',
                color: TEXT,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                borderRadius: '2px',
              }}
              onFocus={(e) => { if (!errors[key]) e.currentTarget.style.borderColor = 'rgba(232,130,74,0.4)' }}
              onBlur={(e)  => { if (!errors[key]) e.currentTarget.style.borderColor = 'rgba(245,240,232,0.1)' }}
            />
            {errors[key] && (
              <p className="mt-1.5 text-xs" style={{ color: 'rgba(239,68,68,0.75)', fontFamily: "'Inter', sans-serif" }}>
                {errors[key]}
              </p>
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 sm:py-4 font-semibold tracking-[0.2em] text-xs uppercase transition-all duration-300 mt-2"
          style={{
            background: `linear-gradient(135deg, ${A}, #f09a6a, #c9673a)`,
            color: '#0a1408',
            borderRadius: '2px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 28px rgba(232,130,74,0.4)` }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
