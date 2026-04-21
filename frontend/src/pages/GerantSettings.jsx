import { useEffect, useState } from 'react'
import {
  getRestaurantInfo, updateRestaurantInfo,
  getSalles, creerSalle, modifierSalle, supprimerSalle,
  getOffres, creerOffre, modifierOffre, supprimerOffre,
  getCandidatures, marquerCandidatureLue,
  getAvisAdmin, validerAvisClient, rejeterAvisClient,
  getEmployes, toggleLandingEmploye,
} from '../services/api'

const TABS = ['Informations', 'Équipe landing', 'Salles privées', 'Recrutement', 'Avis clients']

export default function GerantSettings() {
  const [tab, setTab] = useState(0)
  const [info, setInfo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Salles
  const [salles, setSalles] = useState([])
  const [showSalleForm, setShowSalleForm] = useState(false)
  const [salleForm, setSalleForm] = useState({ nom: '', description: '', capacite: '', prix_location: '', photo_url: '' })

  // Offres
  const [offres, setOffres] = useState([])
  const [candidatures, setCandidatures] = useState([])
  const [showOffreForm, setShowOffreForm] = useState(false)
  const [offreForm, setOffreForm] = useState({ titre: '', description: '', type_contrat: 'CDI' })

  // Avis
  const [avis, setAvis] = useState([])

  // Équipe
  const [employes, setEmployes] = useState([])

  useEffect(() => {
    getRestaurantInfo().then((r) => setInfo(r.data)).catch(() => {})
    getSalles().then((r) => setSalles(r.data))
    getOffres().then((r) => setOffres(r.data))
    getCandidatures().then((r) => setCandidatures(r.data))
    getAvisAdmin().then((r) => setAvis(r.data))
    getEmployes().then((r) => setEmployes(r.data)).catch(() => {})
  }, [])

  async function handleSaveInfo(e) {
    e.preventDefault()
    setSaving(true)
    await updateRestaurantInfo(info)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function setField(key, val) {
    setInfo((prev) => ({ ...prev, [key]: val }))
  }

  // Salles
  async function handleCreerSalle(e) {
    e.preventDefault()
    await creerSalle({ ...salleForm, capacite: parseInt(salleForm.capacite), prix_location: parseFloat(salleForm.prix_location) })
    const r = await getSalles()
    setSalles(r.data)
    setShowSalleForm(false)
    setSalleForm({ nom: '', description: '', capacite: '', prix_location: '', photo_url: '' })
  }

  async function handleToggleSalle(id, disponible) {
    await modifierSalle(id, { disponible: !disponible })
    const r = await getSalles()
    setSalles(r.data)
  }

  async function handleDeleteSalle(id) {
    if (!confirm('Supprimer cette salle ?')) return
    await supprimerSalle(id)
    setSalles((prev) => prev.filter((s) => s.id !== id))
  }

  // Offres
  async function handleCreerOffre(e) {
    e.preventDefault()
    await creerOffre(offreForm)
    const r = await getOffres()
    setOffres(r.data)
    setShowOffreForm(false)
    setOffreForm({ titre: '', description: '', type_contrat: 'CDI' })
  }

  async function handleToggleOffre(id, active) {
    await modifierOffre(id, { active: !active })
    const r = await getOffres()
    setOffres(r.data)
  }

  async function handleDeleteOffre(id) {
    if (!confirm('Supprimer cette offre ?')) return
    await supprimerOffre(id)
    setOffres((prev) => prev.filter((o) => o.id !== id))
  }

  // Équipe landing
  async function handleToggleLanding(id, actuel) {
    await toggleLandingEmploye(id, !actuel)
    const r = await getEmployes()
    setEmployes(r.data)
  }

  // Avis
  async function handleValiderAvis(id) {
    await validerAvisClient(id)
    const r = await getAvisAdmin()
    setAvis(r.data)
  }

  async function handleRejeterAvis(id) {
    await rejeterAvisClient(id)
    const r = await getAvisAdmin()
    setAvis(r.data)
  }

  if (!info) return <div className="p-8 text-gray-400 text-sm">Chargement…</div>

  return (
    <div>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres du restaurant</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${tab === i ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── TAB 0 : Informations ── */}
        {tab === 0 && (
          <form onSubmit={handleSaveInfo} className="space-y-8 max-w-3xl">

            {/* Infos générales */}
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Informations du restaurant</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nom du restaurant', key: 'nom' },
                  { label: 'Slogan', key: 'slogan' },
                  { label: 'Adresse', key: 'adresse' },
                  { label: 'Téléphone', key: 'telephone' },
                  { label: 'Email contact', key: 'email_contact' },
                  { label: 'Horaires', key: 'horaires' },
                  { label: 'Instagram (URL)', key: 'instagram_url' },
                  { label: 'Facebook (URL)', key: 'facebook_url' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input value={info[key] ?? ''} onChange={(e) => setField(key, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea rows={3} value={info.description ?? ''} onChange={(e) => setField('description', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none" />
                </div>
              </div>
            </div>

            {/* Sections actives */}
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Sections visibles sur la landing page</h2>
              <div className="space-y-3">
                {[
                  { key: 'section_menu', label: 'Menu public', desc: 'Afficher le menu par catégorie' },
                  { key: 'section_reservations', label: 'Réservations', desc: 'Formulaire de réservation en ligne' },
                  { key: 'section_tombola', label: 'Tombola', desc: 'Participation à la tombola active' },
                  { key: 'section_recrutement', label: 'Recrutement', desc: 'Afficher les offres d\'emploi' },
                  { key: 'section_avis', label: 'Avis clients', desc: 'Afficher les avis validés' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors ${info[key] ? 'bg-gray-900' : 'bg-gray-200'} relative`}
                      onClick={() => setField(key, !info[key])}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${info[key] ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={saving} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {saved && <p className="text-sm text-green-600 font-medium">✓ Enregistré !</p>}
            </div>
          </form>
        )}

        {/* ── TAB 1 : Équipe landing ── */}
        {tab === 1 && (
          <div className="max-w-2xl">
            <p className="text-sm text-gray-500 mb-5">Choisissez quels employés apparaissent sur la page d'accueil du restaurant.</p>
            <div className="space-y-3">
              {employes.map((e) => {
                const roleColor = e.role === 'gerant' ? 'bg-purple-100 text-purple-700' : e.role === 'cuisinier' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                const roleLabel = e.role === 'gerant' ? 'Gérant' : e.role === 'cuisinier' ? 'Cuisinier' : 'Serveur'
                return (
                  <div key={e.id} className={`flex items-center justify-between bg-white border rounded-xl px-5 py-4 ${!e.actif ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                        {e.prenom[0]}{e.nom[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{e.prenom} {e.nom}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-gray-500">{e.afficher_landing ? 'Visible' : 'Masqué'}</span>
                      <div className={`w-10 h-5 rounded-full transition-colors ${e.afficher_landing ? 'bg-gray-900' : 'bg-gray-200'} relative`}
                        onClick={() => handleToggleLanding(e.id, e.afficher_landing)}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${e.afficher_landing ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </label>
                  </div>
                )
              })}
              {employes.length === 0 && <p className="text-sm text-gray-400">Aucun employé.</p>}
            </div>
          </div>
        )}

        {/* ── TAB 2 : Salles privées ── */}
        {tab === 2 && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">Gérez vos salles privatisables (affichées sur la landing page si activé).</p>
              <button onClick={() => setShowSalleForm(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 shrink-0 ml-4">
                + Nouvelle salle
              </button>
            </div>

            <div className="space-y-4">
              {salles.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
                  {s.photo_url && (
                    <img src={s.photo_url} alt={s.nom} className="w-20 h-20 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{s.nom}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {s.disponible ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{s.description}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{s.capacite} pers. · {s.prix_location} €</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleToggleSalle(s.id, s.disponible)}
                      className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                      {s.disponible ? 'Désactiver' : 'Activer'}
                    </button>
                    <button onClick={() => handleDeleteSalle(s.id)}
                      className="text-xs border border-red-100 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              {salles.length === 0 && <p className="text-sm text-gray-400">Aucune salle privée configurée.</p>}
            </div>
          </div>
        )}

        {/* ── TAB 3 : Recrutement ── */}
        {tab === 3 && (
          <div className="max-w-3xl">
            <div className="flex gap-8">
              {/* Offres */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-800">Offres d'emploi</h2>
                  <button onClick={() => setShowOffreForm(true)} className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700">
                    + Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {offres.map((o) => (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{o.titre}</p>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{o.type_contrat}</span>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{o.description}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => handleToggleOffre(o.id, o.active)}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${o.active ? 'border-amber-200 text-amber-600' : 'border-green-200 text-green-600'}`}>
                            {o.active ? 'Archiver' : 'Réactiver'}
                          </button>
                          <button onClick={() => handleDeleteOffre(o.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-500">
                            Suppr.
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {offres.length === 0 && <p className="text-sm text-gray-400">Aucune offre active.</p>}
                </div>
              </div>

              {/* Candidatures */}
              <div className="w-72">
                <h2 className="text-base font-semibold text-gray-800 mb-4">
                  Candidatures
                  {candidatures.filter(c => !c.lue).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {candidatures.filter(c => !c.lue).length}
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {candidatures.map((c) => (
                    <div key={c.id} className={`border rounded-xl p-3 text-sm ${c.lue ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className="font-medium text-gray-900">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                      {c.offre_titre && <p className="text-xs text-blue-600 mt-0.5">Poste : {c.offre_titre}</p>}
                      {c.message && <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{c.message}"</p>}
                      {c.cv_url && (
                        <a href={`http://localhost:8000${c.cv_url}`} target="_blank" rel="noreferrer"
                          className="mt-1.5 inline-block text-xs text-green-600 hover:underline font-medium">
                          Télécharger le CV
                        </a>
                      )}
                      {!c.lue && (
                        <button onClick={() => marquerCandidatureLue(c.id).then(() => getCandidatures().then(r => setCandidatures(r.data)))}
                          className="mt-1.5 block text-xs text-blue-600 hover:underline">Marquer lue</button>
                      )}
                    </div>
                  ))}
                  {candidatures.length === 0 && <p className="text-xs text-gray-400">Aucune candidature.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4 : Avis clients ── */}
        {tab === 4 && (
          <div className="max-w-2xl space-y-3">
            <p className="text-sm text-gray-500 mb-4">Les avis négatifs (IA) sont automatiquement mis en attente.</p>
            {avis.map((a) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{a.nom}</p>
                      <span className="text-amber-400">{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                      {a.sentiment && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          a.sentiment === 'positif' ? 'bg-green-100 text-green-700' :
                          a.sentiment === 'negatif' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-500'}`}>
                          {a.sentiment}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.statut === 'valide' ? 'bg-green-100 text-green-700' :
                        a.statut === 'rejete' ? 'bg-gray-100 text-gray-400' :
                        'bg-amber-100 text-amber-700'}`}>
                        {a.statut}
                      </span>
                    </div>
                    {a.commentaire && <p className="text-sm text-gray-500 italic">"{a.commentaire}"</p>}
                  </div>
                  {a.statut === 'en_attente' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleValiderAvis(a.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">Valider</button>
                      <button onClick={() => handleRejeterAvis(a.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">Rejeter</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {avis.length === 0 && <p className="text-sm text-gray-400">Aucun avis reçu.</p>}
          </div>
        )}
      </div>

      {/* Modal nouvelle salle */}
      {showSalleForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreerSalle} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold">Nouvelle salle privée</h2>
            {[
              { label: 'Nom de la salle', key: 'nom' },
              { label: 'Description', key: 'description' },
              { label: 'Capacité (personnes)', key: 'capacite', type: 'number' },
              { label: 'Prix de location (€)', key: 'prix_location', type: 'number', step: '0.01' },
              { label: 'URL de la photo', key: 'photo_url' },
            ].map(({ label, key, ...props }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input required={key !== 'description' && key !== 'photo_url'} {...props}
                  value={salleForm[key]} onChange={(e) => setSalleForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSalleForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm">Créer</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal nouvelle offre */}
      {showOffreForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreerOffre} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold">Nouvelle offre d'emploi</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Titre du poste</label>
              <input required value={offreForm.titre} onChange={(e) => setOffreForm(f => ({ ...f, titre: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type de contrat</label>
              <select value={offreForm.type_contrat} onChange={(e) => setOffreForm(f => ({ ...f, type_contrat: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {['CDI', 'CDD', 'Stage', 'Temps partiel'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <textarea required rows={4} value={offreForm.description} onChange={(e) => setOffreForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOffreForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm">Publier</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
