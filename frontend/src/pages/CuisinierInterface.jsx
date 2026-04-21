import { useEffect, useState, useCallback } from 'react'
import { getCommandesCuisine, majStatutCommande, majStatutLigne } from '../services/api'

const STATUT_COMMANDE = {
  envoyee:        { label: 'Nouvelle',        color: 'bg-blue-500',  text: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200'  },
  en_preparation: { label: 'En préparation',  color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

const STATUT_LIGNE = {
  en_cours:       { label: 'En attente',      badge: 'bg-gray-100 text-gray-600'   },
  en_preparation: { label: 'En préparation',  badge: 'bg-amber-100 text-amber-700' },
  prete:          { label: 'Prêt',            badge: 'bg-green-100 text-green-700' },
}

function Timer({ dateHeure }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    function calc() {
      const diff = Math.floor((Date.now() - new Date(dateHeure).getTime()) / 1000)
      if (diff < 60) return `${diff}s`
      if (diff < 3600) return `${Math.floor(diff / 60)}min ${diff % 60}s`
      return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`
    }
    setElapsed(calc())
    const id = setInterval(() => setElapsed(calc()), 1000)
    return () => clearInterval(id)
  }, [dateHeure])

  const diff = Math.floor((Date.now() - new Date(dateHeure).getTime()) / 60000)
  const color = diff >= 20 ? 'text-red-600' : diff >= 10 ? 'text-amber-600' : 'text-gray-500'

  return <span className={`text-xs font-medium ${color}`}>⏱ {elapsed}</span>
}

export default function CuisinierInterface() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const load = useCallback(async () => {
    try {
      const r = await getCommandesCuisine()
      setCommandes(r.data)
    } catch { /* silent refresh */ }
    finally { setLoading(false) }
  }, [])

  // Chargement initial + polling toutes les 5s
  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  async function startCommande(id) {
    try {
      await majStatutCommande(id, 'en_preparation')
      notify('Commande en préparation')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function markLigne(id, currentStatut) {
    const next = currentStatut === 'en_cours' ? 'en_preparation' : 'prete'
    try {
      await majStatutLigne(id, next)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interface cuisine</h2>
          <p className="text-sm text-gray-500 mt-0.5">Mise à jour automatique toutes les 5 secondes</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${commandes.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {commandes.length} commande{commandes.length > 1 ? 's' : ''} en attente
          </span>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors" title="Actualiser">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {commandes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-lg font-medium">Aucune commande en attente</p>
          <p className="text-sm mt-1">Tout est à jour !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {commandes.map(cmd => {
            const cfg = STATUT_COMMANDE[cmd.statut] || STATUT_COMMANDE.envoyee
            const allPret = cmd.lignes.length > 0 && cmd.lignes.every(l => l.statut === 'prete')

            return (
              <div key={cmd.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${cfg.bg}`}>
                {/* Header */}
                <div className={`${cfg.color} px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{cmd.code_unique}</span>
                    {cmd.table && (
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Table {cmd.table.numero}
                      </span>
                    )}
                  </div>
                  <Timer dateHeure={cmd.date_heure} />
                </div>

                {/* Status badge */}
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    {cmd.cuisinier && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        👨‍🍳 {cmd.cuisinier}
                      </span>
                    )}
                  </div>
                  {allPret && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ Tout prêt
                    </span>
                  )}
                </div>

                {/* Lignes */}
                <div className="px-4 pb-4 space-y-2">
                  {cmd.lignes.map(l => {
                    const ls = STATUT_LIGNE[l.statut] || STATUT_LIGNE.en_cours
                    const isDone = l.statut === 'prete'
                    return (
                      <div key={l.id} className={`flex items-start gap-3 p-3 rounded-xl ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${isDone ? 'text-green-700 line-through decoration-green-400' : 'text-gray-900'}`}>
                              {l.quantite}× {l.plat_nom}
                            </span>
                          </div>
                          {l.note && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                              📝 {l.note}
                            </p>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${ls.badge}`}>
                            {ls.label}
                          </span>
                        </div>
                        {!isDone && (
                          <button
                            onClick={() => markLigne(l.id, l.statut)}
                            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                              l.statut === 'en_cours'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {l.statut === 'en_cours' ? '▶ Démarrer' : '✓ Prêt'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4">
                  {cmd.statut === 'envoyee' && (
                    <button
                      onClick={() => startCommande(cmd.id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      ▶ Prendre en charge
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
