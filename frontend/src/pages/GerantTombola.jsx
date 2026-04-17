import { useEffect, useState } from 'react'
import GerantLayout from '../components/shared/GerantLayout'
import { getParticipations, validerAvis, rejeterAvis, tirageAuSort } from '../services/api'
import api from '../services/api'

const STATUT_BADGE = {
  en_attente: 'bg-amber-100 text-amber-700',
  valide: 'bg-green-100 text-green-700',
  rejete: 'bg-red-100 text-red-600',
}

const SENTIMENT_BADGE = {
  positif: 'bg-green-100 text-green-700',
  neutre: 'bg-gray-100 text-gray-600',
  negatif: 'bg-red-100 text-red-600',
}

export default function GerantTombola() {
  const [participations, setParticipations] = useState([])
  const [tombolas, setTombolas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ titre: '', lot: '', date_debut: '', date_fin: '' })
  const [winner, setWinner] = useState(null)

  async function load() {
    setLoading(true)
    const [p, t] = await Promise.all([
      getParticipations(),
      api.get('/api/tombola/'),
    ])
    setParticipations(p.data)
    setTombolas(Array.isArray(t.data) ? t.data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleValider(id) {
    await validerAvis(id)
    load()
  }

  async function handleRejeter(id) {
    await rejeterAvis(id)
    load()
  }

  async function handleTirage(tombolaId) {
    const res = await tirageAuSort(tombolaId)
    setWinner(res.data)
  }

  async function handleCreate(e) {
    e.preventDefault()
    await api.post('/api/tombola/creer', form)
    setShowCreate(false)
    setForm({ titre: '', lot: '', date_debut: '', date_fin: '' })
    load()
  }

  return (
    <GerantLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tombola</h1>
          <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
            + Nouvelle tombola
          </button>
        </div>

        {/* Tombolas actives */}
        {tombolas.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Tombolas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tombolas.map((t) => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900">{t.titre}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Lot : {t.lot}</p>
                  <button
                    onClick={() => handleTirage(t.id)}
                    className="mt-3 w-full text-xs bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600"
                  >
                    Lancer le tirage
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gagnant */}
        {winner && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-800 text-lg">🎉 Gagnant !</p>
              <p className="text-amber-700 mt-0.5">{winner.gagnant ?? JSON.stringify(winner)}</p>
            </div>
            <button onClick={() => setWinner(null)} className="text-xs text-amber-600 hover:text-amber-800">Fermer</button>
          </div>
        )}

        {/* Participations */}
        <h2 className="text-base font-semibold text-gray-700 mb-3">Participations</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          <div className="space-y-3">
            {participations.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="font-medium text-gray-900">{p.nom_participant ?? `Participant #${p.id}`}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_BADGE[p.statut] ?? ''}`}>
                        {p.statut}
                      </span>
                      {p.sentiment && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_BADGE[p.sentiment] ?? ''}`}>
                          {p.sentiment}
                        </span>
                      )}
                    </div>
                    {p.score_ia != null && (
                      <p className="text-xs text-gray-500">Score IA : <strong>{(p.score_ia * 100).toFixed(0)}%</strong></p>
                    )}
                    {p.contenu && <p className="text-xs text-gray-400 mt-1 italic">"{p.contenu}"</p>}
                  </div>
                  {p.statut === 'en_attente' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleValider(p.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">Valider</button>
                      <button onClick={() => handleRejeter(p.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">Rejeter</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {participations.length === 0 && <p className="text-sm text-gray-400">Aucune participation pour l'instant.</p>}
          </div>
        )}
      </div>

      {/* Modal créer tombola */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Nouvelle tombola</h2>
            {[
              { label: 'Titre', key: 'titre' },
              { label: 'Lot', key: 'lot' },
              { label: 'Date début', key: 'date_debut', type: 'datetime-local' },
              { label: 'Date fin', key: 'date_fin', type: 'datetime-local' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input required type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700">Créer</button>
            </div>
          </form>
        </div>
      )}
    </GerantLayout>
  )
}
