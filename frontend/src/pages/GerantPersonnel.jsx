import { useEffect, useState } from 'react'
import { getEmployes, creerEmploye, toggleActifEmploye } from '../services/api'

const ROLE_CONFIG = {
  gerant:    { label: 'Gérant',    color: 'bg-purple-100 text-purple-700' },
  serveur:   { label: 'Serveur',   color: 'bg-blue-100 text-blue-700' },
  cuisinier: { label: 'Cuisinier', color: 'bg-amber-100 text-amber-700' },
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

const EMPTY = { nom: '', prenom: '', identifiant: '', code_passe: '', role: 'serveur', telephone: '' }

export default function GerantPersonnel() {
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [filterRole, setFilterRole] = useState('tous')

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try { const r = await getEmployes(); setEmployes(r.data) }
    catch { notify('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!form.nom || !form.prenom || !form.identifiant || !form.code_passe) {
      return notify('Tous les champs obligatoires doivent être remplis', 'error')
    }
    try {
      await creerEmploye(form)
      notify('Compte créé')
      setShowModal(false)
      setForm(EMPTY)
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function toggleActif(id, actif) {
    try {
      await toggleActifEmploye(id, actif)
      notify(actif ? 'Compte activé' : 'Compte désactivé')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  const filtered = filterRole === 'tous' ? employes : employes.filter(e => e.role === filterRole)

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Personnel</h2>
          <p className="text-sm text-gray-500 mt-0.5">{employes.length} compte{employes.length > 1 ? 's' : ''} · {employes.filter(e => e.actif).length} actifs</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowModal(true) }}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nouveau compte
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[['tous', 'Tous'], ['gerant', 'Gérants'], ['serveur', 'Serveurs'], ['cuisinier', 'Cuisiniers']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterRole(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterRole === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Employé', 'Identifiant', 'Rôle', 'Téléphone', 'Date embauche', 'Actif'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const rc = ROLE_CONFIG[e.role] || ROLE_CONFIG.serveur
              return (
                <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!e.actif ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{e.prenom} {e.nom}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{e.identifiant}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rc.color}`}>{rc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.telephone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {e.date_embauche ? new Date(e.date_embauche).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActif(e.id, !e.actif)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${e.actif ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${e.actif ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-12 text-sm">Aucun employé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title="Nouveau compte employé" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prénom *</label>
                <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom *</label>
                <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Identifiant * (ex: SRV001)</label>
              <input value={form.identifiant} onChange={e => setForm({ ...form, identifiant: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code d'accès *</label>
              <input type="password" value={form.code_passe} onChange={e => setForm({ ...form, code_passe: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Rôle *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="serveur">Serveur</option>
                  <option value="cuisinier">Cuisinier</option>
                  <option value="gerant">Gérant</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Téléphone</label>
                <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={create} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Créer le compte</button>
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} />}
    </div>
  )
}
