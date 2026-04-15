import { useEffect, useState } from 'react'
import { getIngredients, creerIngredient, modifierIngredient, supprimerIngredient } from '../services/api'

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

function StockBar({ current, seuil }) {
  if (!seuil || seuil === 0) return null
  const pct = Math.min((current / seuil) * 100, 200)
  const color = current <= seuil ? 'bg-red-400' : current <= seuil * 1.5 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-14 text-right">seuil {seuil}</span>
    </div>
  )
}

const EMPTY_FORM = { nom: '', quantite_stock: '', seuil_alerte: '', unite: '' }

export default function GerantIngredients() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filter, setFilter] = useState('tous')

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try {
      const r = await getIngredients()
      setIngredients(r.data)
    } catch { notify('Erreur de chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(ing) {
    setEditing(ing)
    setForm({ nom: ing.nom, quantite_stock: ing.quantite_stock, seuil_alerte: ing.seuil_alerte, unite: ing.unite || '' })
    setShowModal(true)
  }

  async function save() {
    const payload = {
      nom: form.nom,
      quantite_stock: parseFloat(form.quantite_stock) || 0,
      seuil_alerte: parseFloat(form.seuil_alerte) || 0,
      unite: form.unite || null,
    }
    try {
      if (editing) {
        await modifierIngredient(editing.id, payload)
        notify('Ingrédient modifié')
      } else {
        await creerIngredient(payload)
        notify('Ingrédient ajouté')
      }
      setShowModal(false)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function remove(id) {
    try {
      await supprimerIngredient(id)
      notify('Ingrédient supprimé')
      setDeleteConfirm(null)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  const alerte = (ing) => ing.seuil_alerte > 0 && ing.quantite_stock <= ing.seuil_alerte

  const filtered = filter === 'alertes'
    ? ingredients.filter(alerte)
    : ingredients

  const nbAlertes = ingredients.filter(alerte).length

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stocks & Ingrédients</h2>
          {nbAlertes > 0 && (
            <p className="text-sm text-red-600 mt-0.5 font-medium">{nbAlertes} ingrédient{nbAlertes > 1 ? 's' : ''} en alerte de stock</p>
          )}
        </div>
        <button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Ajouter
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[['tous', 'Tous'], ['alertes', `Alertes${nbAlertes > 0 ? ` (${nbAlertes})` : ''}`]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Ingrédient', 'Stock actuel', 'Seuil alerte', 'Unité', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(ing => (
              <tr key={ing.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${alerte(ing) ? 'bg-red-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {alerte(ing) && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Stock bas" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{ing.nom}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className={`font-semibold text-sm ${alerte(ing) ? 'text-red-600' : 'text-gray-900'}`}>
                      {ing.quantite_stock}
                    </span>
                    <StockBar current={ing.quantite_stock} seuil={ing.seuil_alerte} />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{ing.seuil_alerte || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{ing.unite || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(ing)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Modifier</button>
                    <button onClick={() => setDeleteConfirm(ing.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-12 text-sm">
                {filter === 'alertes' ? 'Aucune alerte de stock' : 'Aucun ingrédient'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Modifier l\'ingrédient' : 'Nouvel ingrédient'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom *</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Stock actuel</label>
                <input type="number" step="0.1" min="0" value={form.quantite_stock} onChange={e => setForm({ ...form, quantite_stock: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Seuil alerte</label>
                <input type="number" step="0.1" min="0" value={form.seuil_alerte} onChange={e => setForm({ ...form, seuil_alerte: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Unité (kg, L, pièces…)</label>
              <input value={form.unite} onChange={e => setForm({ ...form, unite: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">Cet ingrédient sera définitivement supprimé.</p>
          <div className="flex gap-3">
            <button onClick={() => remove(deleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Supprimer</button>
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}
