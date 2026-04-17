import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMenu, creerCommande, envoyerCuisine, cloturerCommande, toutesCommandes } from '../services/api'

export default function ServeurCommande() {
  const [params] = useSearchParams()
  const tableId = parseInt(params.get('table_id'))
  const tableNum = params.get('table_num')
  const commandeIdParam = params.get('commande_id') ? parseInt(params.get('commande_id')) : null

  const [menu, setMenu] = useState([])
  const [commande, setCommande] = useState(null)
  const [lignes, setLignes] = useState({}) // { plat_id: { quantite, note } }
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(commandeIdParam ? 'view' : 'select')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function init() {
      const m = await getMenu()
      setMenu(m.data)
      if (commandeIdParam) {
        const cmds = await toutesCommandes()
        const found = cmds.data.find((c) => c.id === commandeIdParam)
        setCommande(found ?? null)
      }
      setLoading(false)
    }
    init()
  }, [])

  function addPlat(platId) {
    setLignes((prev) => ({
      ...prev,
      [platId]: { quantite: (prev[platId]?.quantite ?? 0) + 1, note: prev[platId]?.note ?? '' },
    }))
  }

  function removePlat(platId) {
    setLignes((prev) => {
      const updated = { ...prev }
      if (updated[platId]?.quantite > 1) {
        updated[platId] = { ...updated[platId], quantite: updated[platId].quantite - 1 }
      } else {
        delete updated[platId]
      }
      return updated
    })
  }

  function setNote(platId, note) {
    setLignes((prev) => ({ ...prev, [platId]: { ...prev[platId], note } }))
  }

  const totalLignes = Object.values(lignes).reduce((sum, l) => sum + l.quantite, 0)

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
    const cmds = await toutesCommandes()
    setCommande(cmds.data.find((c) => c.id === commande.id))
    setSending(false)
  }

  async function handleCloturer() {
    if (!confirm('Clôturer la commande et libérer la table ?')) return
    await cloturerCommande(commande.id)
    navigate('/serveur')
  }

  const allCategories = menu
  const selectedCount = Object.keys(lignes).length

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/serveur')} className="text-gray-500 hover:text-gray-700 text-sm">← Retour</button>
        <div>
          <p className="font-bold text-gray-900">Table {tableNum}</p>
          <p className="text-xs text-gray-400">
            {step === 'select' ? 'Sélectionner les plats' : commande ? `Commande ${commande.code ?? `#${commande.id}`}` : ''}
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Menu */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'view' && commande ? (
            /* Vue commande existante */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-lg font-bold text-gray-900">Commande {commande.code}</h2>
                <StatutBadge statut={commande.statut} />
              </div>
              <div className="space-y-2 mb-8">
                {commande.lignes?.map((l) => (
                  <div key={l.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{l.plat?.nom ?? `Plat #${l.plat_id}`}</p>
                      {l.note && <p className="text-xs text-gray-400 italic">"{l.note}"</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">x{l.quantite}</p>
                      <StatutBadge statut={l.statut} small />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                {commande.statut === 'en_cours' && (
                  <button onClick={handleEnvoyer} disabled={sending} className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                    {sending ? 'Envoi…' : 'Envoyer en cuisine'}
                  </button>
                )}
                {['envoyee', 'en_preparation', 'prete'].includes(commande.statut) && (
                  <button onClick={handleCloturer} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700">
                    Clôturer la commande
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Sélection des plats */
            allCategories.map((cat) => (
              <div key={cat.id} className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat.nom}</h2>
                <div className="space-y-2">
                  {cat.plats?.filter((p) => p.disponible).map((plat) => {
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
                            onChange={(e) => setNote(plat.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-24 focus:outline-none"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {qty > 0 && (
                            <button onClick={() => removePlat(plat.id)} className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-bold flex items-center justify-center">
                              −
                            </button>
                          )}
                          {qty > 0 && <span className="text-sm font-bold text-gray-900 w-4 text-center">{qty}</span>}
                          <button onClick={() => addPlat(plat.id)} className="w-7 h-7 rounded-full bg-gray-900 text-white hover:bg-gray-700 text-sm font-bold flex items-center justify-center">
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panier (seulement en mode sélection) */}
        {step === 'select' && (
          <div className="w-64 bg-white border-l border-gray-200 p-5 flex flex-col">
            <h2 className="font-bold text-gray-900 mb-4">Récapitulatif</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {Object.entries(lignes).map(([platId, l]) => {
                const plat = allCategories.flatMap((c) => c.plats ?? []).find((p) => p.id === parseInt(platId))
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

function StatutBadge({ statut, small }) {
  const config = {
    en_cours: 'bg-gray-100 text-gray-600',
    envoyee: 'bg-blue-100 text-blue-700',
    en_preparation: 'bg-amber-100 text-amber-700',
    prete: 'bg-green-100 text-green-700',
    cloturee: 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full font-medium capitalize ${config[statut] ?? 'bg-gray-100 text-gray-500'}`}>
      {statut?.replace('_', ' ')}
    </span>
  )
}
