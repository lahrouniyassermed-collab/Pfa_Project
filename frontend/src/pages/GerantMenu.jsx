import { useEffect, useState } from 'react'
import GerantLayout from '../components/shared/GerantLayout'
import {
  getTousPlats, getPropositions, creerPlatGerant,
  modifierPlat, supprimerPlat, validerProposition
} from '../services/api'

const TABS = ['Tous les plats', 'Propositions']

export default function GerantMenu() {
  const [tab, setTab] = useState(0)
  const [plats, setPlats] = useState([])
  const [propositions, setPropositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nom: '', description: '', prix: '', categorie_id: '' })
  const [motifRefus, setMotifRefus] = useState({})

  async function load() {
    setLoading(true)
    const [p, pr] = await Promise.all([getTousPlats(), getPropositions()])
    setPlats(p.data)
    setPropositions(pr.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ nom: '', description: '', prix: '', categorie_id: '' })
    setShowForm(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ nom: p.nom, description: p.description ?? '', prix: p.prix, categorie_id: p.categorie_id ?? '' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, prix: parseFloat(form.prix), categorie_id: form.categorie_id ? parseInt(form.categorie_id) : null }
    if (editing) {
      await modifierPlat(editing.id, payload)
    } else {
      await creerPlatGerant(payload)
    }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce plat ?')) return
    await supprimerPlat(id)
    load()
  }

  async function handleValider(id) {
    await validerProposition(id, { statut: 'valide' })
    load()
  }

  async function handleRefuser(id) {
    await validerProposition(id, { statut: 'refuse', motif_refus: motifRefus[id] ?? '' })
    load()
  }

  const statutBadge = (s) => ({
    valide: 'bg-green-100 text-green-700',
    en_attente: 'bg-amber-100 text-amber-700',
    refuse: 'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-600')

  return (
    <GerantLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <button onClick={openCreate} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
            + Nouveau plat
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === i ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
              {i === 1 && propositions.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{propositions.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : tab === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plats.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{p.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>
                    <p className="text-base font-bold text-gray-800 mt-2">{p.prix} €</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statutBadge(p.statut)}`}>{p.statut}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEdit(p)} className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="flex-1 text-xs border border-red-100 text-red-500 rounded-lg py-1.5 hover:bg-red-50">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {plats.length === 0 && <p className="text-sm text-gray-400 col-span-3">Aucun plat encore.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {propositions.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{p.nom}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                    <p className="text-sm font-bold mt-1">{p.prix} €</p>
                    {p.proposee_par && <p className="text-xs text-gray-400 mt-1">Proposé par : cuisinier #{p.proposee_par}</p>}
                  </div>
                  <div className="flex flex-col gap-2 min-w-fit">
                    <button onClick={() => handleValider(p.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      Valider
                    </button>
                    <button onClick={() => handleRefuser(p.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">
                      Refuser
                    </button>
                  </div>
                </div>
                <input
                  placeholder="Motif de refus (optionnel)"
                  value={motifRefus[p.id] ?? ''}
                  onChange={(e) => setMotifRefus((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="mt-3 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            ))}
            {propositions.length === 0 && <p className="text-sm text-gray-400">Aucune proposition en attente.</p>}
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier le plat' : 'Nouveau plat'}</h2>
            {[
              { label: 'Nom', key: 'nom', type: 'text', required: true },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Prix (€)', key: 'prix', type: 'number', required: true, step: '0.01' },
              { label: 'ID Catégorie', key: 'categorie_id', type: 'number' },
            ].map(({ label, key, ...props }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  {...props}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700">
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </GerantLayout>
  )
}
