import { useEffect, useState } from 'react'
import { getTables, creerTable, supprimerTable, changerStatutTable } from '../services/api'

const STATUT_CONFIG = {
  libre:    { label: 'Libre',    color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500'  },
  occupee:  { label: 'Occupée', color: 'bg-red-100 text-red-700 border-red-200',      dot: 'bg-red-500'    },
  reservee: { label: 'Réservée',color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500'  },
}

const EMPLACEMENTS = ['interieur', 'terrasse', 'mezzanine']

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

export default function GerantTables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selected, setSelected] = useState(null) // table card selected
  const [form, setForm] = useState({ numero: '', capacite: '', emplacement: 'interieur' })
  const [filterEmp, setFilterEmp] = useState('tous')

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try { const r = await getTables(); setTables(r.data) }
    catch { notify('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)   // refresh toutes les 10s
    return () => clearInterval(id)
  }, [])

  async function create() {
    if (!form.numero || !form.capacite) return notify('Numéro et capacité requis', 'error')
    try {
      await creerTable({ numero: parseInt(form.numero), capacite: parseInt(form.capacite), emplacement: form.emplacement })
      notify('Table créée')
      setShowCreate(false)
      setForm({ numero: '', capacite: '', emplacement: 'interieur' })
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function remove(id) {
    try {
      await supprimerTable(id)
      notify('Table supprimée')
      setDeleteConfirm(null)
      setSelected(null)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function changeStatut(id, statut) {
    try {
      await changerStatutTable(id, statut)
      notify('Statut mis à jour')
      setSelected(null)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  const displayed = filterEmp === 'tous' ? tables : tables.filter(t => t.emplacement === filterEmp)

  const counts = {
    libre: tables.filter(t => t.statut === 'libre').length,
    occupee: tables.filter(t => t.statut === 'occupee').length,
    reservee: tables.filter(t => t.statut === 'reservee').length,
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tables</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-sm text-green-600 font-medium">{counts.libre} libres</span>
            <span className="text-sm text-red-600 font-medium">{counts.occupee} occupées</span>
            <span className="text-sm text-amber-600 font-medium">{counts.reservee} réservées</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nouvelle table
        </button>
      </div>

      {/* Filter emplacement */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[['tous', 'Tous'], ['interieur', 'Intérieur'], ['terrasse', 'Terrasse'], ['mezzanine', 'Mezzanine']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterEmp(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterEmp === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayed.map(t => {
          const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.libre
          return (
            <div
              key={t.id}
              onClick={() => setSelected(selected?.id === t.id ? null : t)}
              className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${cfg.color} ${selected?.id === t.id ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl font-bold">T{t.numero}</span>
                <span className={`w-2.5 h-2.5 rounded-full mt-1 ${cfg.dot}`} />
              </div>
              <p className="text-xs font-medium capitalize">{cfg.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{t.capacite} pers. · {t.emplacement}</p>
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="col-span-full text-center text-gray-400 text-sm py-16">
            {filterEmp === 'tous' ? 'Aucune table créée' : `Aucune table en ${filterEmp}`}
          </div>
        )}
      </div>

      {/* Action panel for selected table */}
      {selected && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Table n°{selected.numero}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUT_CONFIG).map(([s, cfg]) => (
              selected.statut !== s && (
                <button key={s} onClick={() => changeStatut(selected.id, s)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border-2 ${cfg.color} hover:opacity-80 transition-opacity`}>
                  → {cfg.label}
                </button>
              )
            ))}
            <button onClick={() => setDeleteConfirm(selected.id)}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 transition-colors">
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Nouvelle table" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Numéro *</label>
                <input type="number" min="1" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Capacité *</label>
                <input type="number" min="1" value={form.capacite} onChange={e => setForm({ ...form, capacite: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Emplacement</label>
              <select value={form.emplacement} onChange={e => setForm({ ...form, emplacement: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {EMPLACEMENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={create} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Créer</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Supprimer la table ?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-6">Cette action est irréversible.</p>
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
