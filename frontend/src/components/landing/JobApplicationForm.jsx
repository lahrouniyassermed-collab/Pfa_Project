import { useState } from 'react'

const A = '#e8824a'

export default function JobApplicationForm({ offre, onClose }) {
  const [form, setForm] = useState({ nom:'', prenom:'', telephone:'', message:'', cv:null })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 900)
  }

  const inputBase = {
    width:'100%', background:'transparent', color:'#f5f0e8', padding:'12px 0',
    fontSize:'14px', outline:'none', fontFamily:"'Inter',sans-serif",
    borderBottom:'1px solid rgba(232,130,74,0.22)', transition:'border-color 0.2s',
  }

  if (submitted) return (
    <div className="text-center py-8">
      <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
        style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.35)' }}>
        <svg className="w-6 h-6" fill="none" stroke="#4ade80" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-white text-base mb-2" style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>Candidature envoyée !</p>
      <p className="text-sm mb-6" style={{ color:'rgba(245,240,232,0.45)', fontFamily:"'Inter',sans-serif" }}>
        Nous avons bien reçu votre candidature pour le poste de{' '}
        <strong style={{ color:'rgba(245,240,232,0.7)' }}>{offre.titre}</strong>.
        Nous vous contacterons prochainement.
      </p>
      <button onClick={onClose}
        className="px-8 py-3 text-xs tracking-widest uppercase transition-all duration-200"
        style={{ border:'1px solid rgba(232,130,74,0.22)', color:'rgba(245,240,232,0.45)', fontFamily:"'Inter',sans-serif" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor=A; e.currentTarget.style.color=A }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.22)'; e.currentTarget.style.color='rgba(245,240,232,0.45)' }}>
        Fermer
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-5 pb-4" style={{ borderBottom:'1px solid rgba(232,130,74,0.12)' }}>
        <p className="text-xs tracking-widest uppercase" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>{offre.titre}</p>
        <p className="text-xs mt-1" style={{ color:'rgba(245,240,232,0.35)', fontFamily:"'Inter',sans-serif" }}>{offre.type}</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {[['prenom','Prénom'],['nom','Nom']].map(([field,label]) => (
          <div key={field}>
            <label className="block text-xs tracking-[0.22em] uppercase mb-2"
              style={{ color:'rgba(232,130,74,0.55)', fontFamily:"'Inter',sans-serif" }}>{label}</label>
            <input required type="text" value={form[field]}
              onChange={e => setForm({...form,[field]:e.target.value})}
              style={inputBase}
              onFocus={e => e.target.style.borderColor=A}
              onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.22)'}
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
          onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.22)'}
        />
      </div>

      <div>
        <label className="block text-xs tracking-[0.22em] uppercase mb-2"
          style={{ color:'rgba(232,130,74,0.55)', fontFamily:"'Inter',sans-serif" }}>Message de motivation</label>
        <textarea required rows={4} value={form.message}
          onChange={e => setForm({...form,message:e.target.value})}
          style={{ ...inputBase, resize:'none' }}
          placeholder="Parlez-nous de vous et de votre expérience..."
          onFocus={e => e.target.style.borderColor=A}
          onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.22)'}
        />
      </div>

      <div>
        <label className="block text-xs tracking-[0.22em] uppercase mb-2"
          style={{ color:'rgba(232,130,74,0.55)', fontFamily:"'Inter',sans-serif" }}>CV (PDF)</label>
        <input type="file" accept=".pdf"
          onChange={e => setForm({...form,cv:e.target.files[0]})}
          className="w-full text-xs focus:outline-none"
          style={{
            background:'transparent', color:'rgba(245,240,232,0.5)', padding:'10px 0',
            borderBottom:'1px solid rgba(232,130,74,0.22)', fontFamily:"'Inter',sans-serif",
          }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 text-xs tracking-widest uppercase transition-colors duration-200"
          style={{ border:'1px solid rgba(232,130,74,0.15)', color:'rgba(245,240,232,0.4)', fontFamily:"'Inter',sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.borderColor='rgba(232,130,74,0.35)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='rgba(232,130,74,0.15)'}>
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-3 text-xs tracking-widest uppercase font-semibold transition-all duration-200 disabled:opacity-60"
          style={{ background:`linear-gradient(135deg,${A},#c9673a)`, color:'#0a1408', fontFamily:"'Inter',sans-serif" }}>
          {loading ? '…' : 'Postuler'}
        </button>
      </div>
    </form>
  )
}
