import { useEffect, useState } from 'react'
import {
  getTousPlats, getCategories, getIngredients, getPropositions,
  creerPlatGerant, modifierPlat, supprimerPlat, validerProposition,
  creerCategorie, supprimerCategorie,
} from '../services/api'

const TABS = ['Plats', 'Propositions cuisinier', 'Catégories']

const STATUT_BADGE = {
  valide:     'bg-green-100 text-green-700',
  en_attente: 'bg-amber-100 text-amber-700',
  refuse:     'bg-red-100 text-red-700',
}

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function GerantMenu() {
  const [tab, setTab] = useState(0)
  const [plats, setPlats] = useState([])
  const [propositions, setPropositions] = useState([])
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Modals
  const [showPlatModal, setShowPlatModal] = useState(false)
  const [editingPlat, setEditingPlat] = useState(null)
  const [showValidModal, setShowValidModal] = useState(null) // proposition id
  const [showCatModal, setShowCatModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Form state
  const [form, setForm] = useState({ nom: '', description: '', prix: '', categorie_id: '', disponible: true })
  const [ingLines, setIngLines] = useState([]) // [{ingredient_id, quantite}]
  const [motifRefus, setMotifRefus] = useState('')
  const [catForm, setCatForm] = useState({ nom: '', ordre: 0 })

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try {
      const [p, pr, c, i] = await Promise.all([getTousPlats(), getPropositions(), getCategories(), getIngredients()])
      setPlats(p.data)
      setPropositions(pr.data)
      setCategories(c.data)
      setIngredients(i.data)
    } catch { notify('Erreur de chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingPlat(null)
    setForm({ nom: '', description: '', prix: '', categorie_id: categories[0]?.id ?? '', disponible: true })
    setIngLines([])
    setShowPlatModal(true)
  }

  function openEdit(plat) {
    setEditingPlat(plat)
    setForm({ nom: plat.nom, description: plat.description || '', prix: plat.prix, categorie_id: plat.categorie_id, disponible: plat.disponible })
    setIngLines([])
    setShowPlatModal(true)
  }

  async function savePlat() {
    const payload = {
      nom: form.nom,
      description: form.description,
      prix: parseFloat(form.prix),
      categorie_id: parseInt(form.categorie_id),
      disponible: form.disponible,
      ingredients: ingLines.map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantite: parseFloat(l.quantite) })).filter(l => l.ingredient_id && l.quantite),
    }
    try {
      if (editingPlat) {
        await modifierPlat(editingPlat.id, { nom: payload.nom, description: payload.description, prix: payload.prix, disponible: payload.disponible, categorie_id: payload.categorie_id })
        notify('Plat modifié')
      } else {
        await creerPlatGerant(payload)
        notify('Plat créé')
      }
      setShowPlatModal(false)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function deletePlat(id) {
    try {
      await supprimerPlat(id)
      notify('Plat supprimé')
      setShowDeleteConfirm(null)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function valider(id, statut) {
    try {
      await validerProposition(id, { statut, motif_refus: motifRefus || null })
      notify(statut === 'valide' ? 'Proposition validée' : 'Proposition refusée')
      setShowValidModal(null)
      setMotifRefus('')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function creerCat() {
    try {
      await creerCategorie({ nom: catForm.nom, ordre: parseInt(catForm.ordre) || 0 })
      notify('Catégorie créée')
      setShowCatModal(false)
      setCatForm({ nom: '', ordre: 0 })
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function deleteCat(id) {
    try {
      await supprimerCategorie(id)
      notify('Catégorie supprimée')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur suppression : des plats utilisent peut-être cette catégorie', 'error') }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  const catName = (id) => categories.find(c => c.id === id)?.nom ?? '—'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Menu & Plats</h2>
        {tab === 0 && (
          <button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nouveau plat
          </button>
        )}
        {tab === 2 && (
          <button onClick={() => setShowCatModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nouvelle catégorie
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
            {t === 'Propositions cuisinier' && propositions.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{propositions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 0 : Plats */}
      {tab === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Plat', 'Catégorie', 'Prix', 'Statut', 'Dispo', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plats.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{p.nom}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{catName(p.categorie_id)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.prix.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_BADGE[p.statut]}`}>{p.statut}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.disponible ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Modifier</button>
                      <button onClick={() => setShowDeleteConfirm(p.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {plats.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-12 text-sm">Aucun plat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 1 : Propositions */}
      {tab === 1 && (
        <div className="space-y-3">
          {propositions.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm shadow-sm">
              Aucune proposition en attente
            </div>
          )}
          {propositions.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.nom}</h3>
                  {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                  <p className="text-lg font-bold text-amber-600 mt-2">{p.prix.toFixed(2)} €</p>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setShowValidModal(p.id); setMotifRefus('') }}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Traiter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2 : Catégories */}
      {tab === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nom', 'Ordre', 'Nb plats', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.ordre}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{plats.filter(p => p.categorie_id === c.id).length}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteCat(c.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-12 text-sm">Aucune catégorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Plat */}
      {showPlatModal && (
        <Modal title={editingPlat ? 'Modifier le plat' : 'Nouveau plat'} onClose={() => setShowPlatModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom *</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prix (€) *</label>
                <input type="number" step="0.01" min="0" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Catégorie *</label>
                {categories.length === 0 ? (
                  <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                    Aucune catégorie — créez-en une d'abord dans l'onglet "Catégories"
                  </div>
                ) : (
                  <select value={form.categorie_id} onChange={e => setForm({ ...form, categorie_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">— Choisir —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="dispo" checked={form.disponible} onChange={e => setForm({ ...form, disponible: e.target.checked })} className="accent-amber-500" />
              <label htmlFor="dispo" className="text-sm text-gray-700">Disponible à la commande</label>
            </div>

            {/* Ingrédients (création uniquement) */}
            {!editingPlat && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Ingrédients</label>
                  <button onClick={() => setIngLines([...ingLines, { ingredient_id: '', quantite: '' }])}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium">+ Ajouter</button>
                </div>
                {ingLines.map((line, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={line.ingredient_id} onChange={e => { const n = [...ingLines]; n[i].ingredient_id = e.target.value; setIngLines(n) }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                      <option value="">— Ingrédient —</option>
                      {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.nom} ({ing.unite || 'u'})</option>)}
                    </select>
                    <input type="number" step="0.1" min="0" placeholder="Qté" value={line.quantite}
                      onChange={e => { const n = [...ingLines]; n[i].quantite = e.target.value; setIngLines(n) }}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button onClick={() => setIngLines(ingLines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={savePlat}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {editingPlat ? 'Enregistrer' : 'Créer le plat'}
              </button>
              <button onClick={() => setShowPlatModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Validation Proposition */}
      {showValidModal && (
        <Modal title="Traiter la proposition" onClose={() => setShowValidModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Motif de refus (optionnel) :</p>
            <textarea value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
              rows={3} placeholder="Ex: Ingrédients trop coûteux..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => valider(showValidModal, 'valide')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Valider
              </button>
              <button onClick={() => valider(showValidModal, 'refuse')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Refuser
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Catégorie */}
      {showCatModal && (
        <Modal title="Nouvelle catégorie" onClose={() => setShowCatModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom *</label>
              <input value={catForm.nom} onChange={e => setCatForm({ ...catForm, nom: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ordre d'affichage</label>
              <input type="number" value={catForm.ordre} onChange={e => setCatForm({ ...catForm, ordre: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex gap-3">
              <button onClick={creerCat} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Créer</button>
              <button onClick={() => setShowCatModal(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {showDeleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setShowDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">Cette action est irréversible.</p>
          <div className="flex gap-3">
            <button onClick={() => deletePlat(showDeleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Supprimer</button>
            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}
