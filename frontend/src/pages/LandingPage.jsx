import { useEffect, useState } from 'react'
import { getLanding, getMenu, creerReservation, deposerAvis, postuler } from '../services/api'

// ── Configs des thèmes ────────────────────────────────────────
const THEMES = {
  elegant: {
    bg: 'bg-white',
    heroBg: 'bg-gray-900',
    heroText: 'text-white',
    navBg: 'bg-white border-b border-gray-100',
    navText: 'text-gray-800',
    sectionBg: 'bg-white',
    sectionAltBg: 'bg-gray-50',
    cardBg: 'bg-white border border-gray-200',
    heading: 'text-gray-900 font-serif',
    subtext: 'text-gray-500',
    btnPrimary: 'bg-gray-900 text-white hover:bg-gray-700',
    btnOutline: 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
    input: 'border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300',
    badge: 'bg-gray-100 text-gray-700',
    star: 'text-gray-400',
  },
  chaud: {
    bg: 'bg-amber-50',
    heroBg: 'bg-amber-900',
    heroText: 'text-amber-50',
    navBg: 'bg-amber-800',
    navText: 'text-amber-50',
    sectionBg: 'bg-amber-50',
    sectionAltBg: 'bg-amber-100',
    cardBg: 'bg-white border border-amber-200',
    heading: 'text-amber-900 font-serif',
    subtext: 'text-amber-700',
    btnPrimary: 'bg-amber-700 text-white hover:bg-amber-800',
    btnOutline: 'border border-amber-700 text-amber-700 hover:bg-amber-700 hover:text-white',
    input: 'border border-amber-200 rounded-lg focus:ring-1 focus:ring-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    star: 'text-amber-400',
  },
  moderne: {
    bg: 'bg-slate-950',
    heroBg: 'bg-gradient-to-br from-violet-900 to-slate-900',
    heroText: 'text-white',
    navBg: 'bg-slate-900 border-b border-slate-800',
    navText: 'text-slate-100',
    sectionBg: 'bg-slate-950',
    sectionAltBg: 'bg-slate-900',
    cardBg: 'bg-slate-800 border border-slate-700',
    heading: 'text-white font-sans',
    subtext: 'text-slate-400',
    btnPrimary: 'bg-violet-600 text-white hover:bg-violet-700',
    btnOutline: 'border border-violet-500 text-violet-400 hover:bg-violet-600 hover:text-white',
    input: 'border border-slate-600 bg-slate-800 text-white rounded-lg focus:ring-1 focus:ring-violet-500',
    badge: 'bg-violet-900 text-violet-300',
    star: 'text-violet-400',
  },
}

