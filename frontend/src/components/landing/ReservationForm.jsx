import { useState } from 'react'

export default function ReservationForm({ table, date, heure, personnes, onClose }) {
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 800)
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white text-base mb-2">Demande envoyée !</p>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          Votre demande de réservation pour la table {table.numero} ({date} à {heure}) a bien été enregistrée. Le gérant vous contactera pour confirmer.
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 border border-white/20 text-white/60 text-xs tracking-widest uppercase hover:border-[#d4a853] hover:text-[#d4a853] transition-all duration-200"
        >
          Fermer
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 p-4 bg-[#d4a853]/10 border border-[#d4a853]/30">
        <p className="text-[#d4a853] text-xs tracking-widest uppercase mb-1">Récapitulatif</p>
        <p className="text-white/70 text-sm">Table {table.numero} · {date} à {heure} · {personnes} personne{personnes > 1 ? 's' : ''}</p>
      </div>

      {['prenom', 'nom', 'telephone'].map((field) => (
        <div key={field}>
          <label className="block text-white/50 text-xs tracking-widest uppercase mb-2">
            {field === 'prenom' ? 'Prénom' : field === 'nom' ? 'Nom' : 'Téléphone'}
          </label>
          <input
            required
            type={field === 'telephone' ? 'tel' : 'text'}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full bg-[#111] border border-white/15 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors duration-200 placeholder-white/20"
            placeholder={field === 'telephone' ? '+33 6 00 00 00 00' : ''}
          />
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 border border-white/15 text-white/50 text-xs tracking-widest uppercase hover:border-white/30 transition-colors duration-200"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-[#d4a853] text-[#0f0f0f] text-xs tracking-widest uppercase font-semibold hover:bg-[#e6bb6a] transition-colors duration-200 disabled:opacity-60"
        >
          {loading ? '...' : 'Confirmer'}
        </button>
      </div>
    </form>
  )
}
