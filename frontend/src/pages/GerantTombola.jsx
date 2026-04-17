import { useEffect, useState } from 'react'
import { getTombolas, creerTombola, getParticipations, validerAvis, rejeterAvis, tirageAuSort } from '../services/api'

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  valide:     { label: 'Validée',    color: 'bg-green-100 text-green-700' },
  rejete:     { label: 'Rejetée',   color: 'bg-red-100 text-red-700' },
}

const SENTIMENT_EMOJI = { positif: '😊', neutre: '😐', negatif: '😞' }

function Toast({ msg, type }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {msg}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function GerantTombola() {
  const [tombolas, setTombolas] = useState([])
  const [selected, setSelected] = useState(null)
  const [participations, setParticipations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingP, setLoadingP] = useState(false)
  const [toast, setToast] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [gagnant, setGagnant] = useState(null)
  const [filterStatut, setFilterStatut] = useState('tous')

  const [form, setForm] = useState({
    titre: '', lot: '',
    date_debut: new Date().toISOString().slice(0, 16),
    date_fin:   new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  })

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadTombolas() {
    try { const r = await getTombolas(); setTombolas(r.data) }
    catch { notify('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }

  async function loadParticipations(tid) {
    setLoadingP(true)
    try { const r = await getParticipations(tid); setParticipations(r.data) }
    catch { notify('Erreur chargement participations', 'error') }
    finally { setLoadingP(false) }
  }

  useEffect(() => { loadTombolas() }, [])
  useEffect(() => { if (selected) loadParticipations(selected.id) }, [selected])

  async function creer() {
    if (!form.titre || !form.lot) return notify('Titre et lot requis', 'error')
    try {
      await creerTombola(form)
      notify('Tombola créée')
      setShowCreate(false)
      setForm({ titre: '', lot: '', date_debut: new Date().toISOString().slice(0, 16), date_fin: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) })
      loadTombolas()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function valider(id) {
    try { await validerAvis(id); notify('Participation validée'); loadParticipations(selected.id) }
    catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function rejeter(id) {
    try { await rejeterAvis(id); notify('Participation rejetée'); loadParticipations(selected.id) }
    catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function tirage() {
    try {
      const r = await tirageAuSort(selected.id)
      setGagnant(r.data)
    } catch (e) { notify(e.response?.data?.detail || 'Aucune participation validée', 'error') }
  }

  const filtered = filterStatut === 'tous' ? participations : participations.filter(p => p.statut === filterStatut)

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tombola</h2>
        <button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nouvelle tombola
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tombola list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tombolas</h3>
          {tombolas.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
              Aucune tombola
            </div>
          )}
          {tombolas.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(selected?.id === t.id ? null : t)}
              className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${selected?.id === t.id ? 'border-amber-400 shadow-sm' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.titre}</p>
                  <p className="text-xs text-amber-600 mt-0.5">🎁 {t.lot}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                <span>{t.nb_participations} participations</span>
                <span className="text-green-600">{t.nb_valides} validées</span>
              </div>
            </div>
          ))}
        </div>

        {/* Participations */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
              Sélectionnez une tombola pour voir les participations
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{selected.titre}</h3>
                <button
                  onClick={tirage}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  🎰 Tirage au sort
                </button>
              </div>

              {/* Filter */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 w-fit">
                {[['tous', 'Toutes'], ['en_attente', 'En attente'], ['valide', 'Validées'], ['rejete', 'Rejetées']].map(([v, l]) => (
                  <button key={v} onClick={() => setFilterStatut(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatut === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>

              {loadingP ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(p => {
                    const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{p.prenom} {p.nom}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Commande : <span className="font-mono">{p.code_commande}</span></p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                        </div>

                        {/* IA info */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                          {p.score_ia !== null && p.score_ia !== undefined && (
                            <div className="text-xs">
                              <span className="text-gray-400">Score IA : </span>
                              <span className={`font-semibold ${p.score_ia >= 0.7 ? 'text-green-600' : p.score_ia >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                                {(p.score_ia * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {p.sentiment && (
                            <div className="text-xs">
                              <span className="text-gray-400">Sentiment : </span>
                              <span>{SENTIMENT_EMOJI[p.sentiment]} {p.sentiment}</span>
                            </div>
                          )}
                          {p.validee_par_ia !== null && p.validee_par_ia !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.validee_par_ia ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              IA : {p.validee_par_ia ? 'valide' : 'suspect'}
                            </span>
                          )}
                        </div>

                        {p.statut === 'en_attente' && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => valider(p.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                              Valider
                            </button>
                            <button onClick={() => rejeter(p.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filtered.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
                      Aucune participation
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Nouvelle tombola" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Titre *</label>
              <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex: Tombola d'avril 2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Lot à gagner *</label>
              <input value={form.lot} onChange={e => setForm({ ...form, lot: e.target.value })}
                placeholder="Ex: Repas pour 2 personnes"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date de début</label>
                <input type="datetime-local" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date de fin</label>
                <input type="datetime-local" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={creer} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Créer</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Résultat tirage */}
      {gagnant && (
        <Modal title="🎉 Résultat du tirage" onClose={() => setGagnant(null)}>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{gagnant.gagnant}</h3>
            <p className="text-gray-500 mb-1">{gagnant.email}</p>
            <p className="text-sm text-gray-400 font-mono">Commande : {gagnant.code_commande}</p>
            <button onClick={() => setGagnant(null)} className="mt-6 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-8 py-2.5 rounded-lg transition-colors">
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}