export default function LandingPage() {
  const [data, setData] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaires
  const [resaForm, setResaForm] = useState({ nom_client: '', telephone: '', date_heure: '', nb_personnes: 2, type: 'standard' })
  const [resaSent, setResaSent] = useState(false)
  const [avisForm, setAvisForm] = useState({ nom: '', note: 5, commentaire: '' })
  const [avisSent, setAvisSent] = useState(false)
  const [candidatureForm, setCandidatureForm] = useState({ nom: '', prenom: '', email: '', telephone: '', message: '' })
  const [candidatureSent, setCandidatureSent] = useState(null)
  const [activeOffre, setActiveOffre] = useState(null)

  useEffect(() => {
    Promise.all([getLanding(), getMenu()])
      .then(([l, m]) => {
        setData(l.data)
        setMenu(m.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const theme = data ? (THEMES[data.info?.theme] ?? THEMES.elegant) : THEMES.elegant
  const info = data?.info ?? {}
  const couleur = info.couleur_principale ?? '#111827'

  async function handleResa(e) {
    e.preventDefault()
    await creerReservation(resaForm)
    setResaSent(true)
  }

  async function handleAvis(e) {
    e.preventDefault()
    await deposerAvis(avisForm)
    setAvisSent(true)
  }

  async function handleCandidature(e) {
    e.preventDefault()
    await postuler(activeOffre, candidatureForm)
    setCandidatureSent(activeOffre)
    setActiveOffre(null)
    setCandidatureForm({ nom: '', prenom: '', email: '', telephone: '', message: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-sm">Chargement…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Restaurant non configuré.</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme.bg}`}>

      {/* ── NAV ── */}
      <nav className={`sticky top-0 z-40 ${theme.navBg}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className={`text-xl font-bold ${theme.navText}`}>{info.nom}</p>
          <div className="hidden sm:flex items-center gap-6">
            {info.section_menu && <NavLink href="#menu" label="Menu" theme={theme} />}
            {info.section_reservations && <NavLink href="#reservation" label="Réserver" theme={theme} />}
            {info.section_tombola && <NavLink href="#tombola" label="Tombola" theme={theme} />}
            {info.section_recrutement && <NavLink href="#recrutement" label="Emplois" theme={theme} />}
            {info.section_avis && <NavLink href="#avis" label="Avis" theme={theme} />}
          </div>
          {info.telephone && (
            <a href={`tel:${info.telephone}`}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${theme.btnPrimary}`}
              style={{ backgroundColor: couleur }}>
              📞 Appeler
            </a>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={`${theme.heroBg} py-24 px-6`}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className={`text-5xl font-bold mb-4 ${theme.heroText}`}>{info.nom}</h1>
          {info.slogan && <p className={`text-xl mb-8 opacity-80 ${theme.heroText}`}>{info.slogan}</p>}
          {info.description && <p className={`text-base mb-10 opacity-70 max-w-xl mx-auto ${theme.heroText}`}>{info.description}</p>}
          <div className="flex gap-4 justify-center flex-wrap">
            {info.section_menu && (
              <a href="#menu" className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${theme.btnPrimary}`} style={{ backgroundColor: couleur }}>
                Voir le menu
              </a>
            )}
            {info.section_reservations && (
              <a href="#reservation" className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${theme.btnOutline}`}>
                Réserver une table
              </a>
            )}
          </div>
          {/* Infos rapides */}
          <div className={`flex gap-6 justify-center mt-12 flex-wrap text-sm opacity-70 ${theme.heroText}`}>
            {info.adresse && <span>📍 {info.adresse}</span>}
            {info.horaires && <span>🕐 {info.horaires}</span>}
            {info.telephone && <span>📞 {info.telephone}</span>}
          </div>
        </div>
      </section>

      {/* ── MENU ── */}
      {info.section_menu && (
        <section id="menu" className={`py-20 px-6 ${theme.sectionBg}`}>
          <div className="max-w-5xl mx-auto">
            <SectionTitle title="Notre Menu" theme={theme} couleur={couleur} />
            {menu.map((cat) => (
              <div key={cat.id} className="mb-10">
                <h3 className={`text-lg font-semibold mb-4 ${theme.subtext} uppercase tracking-wide`}>{cat.nom}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.plats?.filter(p => p.disponible).map((plat) => (
                    <div key={plat.id} className={`rounded-xl p-4 ${theme.cardBg}`}>
                      {plat.image && <img src={plat.image} alt={plat.nom} className="w-full h-32 object-cover rounded-lg mb-3" />}
                      <p className={`font-semibold ${theme.heading}`}>{plat.nom}</p>
                      {plat.description && <p className={`text-xs mt-1 line-clamp-2 ${theme.subtext}`}>{plat.description}</p>}
                      <p className={`text-base font-bold mt-2`} style={{ color: couleur }}>{plat.prix} €</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SALLES PRIVÉES ── */}
      {data.salles_privees?.length > 0 && (
        <section className={`py-20 px-6 ${theme.sectionAltBg}`}>
          <div className="max-w-5xl mx-auto">
            <SectionTitle title="Salles Privatisables" theme={theme} couleur={couleur} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.salles_privees.map((salle) => (
                <div key={salle.id} className={`rounded-xl overflow-hidden ${theme.cardBg}`}>
                  {salle.photo_url && <img src={salle.photo_url} alt={salle.nom} className="w-full h-40 object-cover" />}
                  <div className="p-4">
                    <p className={`font-bold text-lg ${theme.heading}`}>{salle.nom}</p>
                    <p className={`text-sm mt-1 ${theme.subtext}`}>{salle.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-sm ${theme.subtext}`}>👥 {salle.capacite} pers.</span>
                      <span className="font-bold text-base" style={{ color: couleur }}>{salle.prix_location} €</span>
                    </div>
                    {info.section_reservations && (
                      <a href="#reservation" onClick={() => setResaForm(f => ({ ...f, type: 'local_prive' }))}
                        className={`mt-3 block text-center text-sm py-2 rounded-lg transition-colors ${theme.btnPrimary}`} style={{ backgroundColor: couleur }}>
                        Réserver cette salle
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RÉSERVATION ── */}
      {info.section_reservations && (
        <section id="reservation" className={`py-20 px-6 ${theme.sectionBg}`}>
          <div className="max-w-lg mx-auto">
            <SectionTitle title="Réserver une table" theme={theme} couleur={couleur} />
            {resaSent ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">✓</p>
                <p className={`text-lg font-semibold ${theme.heading}`}>Demande envoyée !</p>
                <p className={`text-sm mt-2 ${theme.subtext}`}>Le restaurant vous contactera pour confirmer.</p>
              </div>
            ) : (
              <form onSubmit={handleResa} className={`rounded-2xl p-6 space-y-4 ${theme.cardBg}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-xs mb-1 ${theme.subtext}`}>Votre nom</label>
                    <input required value={resaForm.nom_client}
                      onChange={e => setResaForm(f => ({ ...f, nom_client: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${theme.subtext}`}>Téléphone</label>
                    <input required value={resaForm.telephone}
                      onChange={e => setResaForm(f => ({ ...f, telephone: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${theme.subtext}`}>Nombre de personnes</label>
                    <input required type="number" min="1" value={resaForm.nb_personnes}
                      onChange={e => setResaForm(f => ({ ...f, nb_personnes: parseInt(e.target.value) }))}
                      className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-xs mb-1 ${theme.subtext}`}>Date et heure</label>
                    <input required type="datetime-local" value={resaForm.date_heure}
                      onChange={e => setResaForm(f => ({ ...f, date_heure: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-xs mb-1 ${theme.subtext}`}>Type de réservation</label>
                    <select value={resaForm.type} onChange={e => setResaForm(f => ({ ...f, type: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`}>
                      <option value="standard">Table standard</option>
                      {data.salles_privees?.length > 0 && <option value="local_prive">Salle privée</option>}
                    </select>
                  </div>
                  {resaForm.type === 'local_prive' && (
                    <div className={`col-span-2 rounded-lg p-3 text-sm ${theme.badge}`}>
                      <p className="font-medium mb-1">Salle privée — Paiement</p>
                      <p className="text-xs opacity-80">• Paiement en ligne → confirmation automatique</p>
                      <p className="text-xs opacity-80">• Paiement sur place → appelez-nous au {info.telephone}</p>
                    </div>
                  )}
                </div>
                <button type="submit"
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${theme.btnPrimary}`}
                  style={{ backgroundColor: couleur }}>
                  Envoyer la demande
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* ── AVIS CLIENTS ── */}
      {info.section_avis && (
        <section id="avis" className={`py-20 px-6 ${theme.sectionAltBg}`}>
          <div className="max-w-4xl mx-auto">
            <SectionTitle title="Avis clients" theme={theme} couleur={couleur} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {data.avis_clients?.map((a) => (
                <div key={a.id} className={`rounded-xl p-4 ${theme.cardBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`font-semibold text-sm ${theme.heading}`}>{a.nom}</p>
                    <span className={theme.star}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                  </div>
                  {a.commentaire && <p className={`text-sm italic ${theme.subtext}`}>"{a.commentaire}"</p>}
                </div>
              ))}
              {(!data.avis_clients || data.avis_clients.length === 0) && (
                <p className={`text-sm col-span-3 ${theme.subtext}`}>Soyez le premier à laisser un avis !</p>
              )}
            </div>
            {/* Formulaire avis */}
            {avisSent ? (
              <p className={`text-sm text-center ${theme.subtext}`}>✓ Merci pour votre avis ! Il sera publié après validation.</p>
            ) : (
              <form onSubmit={handleAvis} className={`max-w-md mx-auto rounded-2xl p-5 space-y-3 ${theme.cardBg}`}>
                <p className={`font-semibold ${theme.heading}`}>Laisser un avis</p>
                <div>
                  <label className={`block text-xs mb-1 ${theme.subtext}`}>Votre nom</label>
                  <input required value={avisForm.nom} onChange={e => setAvisForm(f => ({ ...f, nom: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm focus:outline-none ${theme.input}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme.subtext}`}>Note</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setAvisForm(f => ({ ...f, note: n }))}
                        className={`text-2xl transition-transform hover:scale-110 ${n <= avisForm.note ? theme.star : 'text-gray-300'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme.subtext}`}>Commentaire</label>
                  <textarea rows={2} value={avisForm.commentaire} onChange={e => setAvisForm(f => ({ ...f, commentaire: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm focus:outline-none resize-none ${theme.input}`} />
                </div>
                <button type="submit" className={`w-full py-2.5 rounded-xl font-medium text-sm ${theme.btnPrimary}`} style={{ backgroundColor: couleur }}>
                  Publier l'avis
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* ── RECRUTEMENT ── */}
      {info.section_recrutement && data.offres_emploi?.length > 0 && (
        <section id="recrutement" className={`py-20 px-6 ${theme.sectionBg}`}>
          <div className="max-w-3xl mx-auto">
            <SectionTitle title="Rejoignez notre équipe" theme={theme} couleur={couleur} />
            <div className="space-y-4">
              {data.offres_emploi.map((offre) => (
                <div key={offre.id} className={`rounded-xl p-5 ${theme.cardBg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-bold text-lg ${theme.heading}`}>{offre.titre}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${theme.badge} mr-2`}>{offre.type_contrat}</span>
                      <p className={`text-sm mt-2 ${theme.subtext}`}>{offre.description}</p>
                      {candidatureSent === offre.id && (
                        <p className="text-green-500 text-sm mt-2 font-medium">✓ Candidature envoyée !</p>
                      )}
                    </div>
                    <button onClick={() => setActiveOffre(offre.id)}
                      className={`shrink-0 text-sm px-4 py-2 rounded-xl font-medium transition-all ${theme.btnPrimary}`} style={{ backgroundColor: couleur }}>
                      Postuler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className={`py-10 px-6 ${theme.heroBg}`}>
        <div className={`max-w-4xl mx-auto text-center ${theme.heroText}`}>
          <p className="font-bold text-lg mb-2">{info.nom}</p>
          <div className={`flex gap-6 justify-center flex-wrap text-sm opacity-70`}>
            {info.adresse && <span>{info.adresse}</span>}
            {info.telephone && <span>{info.telephone}</span>}
            {info.email_contact && <span>{info.email_contact}</span>}
          </div>
          {(info.instagram_url || info.facebook_url) && (
            <div className="flex gap-4 justify-center mt-4">
              {info.instagram_url && <a href={info.instagram_url} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 text-sm">Instagram</a>}
              {info.facebook_url && <a href={info.facebook_url} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 text-sm">Facebook</a>}
            </div>
          )}
          <p className="text-xs opacity-40 mt-6">Propulsé par MangerManger</p>
        </div>
      </footer>

      {/* ── Modal candidature ── */}
      {activeOffre && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCandidature} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Postuler</h2>
            {[
              { label: 'Prénom', key: 'prenom' },
              { label: 'Nom', key: 'nom' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Téléphone', key: 'telephone' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input required={key !== 'telephone'} type={type} value={candidatureForm[key]}
                  onChange={e => setCandidatureForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Message de motivation</label>
              <textarea rows={3} value={candidatureForm.message} onChange={e => setCandidatureForm(f => ({ ...f, message: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setActiveOffre(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium">Envoyer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function NavLink({ href, label, theme }) {
  return (
    <a href={href} className={`text-sm font-medium opacity-80 hover:opacity-100 transition-opacity ${theme.navText}`}>
      {label}
    </a>
  )
}

function SectionTitle({ title, theme, couleur }) {
  return (
    <div className="text-center mb-10">
      <h2 className={`text-3xl font-bold ${theme.heading}`}>{title}</h2>
      <div className="w-12 h-1 mx-auto mt-3 rounded-full" style={{ backgroundColor: couleur }} />
    </div>
  )
}
