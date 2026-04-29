import { useState, useEffect } from 'react'

const A = '#e8824a'
const ZONE = { interieur:'Intérieur', terrasse:'Terrasse', mezzanine:'Mezzanine' }

export default function ReservationModal({ table, date, heure, personnes, onClose }) {
  const [form, setForm] = useState({ nom:'', prenom:'', telephone:'' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 1000)
  }

  const inputBase = {
    width:'100%', background:'transparent', color:'#f5f0e8', padding:'12px 0',
    fontSize:'14px', outline:'none', fontFamily:"'Inter',sans-serif",
    borderBottom:`1px solid rgba(232,130,74,0.25)`, transition:'border-color 0.2s',
  }

  const formatDate = (s) => {
    if (!s) return s
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
    const [y,m,d] = s.split('-').map(Number)
    return `${d} ${months[m-1]} ${y}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)' }}
      onClick={e => e.target===e.currentTarget && !loading && onClose()}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background:'#111a0e', border:`1px solid rgba(232,130,74,0.18)`, animation:'modalIn 0.3s ease both' }}>

        {!loading && (
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-colors duration-200"
            style={{ color:'rgba(245,240,232,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color=A}
            onMouseLeave={e => e.currentTarget.style.color='rgba(245,240,232,0.35)'}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="p-8">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
                style={{ background:'rgba(232,130,74,0.08)', border:`1px solid rgba(232,130,74,0.3)`, animation:'scaleIn 0.4s ease both' }}>
                <svg className="w-8 h-8" fill="none" stroke={A} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white text-lg font-light mb-3"
                style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>Demande envoyée !</p>
              <p className="text-sm leading-relaxed mb-8"
                style={{ color:'rgba(245,240,232,0.45)', fontFamily:"'Inter',sans-serif" }}>
                Votre demande pour la <span style={{ color:A }}>Table {table.numero}</span> ({ZONE[table.emplacement]}),
                le {formatDate(date)} à {heure} pour {personnes} personne{personnes>1?'s':''} a été enregistrée.
                Le gérant vous contactera pour confirmer.
              </p>
              <button onClick={onClose}
                className="px-10 py-3 text-xs tracking-widest uppercase transition-all duration-200"
                style={{ border:'1px solid rgba(232,130,74,0.22)', color:'rgba(245,240,232,0.45)', fontFamily:"'Inter',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=A; e.currentTarget.style.color=A }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.22)'; e.currentTarget.style.color='rgba(245,240,232,0.45)' }}>
                Fermer
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="tracking-[0.38em] text-xs uppercase mb-2" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Réservation</p>
                <h3 className="text-white text-2xl font-thin"
                  style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>
                  Table {table.numero}
                </h3>
              </div>

              {/* Summary */}
              <div className="mb-7 p-4"
                style={{ background:'rgba(232,130,74,0.05)', border:`1px solid rgba(232,130,74,0.18)` }}>
                <div className="grid grid-cols-2 gap-3">
                  {[['Zone',ZONE[table.emplacement]],['Capacité',`${table.capacite} pers.`],['Date',formatDate(date)||'—'],['Heure',heure],['Convives',`${personnes} personne${personnes>1?'s':''}`]].map(([lbl,val]) => (
                    <div key={lbl}>
                      <p className="text-xs mb-0.5" style={{ color:'rgba(245,240,232,0.35)', fontFamily:"'Inter',sans-serif" }}>{lbl}</p>
                      <p className="text-sm" style={{ color:'rgba(245,240,232,0.82)', fontFamily:"'Inter',sans-serif" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  {[['prenom','Prénom'],['nom','Nom']].map(([field,label]) => (
                    <div key={field}>
                      <label className="block text-xs tracking-[0.22em] uppercase mb-2"
                        style={{ color:'rgba(232,130,74,0.55)', fontFamily:"'Inter',sans-serif" }}>{label}</label>
                      <input required type="text" value={form[field]}
                        onChange={e => setForm({...form,[field]:e.target.value})}
                        style={inputBase}
                        onFocus={e => e.target.style.borderColor=A}
                        onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.25)'}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs tracking-[0.22em] uppercase mb-2"
                    style={{ color:'rgba(232,130,74,0.55)', fontFamily:"'Inter',sans-serif" }}>Téléphone</label>
                  <input required type="tel" value={form.telephone}
                    onChange={e => setForm({...form,telephone:e.target.value})}
                    style={inputBase} placeholder="+212 6 00 00 00 00"
                    onFocus={e => e.target.style.borderColor=A}
                    onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.25)'}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 text-xs tracking-widest uppercase font-semibold transition-all duration-300 mt-2"
                  style={{ background:`linear-gradient(135deg,${A},#c9673a)`, color:'#0a1408', fontFamily:"'Inter',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 30px rgba(232,130,74,0.4)`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours…
                    </span>
                  ) : 'Confirmer la réservation'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}
