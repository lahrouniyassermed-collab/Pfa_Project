import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMenu, creerCommande, envoyerCuisine, cloturerCommande, toutesCommandes, suiviCommande, annulerCommande } from '../services/api'

const STATUT_LIGNE_LABEL = {
  en_cours:       { label: 'En attente',     cls: 'bg-gray-100 text-gray-500' },
  en_preparation: { label: 'En préparation', cls: 'bg-amber-100 text-amber-700' },
  prete:          { label: 'Prêt ✓',         cls: 'bg-green-100 text-green-700' },
}

export default function ServeurCommande() {
  const [params] = useSearchParams()
  const tableId = parseInt(params.get('table_id'))
  const tableNum = params.get('table_num')
  const commandeIdParam = params.get('commande_id') ? parseInt(params.get('commande_id')) : null

  const [menu, setMenu] = useState([])
  const [commande, setCommande] = useState(null)
  const [suivi, setSuivi] = useState(null)   // données polling suivi
  const [lignes, setLignes] = useState({})
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(commandeIdParam ? 'suivi' : 'select')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()
  const pollingRef = useRef(null)

  // Démarre le polling suivi toutes les 5s
  const startPolling = useCallback((commandeId) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const poll = async () => {
      try {
        const r = await suiviCommande(commandeId)
        setSuivi(r.data)
      } catch { /* silent */ }
    }
    poll()
    pollingRef.current = setInterval(poll, 5000)
  }, [])

  useEffect(() => {
    async function init() {
      const m = await getMenu()
      setMenu(m.data)
      if (commandeIdParam) {
        startPolling(commandeIdParam)
      }
      setLoading(false)
    }
    init()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  function addPlat(platId) {
    setLignes(prev => ({ ...prev, [platId]: { quantite: (prev[platId]?.quantite ?? 0) + 1, note: prev[platId]?.note ?? '' } }))
  }
  function removePlat(platId) {
    setLignes(prev => {
      const updated = { ...prev }
      if (updated[platId]?.quantite > 1) updated[platId] = { ...updated[platId], quantite: updated[platId].quantite - 1 }
      else delete updated[platId]
      return updated
    })
  }
  function setNote(platId, note) {
    setLignes(prev => ({ ...prev, [platId]: { ...prev[platId], note } }))
  }

  const totalLignes = Object.values(lignes).reduce((sum, l) => sum + l.quantite, 0)
  const selectedCount = Object.keys(lignes).length

  async function handleCreer() {
    setSending(true)
    const lignesArr = Object.entries(lignes).map(([plat_id, l]) => ({
      plat_id: parseInt(plat_id),
      quantite: l.quantite,
      note: l.note || '',
    }))
    const res = await creerCommande({ table_id: tableId, lignes: lignesArr })
    setCommande(res.data)
    setStep('view')
    setSending(false)
  }

  async function handleEnvoyer() {
    setSending(true)
    await envoyerCuisine(commande.id)
    setSending(false)
    setStep('suivi')
    startPolling(commande.id)
  }

  async function handleCloturer(commandeId) {
    if (!confirm('Clôturer la commande et libérer la table ?')) return
    await cloturerCommande(commandeId)
    if (pollingRef.current) clearInterval(pollingRef.current)
    navigate('/serveur')
  }

  async function handleAnnuler(commandeId) {
    if (!confirm('Annuler cette commande ? Le gérant sera notifié.')) return
    await annulerCommande(commandeId)
    if (pollingRef.current) clearInterval(pollingRef.current)
    navigate('/serveur')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/serveur')} className="text-gray-500 hover:text-gray-700 text-sm">← Retour</button>
        <div>
          <p className="font-bold text-gray-900">Table {tableNum}</p>
          <p className="text-xs text-gray-400">
            {step === 'select' ? 'Sélectionner les plats'
              : step === 'view' ? `Commande créée — ${commande?.code_unique ?? ''}`
              : `Suivi — ${suivi?.code_unique ?? commande?.code_unique ?? ''}`}
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP: SUIVI ── */}
          {step === 'suivi' && (
            <div className="max-w-lg mx-auto">
              {!suivi ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-10 justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Connexion à la cuisine…
                </div>
              ) : (
                <>
                  {/* Alerte tout prêt */}
                  {suivi.all_pret && (
                    <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
                      <span className="text-2xl">🔔</span>
                      <div>
                        <p className="font-bold text-green-800">Tout est prêt !</p>
                        <p className="text-sm text-green-600">La commande peut être servie.</p>
                      </div>
                    </div>
                  )}

                  {/* Info cuisinier */}
                  {suivi.cuisinier && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <span>👨‍🍳</span>
                      <span>Pris en charge par <strong>{suivi.cuisinier}</strong></span>
                    </div>
                  )}
                  {!suivi.cuisinier && suivi.statut === 'envoyee' && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <span>⏳</span>
                      <span>En attente qu'un cuisinier prenne en charge…</span>
                    </div>
                  )}

                  {/* Lignes */}
                  <div className="space-y-2 mb-6">
                    {suivi.lignes.map(l => {
                      const s = STATUT_LIGNE_LABEL[l.statut] || STATUT_LIGNE_LABEL.en_cours
                      return (
                        <div key={l.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between ${l.statut === 'prete' ? 'border-green-200' : 'border-gray-200'}`}>
                          <div>
                            <p className={`font-medium text-sm ${l.statut === 'prete' ? 'text-green-700' : 'text-gray-900'}`}>
                              {l.quantite}× {l.plat_nom}
                            </p>
                            {l.note && <p className="text-xs text-gray-400 italic mt-0.5">"{l.note}"</p>}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`}>
                            {s.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-gray-400 text-center mb-4">Mise à jour automatique toutes les 5 secondes</p>

                  {/* Clôturer */}
                  {['envoyee', 'en_preparation', 'prete'].includes(suivi.statut) && (
                    <button
                      onClick={() => handleCloturer(suivi.id)}
                      className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                        suivi.all_pret
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {suivi.all_pret ? '✓ Servir et clôturer' : 'Clôturer la commande'}
                    </button>
                  )}
                  {['envoyee', 'en_preparation'].includes(suivi.statut) && (
                    <button
                      onClick={() => handleAnnuler(suivi.id)}
                      className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    >
                      Annuler la commande
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP: VIEW (commande créée, pas encore envoyée) ── */}
          {step === 'view' && commande && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-lg font-bold text-gray-900">Commande {commande.code_unique}</h2>
                <StatutBadge statut={commande.statut} />
              </div>
              <div className="space-y-2 mb-8">
                {commande.lignes?.map(l => (
                  <div key={l.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{l.plat?.nom ?? `Plat #${l.plat_id}`}</p>
                      {l.note && <p className="text-xs text-gray-400 italic">"{l.note}"</p>}
                    </div>
                    <span className="text-sm font-bold text-gray-800">x{l.quantite}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEnvoyer}
                  disabled={sending}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {sending ? 'Envoi…' : 'Envoyer en cuisine'}
                </button>
                <button
                  onClick={() => handleAnnuler(commande.id)}
                  className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SELECT (choix des plats) ── */}
          {step === 'select' && menu.map(cat => (
            <div key={cat.id} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat.nom}</h2>
              <div className="space-y-2">
                {cat.plats?.filter(p => p.disponible).map(plat => {
                  const qty = lignes[plat.id]?.quantite ?? 0
                  return (
                    <div key={plat.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{plat.nom}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{plat.description}</p>
                        <p className="text-sm font-bold text-gray-800 mt-1">{plat.prix} €</p>
                      </div>
                      {qty > 0 && (
                        <input
                          placeholder="Note…"
                          value={lignes[plat.id]?.note ?? ''}
                          onChange={e => setNote(plat.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-24 focus:outline-none"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <button onClick={() => removePlat(plat.id)} className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center">−</button>
                        )}
                        {qty > 0 && <span className="text-sm font-bold text-gray-900 w-4 text-center">{qty}</span>}
                        <button onClick={() => addPlat(plat.id)} className="w-7 h-7 rounded-full bg-gray-900 text-white hover:bg-gray-700 text-sm font-bold flex items-center justify-center">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Panier (seulement en mode sélection) */}
        {step === 'select' && (
          <div className="w-64 bg-white border-l border-gray-200 p-5 flex flex-col">
            <h2 className="font-bold text-gray-900 mb-4">Récapitulatif</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {Object.entries(lignes).map(([platId, l]) => {
                const plat = menu.flatMap(c => c.plats ?? []).find(p => p.id === parseInt(platId))
                return (
                  <div key={platId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1">{plat?.nom ?? `#${platId}`}</span>
                    <span className="text-gray-500 ml-2">x{l.quantite}</span>
                  </div>
                )
              })}
              {selectedCount === 0 && <p className="text-xs text-gray-400">Aucun plat sélectionné.</p>}
            </div>
            <div className="pt-4 border-t border-gray-100 mt-4">
              <p className="text-xs text-gray-400 mb-3">{totalLignes} article{totalLignes > 1 ? 's' : ''}</p>
              <button
                onClick={handleCreer}
                disabled={selectedCount === 0 || sending}
                className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40"
              >
                {sending ? 'Création…' : 'Créer la commande'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatutBadge({ statut }) {
  const config = {
    en_cours: 'bg-gray-100 text-gray-600',
    envoyee: 'bg-blue-100 text-blue-700',
    en_preparation: 'bg-amber-100 text-amber-700',
    prete: 'bg-green-100 text-green-700',
    cloturee: 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${config[statut] ?? 'bg-gray-100 text-gray-500'}`}>
      {statut?.replace('_', ' ')}
    </span>
  )
}
