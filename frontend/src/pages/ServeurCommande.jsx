import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMenu, creerCommande, envoyerCuisine, cloturerCommande, toutesCommandes, suiviCommande, annulerCommande, modifierCommande, suiviCommande as getCommande, getClientPrizesServeur, appliquerReductionServeur, modifierQuantiteLigne, supprimerLigne, ajouterPlatCommande } from '../services/api'

const STATUT_LIGNE_LABEL = {
  en_cours:       { label: 'En attente',     cls: 'bg-gray-100 text-gray-500' },
  en_preparation: { label: 'En préparation', cls: 'bg-amber-100 text-amber-700' },
  prete:          { label: 'Prêt ✓',         cls: 'bg-green-100 text-green-700' },
}

export default function ServeurCommande() {
  const [params] = useSearchParams()
  const tableId    = parseInt(params.get('table_id'))
  const tableNum   = params.get('table_num')
  const commandeIdParam = params.get('commande_id') ? parseInt(params.get('commande_id')) : null
  const isEditQR   = params.get('edit_qr') === '1'   // mode édition commande QR espèces

  const [menu, setMenu] = useState([])
  const [commande, setCommande] = useState(null)
  const [suivi, setSuivi] = useState(null)
  const [lignes, setLignes] = useState({})
  const [loading, setLoading] = useState(true)
  // edit_qr → on commence en 'select' avec les lignes pré-chargées
  const [step, setStep] = useState(commandeIdParam && !isEditQR ? 'suivi' : 'select')
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

      if (commandeIdParam && isEditQR) {
        // Pré-charger les lignes existantes de la commande QR
        try {
          const r = await suiviCommande(commandeIdParam)
          const existingLignes = {}
          r.data.lignes?.forEach(l => {
            const plat = m.data.flatMap(c => c.plats ?? []).find(p => p.nom === l.plat_nom)
            if (plat) existingLignes[plat.id] = { quantite: l.quantite, note: l.note || '' }
          })
          setLignes(existingLignes)
          setCommande({ id: commandeIdParam, code_unique: r.data.code_unique })
        } catch { /* si erreur, on part de zéro */ }
      } else if (commandeIdParam) {
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

  const lignesArr = () => Object.entries(lignes).map(([plat_id, l]) => ({
    plat_id: parseInt(plat_id), quantite: l.quantite, note: l.note || '',
  }))

  async function handleCreer() {
    setSending(true)
    try {
      if (isEditQR && commandeIdParam) {
        // Mode édition : modifier + envoyer directement en cuisine
        await modifierCommande(commandeIdParam, lignesArr())
        await envoyerCuisine(commandeIdParam)
        navigate('/serveur')
      } else {
        const res = await creerCommande({ table_id: tableId, lignes: lignesArr() })
        setCommande(res.data)
        setStep('view')
      }
    } finally {
      setSending(false)
    }
  }

  async function handleEnvoyer() {
    setSending(true)
    await envoyerCuisine(commande.id)
    setSending(false)
    setStep('suivi')
    startPolling(commande.id)
  }

  const [cloturerModal, setCloturerModal] = useState(null)
  const [clientIdentifiant, setClientIdentifiant] = useState('')
  const [cloturerResult, setCloturerResult] = useState(null)
  const [cloturerLoading, setCloturerLoading] = useState(false)
  const [clientPrizes, setClientPrizes]   = useState([])
  const [selectedGain, setSelectedGain]   = useState(null)
  const [prizeLookupLoading, setPrizeLookupLoading] = useState(false)

  const [annulerModal, setAnnulerModal]   = useState(null)
  const [raisonAnnul,  setRaisonAnnul]   = useState('')
  const [annulerLoading, setAnnulerLoading] = useState(false)

  const RAISONS_ANNULATION = [
    'Client parti sans commander',
    'Erreur de saisie',
    'Rupture de stock en cuisine',
    'Client a changé d\'avis',
    'Problème de paiement',
    'Commande en double',
    'Table libérée (fin de service)',
    'Autre',
  ]

  function handleCloturer(commandeId) {
    setCloturerModal(commandeId)
    setClientIdentifiant('')
    setCloturerResult(null)
    setClientPrizes([])
    setSelectedGain(null)
  }

  async function rechercherPrizesClient() {
    const id = clientIdentifiant.trim()
    if (!id) return
    setPrizeLookupLoading(true)
    try {
      const r = await getClientPrizesServeur(id)
      setClientPrizes(r.data.prizes || [])
    } catch { setClientPrizes([]) }
    finally { setPrizeLookupLoading(false) }
  }

  async function confirmerCloturer() {
    setCloturerLoading(true)
    try {
      // Appliquer réduction si sélectionnée
      if (selectedGain) {
        try { await appliquerReductionServeur(cloturerModal, selectedGain.gain_id) } catch { /* silencieux */ }
      }
      const res = await cloturerCommande(cloturerModal, clientIdentifiant.trim() || null)
      const { points_gagnes, client_prenom } = res.data
      if (points_gagnes > 0) {
        setCloturerResult({ prenom: client_prenom, points: points_gagnes })
        setTimeout(() => {
          setCloturerModal(null)
          if (pollingRef.current) clearInterval(pollingRef.current)
          navigate('/serveur')
        }, 2500)
      } else {
        setCloturerModal(null)
        if (pollingRef.current) clearInterval(pollingRef.current)
        navigate('/serveur')
      }
    } finally {
      setCloturerLoading(false)
    }
  }

  function handleAnnuler(commandeId) {
    setAnnulerModal(commandeId)
    setRaisonAnnul('')
  }

  async function confirmerAnnuler() {
    if (!raisonAnnul) return
    setAnnulerLoading(true)
    try {
      await annulerCommande(annulerModal, raisonAnnul)
      setAnnulerModal(null)
      if (pollingRef.current) clearInterval(pollingRef.current)
      navigate('/serveur')
    } finally {
      setAnnulerLoading(false)
    }
  }

  // ── Modification en temps réel (étape suivi) ───────────────────────────────
  const [showAjouterMenu, setShowAjouterMenu] = useState(false)
  const [ajouterSearch, setAjouterSearch] = useState('')
  const [platSelectionne, setPlatSelectionne] = useState(null) // { id, nom, prix }
  const [ajouterQty, setAjouterQty] = useState(1)
  const [ajouterNote, setAjouterNote] = useState('')
  const [modifyingLigne, setModifyingLigne] = useState(null)

  function selectPlat(p) {
    setPlatSelectionne(p)
    setAjouterQty(1)
    setAjouterNote('')
  }

  function annulerAjouter() {
    setShowAjouterMenu(false)
    setAjouterSearch('')
    setPlatSelectionne(null)
    setAjouterQty(1)
    setAjouterNote('')
  }

  async function handleModifierQty(cmdId, ligneId, newQty) {
    if (newQty < 1) return
    setModifyingLigne(ligneId)
    try {
      await modifierQuantiteLigne(cmdId, ligneId, newQty)
      const r = await suiviCommande(cmdId); setSuivi(r.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Impossible de modifier')
    } finally { setModifyingLigne(null) }
  }

  async function handleSupprimerLigne(cmdId, ligneId) {
    if (!window.confirm('Supprimer ce plat de la commande ?')) return
    setModifyingLigne(ligneId)
    try {
      await supprimerLigne(cmdId, ligneId)
      const r = await suiviCommande(cmdId); setSuivi(r.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Impossible de supprimer')
    } finally { setModifyingLigne(null) }
  }

  async function handleAjouterPlat(cmdId) {
    if (!platSelectionne) return
    try {
      await ajouterPlatCommande(cmdId, platSelectionne.id, ajouterQty, ajouterNote)
      const r = await suiviCommande(cmdId); setSuivi(r.data)
      annulerAjouter()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur')
    }
  }

  const allPlats = menu.flatMap(cat => cat.plats ?? [])
  const platsFiltered = ajouterSearch
    ? allPlats.filter(p => p.nom.toLowerCase().includes(ajouterSearch.toLowerCase()))
    : allPlats

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/serveur')} className="text-gray-500 hover:text-gray-700 text-sm">← Retour</button>
        <div>
          <p className="font-bold text-gray-900">Table {tableNum}</p>
          <p className="text-xs text-gray-400">
            {isEditQR
              ? <span className="text-orange-600 font-semibold">✏ Modifier la commande QR — {commande?.code_unique ?? ''}</span>
              : step === 'select' ? 'Sélectionner les plats'
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

                  {/* Lignes avec contrôles modification */}
                  <div className="space-y-2 mb-3">
                    {suivi.lignes.map(l => {
                      const s = STATUT_LIGNE_LABEL[l.statut] || STATUT_LIGNE_LABEL.en_cours
                      const canEdit = l.statut === 'en_cours'
                      const isLoading = modifyingLigne === l.id
                      return (
                        <div key={l.id} className={`bg-white border rounded-xl px-4 py-3 ${l.statut === 'prete' ? 'border-green-200' : canEdit ? 'border-blue-200' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${l.statut === 'prete' ? 'text-green-700' : 'text-gray-900'}`}>
                                {l.plat_nom}
                              </p>
                              {l.note && <p className="text-xs text-gray-400 italic mt-0.5">"{l.note}"</p>}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {canEdit ? (
                                <>
                                  <button onClick={() => handleModifierQty(suivi.id, l.id, l.quantite - 1)}
                                    disabled={isLoading || l.quantite <= 1}
                                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm disabled:opacity-30 flex items-center justify-center">−</button>
                                  <span className="text-sm font-bold text-gray-900 w-5 text-center">{l.quantite}</span>
                                  <button onClick={() => handleModifierQty(suivi.id, l.id, l.quantite + 1)}
                                    disabled={isLoading}
                                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm disabled:opacity-30 flex items-center justify-center">+</button>
                                  <button onClick={() => handleSupprimerLigne(suivi.id, l.id)}
                                    disabled={isLoading}
                                    className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 text-sm disabled:opacity-30 flex items-center justify-center">✕</button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-500">{l.quantite}×</span>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ajouter un plat */}
                  {['envoyee', 'en_preparation'].includes(suivi.statut) && (
                    <div className="mb-4">
                      {!showAjouterMenu ? (
                        <button onClick={() => setShowAjouterMenu(true)}
                          className="w-full py-2 border-2 border-dashed border-blue-300 rounded-xl text-sm text-blue-600 hover:bg-blue-50 font-medium">
                          + Ajouter un plat
                        </button>
                      ) : (
                        <div className="bg-white border border-blue-200 rounded-xl p-3 space-y-3">

                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Ajouter un plat</span>
                            <button onClick={annulerAjouter} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                          </div>

                          {/* Recherche + liste si pas encore sélectionné */}
                          {!platSelectionne ? (
                            <>
                              <input autoFocus value={ajouterSearch} onChange={e => setAjouterSearch(e.target.value)}
                                placeholder="Rechercher un plat…"
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400" />
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {platsFiltered.slice(0, 10).map(p => (
                                  <button key={p.id} onClick={() => selectPlat(p)}
                                    className="w-full text-left text-sm px-3 py-2 hover:bg-blue-50 rounded-lg text-gray-800 flex justify-between items-center">
                                    <span>{p.nom}</span>
                                    <span className="text-gray-400 text-xs">{p.prix} MAD</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            /* Plat sélectionné → formulaire note + qty */
                            <>
                              {/* Plat choisi */}
                              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                                <div>
                                  <p className="text-sm font-semibold text-blue-800">{platSelectionne.nom}</p>
                                  <p className="text-xs text-blue-500">{platSelectionne.prix} MAD / unité</p>
                                </div>
                                <button onClick={() => setPlatSelectionne(null)}
                                  className="text-blue-400 hover:text-blue-600 text-xs underline">Changer</button>
                              </div>

                              {/* Quantité */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 font-medium w-20">Quantité</span>
                                <button onClick={() => setAjouterQty(q => Math.max(1, q - 1))}
                                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center">−</button>
                                <span className="text-sm font-bold text-gray-900 w-6 text-center">{ajouterQty}</span>
                                <button onClick={() => setAjouterQty(q => q + 1)}
                                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center">+</button>
                                <span className="text-xs text-gray-400 ml-auto">{(platSelectionne.prix * ajouterQty).toFixed(0)} MAD</span>
                              </div>

                              {/* Note */}
                              <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Note (optionnel)</label>
                                <input
                                  value={ajouterNote}
                                  onChange={e => setAjouterNote(e.target.value)}
                                  placeholder="Ex : sans oignon, bien cuit, allergies…"
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                                />
                              </div>

                              {/* Confirmer */}
                              <button onClick={() => handleAjouterPlat(suivi.id)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                                ✓ Confirmer l'ajout
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center mb-4">🔵 Modifiable &nbsp;|&nbsp; 🟡 En préparation &nbsp;|&nbsp; 🟢 Prêt</p>

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
                        <p className="text-sm font-bold text-gray-800 mt-1">{plat.prix} Dh</p>
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
                className={`w-full py-3 rounded-xl text-sm font-medium disabled:opacity-40 ${
                  isEditQR
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-700 text-white'
                }`}
              >
                {sending
                  ? (isEditQR ? 'Envoi en cuisine…' : 'Création…')
                  : (isEditQR ? '▶ Valider & envoyer en cuisine' : 'Créer la commande')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal clôture fidélité ── */}
      {cloturerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {cloturerResult ? (
              <div className="text-center py-2">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-bold text-gray-900 text-lg">{cloturerResult.prenom} gagne</p>
                <p className="text-3xl font-black text-green-600 my-1">+{cloturerResult.points} pts</p>
                <p className="text-sm text-gray-400">Crédités sur son compte fidélité</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 text-base mb-1">Clôturer la commande</h3>
                <p className="text-sm text-gray-500 mb-3">Optionnel — entrez l'email ou le téléphone du client pour lui créditer des points.</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="email ou téléphone"
                    value={clientIdentifiant}
                    onChange={e => { setClientIdentifiant(e.target.value); setClientPrizes([]); setSelectedGain(null) }}
                    onKeyDown={e => e.key === 'Enter' && rechercherPrizesClient()}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    autoFocus
                  />
                  <button onClick={rechercherPrizesClient} disabled={prizeLookupLoading || !clientIdentifiant.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">
                    {prizeLookupLoading ? '…' : '🔍'}
                  </button>
                </div>

                {/* Réductions disponibles */}
                {clientPrizes.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">🎁 Réductions disponibles</p>
                    <div className="flex flex-col gap-1.5">
                      {clientPrizes.map(p => (
                        <button key={p.gain_id} onClick={() => setSelectedGain(selectedGain?.gain_id === p.gain_id ? null : p)}
                          className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            selectedGain?.gain_id === p.gain_id
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}>
                          <span>{p.nom}</span>
                          <span className="font-black">-{p.valeur}%</span>
                        </button>
                      ))}
                    </div>
                    {selectedGain && <p className="text-xs text-amber-600 mt-1.5">✓ Réduction {selectedGain.valeur}% sera appliquée à la clôture</p>}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setCloturerModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmerCloturer}
                    disabled={cloturerLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {cloturerLoading ? 'Clôture…' : 'Clôturer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Modal annulation avec raison ── */}
      {annulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-base mb-1">Annuler la commande</h3>
            <p className="text-sm text-gray-500 mb-4">Sélectionnez la raison de l'annulation. Le gérant sera notifié.</p>
            <div className="flex flex-col gap-2 mb-5">
              {RAISONS_ANNULATION.map(r => (
                <button
                  key={r}
                  onClick={() => setRaisonAnnul(r)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    raisonAnnul === r
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {raisonAnnul === r && '✓ '}{r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAnnulerModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmerAnnuler}
                disabled={!raisonAnnul || annulerLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              >
                {annulerLoading ? 'Annulation…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
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
