import { useEffect, useState } from 'react'
import GerantLayout from '../components/shared/GerantLayout'
import { getEmployes, creerEmploye } from '../services/api'
import api from '../services/api'

const ROLE_BADGE = {
  gerant: 'bg-purple-100 text-purple-700',
  serveur: 'bg-blue-100 text-blue-700',
  cuisinier: 'bg-orange-100 text-orange-700',
}

export default function GerantPersonnel() {
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', identifiant: '', code_passe: '', role: 'serveur', telephone: '' })
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const res = await getEmployes()
    setEmployes(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setErr('')
    try {
      await creerEmploye(form)
      setShowForm(false)
      setForm({ nom: '', prenom: '', identifiant: '', code_passe: '', role: 'serveur', telephone: '' })
      load()
    } catch (e) {
      setErr(e.response?.data?.detail ?? 'Erreur lors de la création')
    }
  }

  async function handleToggle(id, actif) {
    await api.put(`/api/employes/${id}/actif?actif=${!actif}`)
    load()
  }

  return (
    <GerantLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Personnel</h1>
          <button onClick={() => setShowForm(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
            + Nouveau compte
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Nom', 'Identifiant', 'Rôle', 'Téléphone', 'Statut', 'Action'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employes.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.prenom} {e.nom}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{e.identifiant}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[e.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{e.telephone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${e.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {e.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(e.id, e.actif)}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${e.actif ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-green-100 text-green-600 hover:bg-green-50'}`}
                      >
                        {e.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
                {employes.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun employé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal créer employé */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Nouveau compte employé</h2>
            {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
            {[
              { label: 'Prénom', key: 'prenom' },
              { label: 'Nom', key: 'nom' },
              { label: 'Identifiant', key: 'identifiant' },
              { label: 'Mot de passe', key: 'code_passe', type: 'password' },
              { label: 'Téléphone (optionnel)', key: 'telephone' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type={type}
                  required={key !== 'telephone'}
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rôle</label>
              <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="serveur">Serveur</option>
                <option value="cuisinier">Cuisinier</option>
                <option value="gerant">Gérant</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700">Créer</button>
            </div>
          </form>
        </div>
      )}
    </GerantLayout>
  )
}
