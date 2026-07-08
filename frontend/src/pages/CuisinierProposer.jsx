import { useEffect, useState } from 'react'
import { proposerPlat, mesPropositions, getCategories, getIngredients } from '../services/api'

const STATUT_CONFIG = {
  en_attente: { label: 'En attente',  color: 'bg-amber-100 text-amber-700' },
  valide:     { label: 'Validé ✓',   color: 'bg-green-100 text-green-700' },
  refuse:     { label: 'Refusé',     color: 'bg-red-100 text-red-700'     },
}

function Toast({ msg, type }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {msg}
    </div>
  )
}

const EMPTY = { nom: '', description: '', prix: '', categorie_id: '' }

export default function CuisinierProposer() {
  const [form, setForm] = useState(EMPTY)
  const [ingLines, setIngLines] = useState([])
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [propositions, setPropositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try {
      const [c, i, p] = await Promise.all([getCategories(), getIngredients(), mesPropositions()])
      setCategories(c.data)
      setIngredients(i.data)
      setPropositions(p.data)
      if (c.data.length > 0) setForm(f => ({ ...f, categorie_id: f.categorie_id || c.data[0].id }))
    } catch { notify('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!form.nom || !form.prix || !form.categorie_id) {
      return notify('Nom, prix et catégorie sont requis', 'error')
    }
    setSaving(true)
    try {
      await proposerPlat({
        nom: form.nom,
        description: form.description,
        prix: parseFloat(form.prix),
        categorie_id: parseInt(form.categorie_id),
        ingredients: ingLines
          .filter(l => l.ingredient_id && l.quantite)
          .map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantite: parseFloat(l.quantite) })),
      })
      notify('Proposition envoyée au gérant !')
      setForm(EMPTY)
      setIngLines([])
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Proposer un nouveau plat</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulaire */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Détails du plat</h3>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom du plat *</label>
                <input
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Tajine d'agneau aux pruneaux"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Décris ton plat : ingrédients, saveurs, histoire…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Prix proposé (Dh) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.prix}
                    onChange={e => setForm({ ...form, prix: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Catégorie *</label>
                  {categories.length === 0 ? (
                    <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                      Aucune catégorie — demande au gérant d'en créer dans Menu &gt; Catégories
                    </div>
                  ) : (
                    <select
                      value={form.categorie_id}
                      onChange={e => setForm({ ...form, categorie_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    >
                      <option value="">— Choisir —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Ingrédients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Ingrédients utilisés</label>
                  {ingredients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIngLines([...ingLines, { ingredient_id: '', quantite: '' }])}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                    >
                      + Ajouter
                    </button>
                  )}
                </div>
                {ingredients.length === 0 && (
                  <p className="text-xs text-gray-400 italic mb-2">
                    Aucun ingrédient disponible (le gérant peut en créer dans Stocks)
                  </p>
                )}
                {ingLines.map((line, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      value={line.ingredient_id}
                      onChange={e => {
                        const n = [...ingLines]
                        n[i].ingredient_id = e.target.value
                        setIngLines(n)
                      }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">— Ingrédient —</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.nom} ({ing.unite || 'u'})</option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.1" min="0"
                      placeholder="Qté"
                      value={line.quantite}
                      onChange={e => {
                        const n = [...ingLines]
                        n[i].quantite = e.target.value
                        setIngLines(n)
                      }}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setIngLines(ingLines.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors mt-2"
              >
                {saving ? 'Envoi en cours…' : 'Envoyer la proposition'}
              </button>
            </form>
          </div>
        </div>

        {/* Mes propositions */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Mes propositions ({propositions.length})</h3>
          <div className="space-y-3">
            {propositions.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
                Aucune proposition envoyée
              </div>
            )}
            {propositions.map(p => {
              const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{p.nom}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                      <p className="text-sm font-bold text-amber-600 mt-2">{p.prix?.toFixed(2)} Dh</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-2 ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                  {p.statut === 'refuse' && p.motif_refus && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-600">
                        <span className="font-semibold">Motif : </span>{p.motif_refus}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} />}
    </div>
  )
}
