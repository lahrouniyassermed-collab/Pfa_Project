import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getCommandesCuisine, majStatutLigne, proposerPlat, mesPropositions } from '../services/api'

const STATUT_LIGNE = {
  en_cours: { label: 'À préparer', bg: 'bg-amber-50 border-amber-200', btn: 'bg-amber-500 hover:bg-amber-600' },
  en_preparation: { label: 'En préparation', bg: 'bg-blue-50 border-blue-200', btn: 'bg-blue-500 hover:bg-blue-600' },
  prete: { label: 'Prête', bg: 'bg-green-50 border-green-200', btn: null },
}

const STATUT_NEXT = { en_cours: 'en_preparation', en_preparation: 'prete' }
const STATUT_NEXT_LABEL = { en_cours: 'Commencer', en_preparation: 'Marquer prête' }

export default function CuisinierInterface() {
  const [commandes, setCommandes] = useState([])
  const [tab, setTab] = useState('cuisine') // cuisine | proposer | mes-props
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nom: '', description: '', prix: '' })
  const [propositions, setPropositions] = useState([])
  const [propSent, setPropSent] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const intervalRef = useRef(null)

  async function loadCuisine() {
    const res = await getCommandesCuisine()
    setCommandes(res.data)
    setLoading(false)
  }

  async function loadProps() {
    const res = await mesPropositions()
    setPropositions(res.data)
  }

  useEffect(() => {
    loadCuisine()
    intervalRef.current = setInterval(loadCuisine, 15000) // auto-refresh 15s
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (tab === 'mes-props') loadProps()
  }, [tab])

  async function handleMajLigne(ligneId, statut) {
    await majStatutLigne(ligneId, statut)
    loadCuisine()
  }

  async function handleProposer(e) {
    e.preventDefault()
    await proposerPlat({ ...form, prix: parseFloat(form.prix) })
    setPropSent(true)
    setForm({ nom: '', description: '', prix: '' })
    setTimeout(() => setPropSent(false), 3000)
  }

  const STATUT_PROP_BADGE = {
    en_attente: 'bg-amber-100 text-amber-700',
    valide: 'bg-green-100 text-green-700',
    refuse: 'bg-red-100 text-red-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-gray-900">MangerManger</p>
          <p className="text-xs text-gray-400">Interface cuisine</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.prenom} {user?.nom}</span>
          <button onClick={() => { logout(); navigate('/login') }} className="text-xs text-red-500 hover:text-red-700">Déconnexion</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {[
            { key: 'cuisine', label: 'Commandes' },
            { key: 'proposer', label: 'Proposer un plat' },
            { key: 'mes-props', label: 'Mes propositions' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
              {t.key === 'cuisine' && commandes.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{commandes.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Commandes cuisine */}
        {tab === 'cuisine' && (
          loading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : commandes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✓</p>
              <p className="font-medium">Aucune commande en attente</p>
              <p className="text-sm mt-1">Actualisation automatique toutes les 15 secondes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {commandes.map((cmd) => (
                <div key={cmd.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
                    <p className="font-bold">Table {cmd.table?.numero ?? '?'}</p>
                    <p className="text-xs text-gray-300">{cmd.code ?? `#${cmd.id}`}</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {cmd.lignes?.map((ligne) => {
                      const cfg = STATUT_LIGNE[ligne.statut] ?? STATUT_LIGNE.en_cours
                      const nextStatut = STATUT_NEXT[ligne.statut]
                      return (
                        <div key={ligne.id} className={`border rounded-lg p-3 ${cfg.bg}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                x{ligne.quantite} {ligne.plat?.nom ?? `Plat #${ligne.plat_id}`}
                              </p>
                              {ligne.note && <p className="text-xs text-gray-500 italic mt-0.5">"{ligne.note}"</p>}
                              <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
                            </div>
                            {nextStatut && (
                              <button
                                onClick={() => handleMajLigne(ligne.id, nextStatut)}
                                className={`text-xs text-white px-2.5 py-1.5 rounded-lg shrink-0 ${cfg.btn}`}
                              >
                                {STATUT_NEXT_LABEL[ligne.statut]}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Proposer un plat */}
        {tab === 'proposer' && (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Proposer un nouveau plat</h2>
            {propSent && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
                Proposition envoyée au gérant !
              </div>
            )}
            <form onSubmit={handleProposer} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              {[
                { label: 'Nom du plat', key: 'nom' },
                { label: 'Description', key: 'description' },
                { label: 'Prix suggéré (€)', key: 'prix', type: 'number', step: '0.01' },
              ].map(({ label, key, ...props }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    required
                    {...props}
                    value={form[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
              ))}
              <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">
                Envoyer la proposition
              </button>
            </form>
          </div>
        )}

        {/* Mes propositions */}
        {tab === 'mes-props' && (
          <div className="max-w-lg space-y-3">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Mes propositions</h2>
            {propositions.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.nom}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{p.description}</p>
                    <p className="text-sm font-bold mt-1">{p.prix} €</p>
                    {p.motif_refus && <p className="text-xs text-red-500 mt-1">Motif : {p.motif_refus}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUT_PROP_BADGE[p.statut] ?? 'bg-gray-100 text-gray-500'}`}>
                    {p.statut}
                  </span>
                </div>
              </div>
            ))}
            {propositions.length === 0 && <p className="text-sm text-gray-400">Aucune proposition.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
