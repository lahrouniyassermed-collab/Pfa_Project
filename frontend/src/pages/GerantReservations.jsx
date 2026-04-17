import { useEffect, useState } from 'react'
import GerantLayout from '../components/shared/GerantLayout'
import { getReservations, confirmerReservation, annulerReservation, verifierCodeAcces } from '../services/api'

const STATUT_BADGE = {
  en_attente: 'bg-amber-100 text-amber-700',
  confirmee: 'bg-green-100 text-green-700',
  annulee: 'bg-gray-100 text-gray-500',
}

export default function GerantReservations() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [codeVerif, setCodeVerif] = useState('')
  const [codeResult, setCodeResult] = useState(null)
  const [filter, setFilter] = useState('toutes')

  async function load() {
    setLoading(true)
    const res = await getReservations()
    setReservations(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleConfirmer(id) {
    await confirmerReservation(id)
    load()
  }

  async function handleAnnuler(id) {
    if (!confirm('Annuler cette réservation ?')) return
    await annulerReservation(id)
    load()
  }

  async function handleVerifCode(e) {
    e.preventDefault()
    try {
      const res = await verifierCodeAcces(codeVerif.trim())
      setCodeResult({ ok: true, data: res.data })
    } catch {
      setCodeResult({ ok: false })
    }
  }

  const filtered = filter === 'toutes'
    ? reservations
    : reservations.filter((r) => r.statut === filter)

  return (
    <GerantLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Réservations</h1>

        {/* Vérification code local privé */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Vérifier un code local privé</p>
          <form onSubmit={handleVerifCode} className="flex gap-3">
            <input
              value={codeVerif}
              onChange={(e) => setCodeVerif(e.target.value)}
              placeholder="LOCAL-2026-XXXX"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
              Vérifier
            </button>
          </form>
          {codeResult && (
            <div className={`mt-3 text-sm px-4 py-2 rounded-lg ${codeResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {codeResult.ok
                ? `✓ Code valide — ${codeResult.data?.client_nom ?? ''} ${codeResult.data?.client_prenom ?? ''}`
                : '✗ Code invalide ou introuvable'}
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-5">
          {['toutes', 'en_attente', 'confirmee', 'annulee'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
            >
              {f === 'toutes' ? 'Toutes' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{r.client_prenom} {r.client_nom}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_BADGE[r.statut] ?? ''}`}>
                        {r.statut.replace('_', ' ')}
                      </span>
                      {r.type_reservation === 'local_prive' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Local privé</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {r.date_heure ? new Date(r.date_heure).toLocaleString('fr-FR') : '—'} · {r.nb_personnes} pers.
                    </p>
                    {r.telephone && <p className="text-xs text-gray-400 mt-0.5">📞 {r.telephone}</p>}
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{r.notes}"</p>}
                    {r.code_acces && (
                      <p className="text-xs text-purple-600 mt-1 font-mono">Code : {r.code_acces}</p>
                    )}
                  </div>
                  {r.statut === 'en_attente' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleConfirmer(r.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                        Confirmer
                      </button>
                      <button onClick={() => handleAnnuler(r.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-400">Aucune réservation.</p>}
          </div>
        )}
      </div>
    </GerantLayout>
  )
}
