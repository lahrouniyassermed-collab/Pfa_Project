import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenu, creerReservation, getAvisPublics, deposerAvis } from '../services/api'
import { ArrowRight, X, CheckCircle, Loader2 } from 'lucide-react'

const BACKEND = 'http://localhost:8000'

// Même logique que CommandeQR — image réelle d'abord, sinon fallback Unsplash
const IMG_SALADE  = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80'
const IMG_DESSERT = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80'
const IMG_TAJINE  = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80'
const IMG_ENTREE  = 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80'
const IMG_PLAT    = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'
const IMG_BOISSON = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80'

function getPlatImage(plat, catNom) {
  if (plat.image) {
    // image uploadée → préfixer avec l'URL backend
    return plat.image.startsWith('http') ? plat.image : `${BACKEND}${plat.image}`
  }
  const n = plat.nom.toLowerCase()
  const c = (catNom || '').toLowerCase()
  if (n.includes('salade') || n.includes('nicoise') || n.includes('niçoise')) return IMG_SALADE
  if (n.includes('tajine') || n.includes('tagine'))                            return IMG_TAJINE
  if (n.includes('moelleux') || n.includes('fondant') || n.includes('gâteau') || n.includes('tarte') || n.includes('glace') || c.includes('dessert')) return IMG_DESSERT
  if (c.includes('boisson') || n.includes('jus') || n.includes('café') || n.includes('thé') || n.includes('soda') || n.includes('eau')) return IMG_BOISSON
  if (c.includes('entrée') || c.includes('soupe'))                             return IMG_ENTREE
  return IMG_PLAT
}

// ── Design tokens (container-restaurant palette) ────────────────────────────
const C = {
  ink:    '#0E0E0E', carbon: '#1A1A1A', steel: '#2C2C2C',
  iron:   '#4A4A4A', smoke: '#8A8A8A',  fog:   '#BDBDBD',
  ash:    '#EFEFEF', canvas:'#F7F4EF',  white: '#FFFFFF',
  cedar:  '#A0714F', timber:'#C8966A',  bark:  '#5C3D24',
  moss:   '#5A6B47', leaf:  '#7A8F5F',
}
const display = "'Cormorant Garamond', serif"
const body    = "'DM Sans', sans-serif"
const mono    = "'JetBrains Mono', monospace"

const TIME_SLOTS = ['12:00','13:00','14:00','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']

// ── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate    = useNavigate()
  const [view, setView]           = useState('home')  // 'home' | 'menu'
  const [menuOpen, setMenuOpen]   = useState(false)   // modal réservation
  const [scrolled, setScrolled]   = useState(false)

  // Menu API
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab]   = useState(null)
  useEffect(() => {
    getMenu().then(r => {
      const cats = r.data.filter(c => c.plats.length > 0)
      setCategories(cats)
      if (cats.length > 0) setActiveTab(cats[0].id)
    }).catch(() => {})
  }, [])
  const currentPlats = categories.find(c => c.id === activeTab)?.plats || []

  // Scroll header
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Reservation modal state
  const [resaForm, setResaForm] = useState({ nom: '', telephone: '', date: '', heure: '19:30', personnes: '2', message: '' })
  const [resaLoading, setResaLoading] = useState(false)
  const [resaError, setResaError]     = useState('')
  const [resaCode, setResaCode]       = useState(null)

  const [avis, setAvis]               = useState([])
  const [avisForm, setAvisForm]       = useState({ nom: '', note: 5, commentaire: '' })
  const [avisLoading, setAvisLoading] = useState(false)
  const [avisSent, setAvisSent]       = useState(false)
  const [avisError, setAvisError]     = useState('')
  const [avisMessage, setAvisMessage] = useState('')

  useEffect(() => {
    getAvisPublics().then(r => setAvis(r.data)).catch(() => {})
  }, [])

  async function handleResa(e) {
    e.preventDefault()
    setResaError('')
    setResaLoading(true)
    try {
      const r = await creerReservation({
        nom_complet:  resaForm.nom,
        telephone:    resaForm.telephone,
        date:         resaForm.date,
        heure:        resaForm.heure,
        nb_personnes: parseInt(resaForm.personnes),
        message:      resaForm.message || null,
        zone:         'salle',
      })
      setResaCode(r.data.code || `RES-${Date.now().toString().slice(-6)}`)
    } catch (err) {
      const d = err.response?.data?.detail
      setResaError(typeof d === 'string' ? d : 'Erreur — vérifiez vos informations.')
    } finally {
      setResaLoading(false)
    }
  }

  function openModal()  { setMenuOpen(true);  setResaCode(null); setResaError('') }
  function closeModal() { setMenuOpen(false); setResaCode(null); setResaError(''); setResaForm({ nom: '', telephone: '', date: '', heure: '19:30', personnes: '2', message: '' }) }

  return (
    <div style={{ fontFamily: body, background: C.ink, color: C.white, minHeight: '100vh' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        background: scrolled ? 'rgba(14,14,14,0.98)' : 'rgba(14,14,14,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(255,255,255,0.07)`,
        transition: 'background 200ms ease',
      }}>
        <span
          onClick={() => { setView('home'); window.scrollTo(0,0) }}
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: C.white, letterSpacing: '0.12em', cursor: 'pointer', userSelect: 'none' }}
        >SKY07</span>

        <nav style={{ display: 'flex', gap: 32, listStyle: 'none' }}>
          {[
            { label: 'menu',        action: () => { setView('menu');  window.scrollTo(0,0) } },
            { label: 'réservation', action: () => navigate('/reservation') },
            { label: 'fidélité',    action: () => navigate('/client/login') },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
              color: C.smoke, transition: 'color 200ms',
              fontFamily: body,
            }}
              onMouseEnter={e => e.target.style.color = C.white}
              onMouseLeave={e => e.target.style.color = C.smoke}
            >{label}</button>
          ))}
        </nav>

        <button onClick={() => navigate('/reservation')} style={{
          padding: '8px 20px', background: C.cedar, color: C.white,
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', fontFamily: body,
          transition: 'background 200ms',
        }}
          onMouseEnter={e => e.target.style.background = C.timber}
          onMouseLeave={e => e.target.style.background = C.cedar}
        >Réserver</button>
      </header>

      {/* ── HOME VIEW ──────────────────────────────────────────────────────── */}
      {view === 'home' && (
        <>
          {/* HERO */}
          <div style={{ position: 'relative', height: '100vh', minHeight: 600, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: "url('/hero.webp')",
              backgroundSize: 'cover', backgroundPosition: 'center 30%',
              filter: 'brightness(0.48) saturate(0.8)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(14,14,14,0.92) 0%, rgba(14,14,14,0.04) 55%)',
            }} />
            <div style={{ position: 'relative', zIndex: 2, padding: '0 80px 80px', maxWidth: 700 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 16 }}>
                Casablanca · Ouvert tous les jours
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(16px,2vw,22px)', color: C.cedar, letterSpacing: '0.22em', marginBottom: 12 }}>SKY07</div>
              <h1 style={{ fontFamily: display, fontSize: 'clamp(52px,8vw,90px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-0.02em', color: C.white, marginBottom: 20, margin: '0 0 20px' }}>
                Bonne cuisine.<br /><em style={{ fontStyle: 'italic', color: C.timber }}>Bonne table.</em>
              </h1>
              <p style={{ fontSize: 18, color: C.fog, lineHeight: 1.6, marginBottom: 32, maxWidth: 460 }}>
                Votre expérience gastronomique au cœur de Casablanca. Une cuisine raffinée, une atmosphère unique, et un service pensé pour vous.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn primary onClick={() => navigate('/reservation')} icon={<ArrowRight size={16} />}>Réserver une table</Btn>
                <Btn onClick={() => { setView('menu'); window.scrollTo(0,0) }}>Voir le menu</Btn>
              </div>
            </div>
          </div>

          {/* STATS STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: C.carbon, borderBottom: `1px solid ${C.steel}` }}>
            {[
              { label: 'Horaires',       value: '12:00 – 23:00' },
              { label: 'Adresse',        value: 'Casablanca, Maroc' },
              { label: 'Capacité',       value: '80 couverts + terrasse' },
              { label: 'Cuisine ferme',  value: '22:00 chaque soir' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ padding: '28px 32px', borderRight: i < arr.length - 1 ? `1px solid ${C.steel}` : 'none' }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: display, fontSize: 22, color: C.white }}>{value}</div>
              </div>
            ))}
          </div>

          {/* ABOUT */}
          <section style={{ padding: '96px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 16 }}>À propos</div>
              <h2 style={{ fontFamily: display, fontSize: 52, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em', color: C.white, marginBottom: 24, margin: '0 0 24px' }}>
                SKY07 —<br />une expérience à part.
              </h2>
              <p style={{ fontSize: 16, color: C.fog, lineHeight: 1.65, maxWidth: 480, marginBottom: 28 }}>
                Bienvenue chez SKY07. Un espace pensé pour que chaque repas devienne un moment mémorable. Notre cuisine évolue avec les saisons, nos produits sont soigneusement sélectionnés, et notre équipe est là pour vous.
              </p>
              <Btn onClick={() => { setView('menu'); window.scrollTo(0,0) }}>Voir le menu →</Btn>
            </div>
            <div style={{ aspectRatio: '4/3', background: C.carbon, border: `1px solid ${C.steel}`, overflow: 'hidden' }}>
              <img src="/hero.webp" alt="Restaurant extérieur" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'brightness(0.7) saturate(0.85)' }} />
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${C.steel}` }} />

          {/* RESERVATION CTA */}
          <section style={{ padding: '96px 80px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 16 }}>Réservations</div>
            <h2 style={{ fontFamily: display, fontSize: 52, fontWeight: 400, lineHeight: 1.05, color: C.white, maxWidth: 560, margin: '0 auto 16px' }}>Prêt à nous rejoindre ?</h2>
            <p style={{ fontSize: 16, color: C.fog, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 32px' }}>
              Nous gardons quelques places sans réservation chaque soir, mais nous recommandons de réserver à l'avance — surtout pour la terrasse.
            </p>
            <Btn primary onClick={() => navigate('/reservation')} icon={<ArrowRight size={16} />}>Réserver une table</Btn>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${C.steel}` }} />

          {/* AVIS CLIENTS */}
          <section style={{ padding: '96px 80px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 16 }}>Avis clients</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'flex-start' }}>

              {/* Form */}
              <div>
                <h2 style={{ fontFamily: display, fontSize: 40, fontWeight: 400, color: C.white, marginBottom: 24, lineHeight: 1.1 }}>
                  Partagez votre expérience.
                </h2>
                {avisSent ? (
                  <div style={{ padding: '24px', background: C.carbon, border: `1px solid ${C.steel}`, borderRadius: 4 }}>
                    <div style={{ fontFamily: display, fontSize: 22, color: C.cedar, marginBottom: 8 }}>Merci pour votre avis !</div>
                    <p style={{ fontSize: 14, color: C.fog, lineHeight: 1.6 }}>{avisMessage || 'Votre avis a été pris en compte.'}</p>
                    <button onClick={() => { setAvisSent(false); setAvisForm({ nom: '', note: 5, commentaire: '' }) }}
                      style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.cedar, fontFamily: body, fontSize: 13 }}>
                      Laisser un autre avis →
                    </button>
                  </div>
                ) : (
                  <form onSubmit={async e => {
                    e.preventDefault(); setAvisError(''); setAvisLoading(true)
                    try {
                      const res = await deposerAvis(avisForm)
                      setAvisMessage(res.data.message || '')
                      setAvisSent(true)
                      getAvisPublics().then(r => setAvis(r.data)).catch(() => {})
                    } catch (err) {
                      setAvisError(err.response?.data?.detail || 'Une erreur est survenue.')
                    } finally { setAvisLoading(false) }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.smoke, marginBottom: 8 }}>Votre nom</label>
                      <input required value={avisForm.nom} onChange={e => setAvisForm(f => ({ ...f, nom: e.target.value }))}
                        placeholder="Yasser B." maxLength={60}
                        style={{ width: '100%', background: C.carbon, border: `1px solid ${C.steel}`, borderRadius: 3, padding: '12px 14px', color: C.white, fontFamily: body, fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = C.cedar}
                        onBlur={e => e.target.style.borderColor = C.steel} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.smoke, marginBottom: 8 }}>Note</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setAvisForm(f => ({ ...f, note: n }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, color: n <= avisForm.note ? C.cedar : C.steel, transition: 'color 150ms' }}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.smoke, marginBottom: 8 }}>Commentaire</label>
                      <textarea required value={avisForm.commentaire} onChange={e => setAvisForm(f => ({ ...f, commentaire: e.target.value }))}
                        placeholder="Un repas exceptionnel, une ambiance parfaite…" rows={4} maxLength={500}
                        style={{ width: '100%', background: C.carbon, border: `1px solid ${C.steel}`, borderRadius: 3, padding: '12px 14px', color: C.white, fontFamily: body, fontSize: 14, outline: 'none', resize: 'vertical' }}
                        onFocus={e => e.target.style.borderColor = C.cedar}
                        onBlur={e => e.target.style.borderColor = C.steel} />
                    </div>
                    {avisError && <div style={{ fontSize: 13, color: '#E57373', padding: '8px 12px', background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 3 }}>{avisError}</div>}
                    <button type="submit" disabled={avisLoading} style={{
                      padding: '13px 28px', background: C.cedar, color: C.white, border: 'none', borderRadius: 3,
                      fontFamily: body, fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', cursor: avisLoading ? 'not-allowed' : 'pointer', opacity: avisLoading ? 0.7 : 1,
                      alignSelf: 'flex-start',
                    }}>{avisLoading ? 'Envoi…' : 'Publier mon avis →'}</button>
                  </form>
                )}
              </div>

              {/* Reviews list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {avis.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ fontFamily: display, fontSize: 20, color: C.fog }}>Soyez le premier à laisser un avis.</div>
                  </div>
                ) : avis.slice(0, 5).map((av, i) => (
                  <div key={i} style={{ padding: '20px 24px', background: C.carbon, border: `1px solid ${C.steel}`, borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: display, fontSize: 18, color: C.white, marginBottom: 2 }}>{av.nom}</div>
                        <div style={{ fontSize: 16, color: C.cedar, letterSpacing: '0.05em' }}>{'★'.repeat(av.note)}{'☆'.repeat(5 - av.note)}</div>
                      </div>
                      <span style={{ fontSize: 11, color: C.smoke }}>{av.date_depot ? new Date(av.date_depot).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}</span>
                    </div>
                    <p style={{ fontSize: 14, color: C.fog, lineHeight: 1.6, margin: 0 }}>{av.commentaire}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <Footer onMenu={() => { setView('menu'); window.scrollTo(0,0) }} onResa={() => navigate('/reservation')} />
        </>
      )}

      {/* ── MENU VIEW ──────────────────────────────────────────────────────── */}
      {view === 'menu' && (
        <>
          <section style={{ padding: '120px 80px 96px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cedar, marginBottom: 16 }}>Menu</div>
            <h1 style={{ fontFamily: display, fontSize: 52, fontWeight: 400, lineHeight: 1.05, color: C.white, marginBottom: 16, margin: '0 0 16px' }}>Le menu du moment.</h1>
            <p style={{ fontSize: 16, color: C.fog, lineHeight: 1.65, maxWidth: 560, marginBottom: 40 }}>
              Notre cuisine travaille avec des producteurs locaux. Le menu évolue souvent — ce que vous voyez ci-dessous est à jour.
            </p>

            {/* Tabs */}
            {categories.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: display, fontSize: 24, color: C.fog, marginBottom: 12 }}>Menu en cours de chargement…</div>
                <p style={{ fontSize: 14, color: C.smoke }}>
                  Si rien n'apparaît, vérifiez que le serveur backend est démarré sur le port 8000.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 0, marginBottom: 48, borderBottom: `1px solid ${C.steel}` }}>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{
                      padding: '12px 24px', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
                      color: activeTab === cat.id ? C.white : C.smoke,
                      cursor: 'pointer', border: 'none', borderBottom: activeTab === cat.id ? `2px solid ${C.cedar}` : '2px solid transparent',
                      marginBottom: -1, background: 'none', fontFamily: body,
                      transition: 'color 200ms, border-color 200ms',
                    }}>{cat.nom}</button>
                  ))}
                </div>

                {/* Grid plats avec photos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {currentPlats.map(plat => {
                    const catNom = categories.find(c => c.id === activeTab)?.nom || ''
                    const imgSrc = getPlatImage(plat, catNom)
                    return (
                      <div key={plat.id}
                        style={{
                          background: C.carbon,
                          border: `1px solid ${C.steel}`,
                          borderRadius: 6,
                          overflow: 'hidden',
                          transition: 'transform 200ms, border-color 200ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = C.cedar }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = C.steel }}
                      >
                        {/* Photo */}
                        <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: C.steel }}>
                          <img
                            src={imgSrc}
                            alt={plat.nom}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 300ms' }}
                            onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                            onError={e => { e.target.src = IMG_PLAT }}
                          />
                          {/* Badges */}
                          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                            {plat.vegetarien && (
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(90,107,71,0.85)', color: '#B5D9A0', backdropFilter: 'blur(4px)' }}>
                                🌿 Végé
                              </span>
                            )}
                            {plat.sans_gluten && (
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(160,113,79,0.85)', color: '#F5DFC0', backdropFilter: 'blur(4px)' }}>
                                SG
                              </span>
                            )}
                          </div>
                          {/* Prix en overlay */}
                          <div style={{ position: 'absolute', bottom: 10, right: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: C.white, background: 'rgba(14,14,14,0.82)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 3, letterSpacing: '0.04em' }}>
                            {plat.prix} Dh
                          </div>
                        </div>

                        {/* Infos */}
                        <div style={{ padding: '16px 18px' }}>
                          <div style={{ fontFamily: display, fontSize: 20, fontWeight: 400, color: C.white, lineHeight: 1.2, marginBottom: 6 }}>
                            {plat.nom}
                          </div>
                          {plat.description && (
                            <div style={{ fontSize: 12, color: C.smoke, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {plat.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <Footer onMenu={() => { setView('menu'); window.scrollTo(0,0) }} onResa={() => navigate('/reservation')} />
        </>
      )}

      {/* ── MODAL RÉSERVATION ───────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={e => e.target === e.currentTarget && closeModal()}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(14,14,14,0.87)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            background: C.carbon, border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 4, width: '100%', maxWidth: 520, padding: 40, position: 'relative',
          }}>
            <button onClick={closeModal} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', color: C.smoke, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={20} /></button>

            {resaCode ? (
              /* Confirmation */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} style={{ color: C.leaf, margin: '0 auto 16px' }} />
                <h2 style={{ fontFamily: display, fontSize: 32, fontWeight: 400, color: C.white, marginBottom: 8 }}>Réservation confirmée</h2>
                <p style={{ fontSize: 14, color: C.fog, marginBottom: 20 }}>Nous vous contacterons pour confirmer votre réservation.</p>
                {resaCode && (
                  <div style={{ fontFamily: mono, fontSize: 18, color: C.cedar, marginBottom: 12, letterSpacing: '0.1em' }}>{resaCode}</div>
                )}
                <button onClick={closeModal} style={{ fontSize: 13, color: C.smoke, background: 'none', border: 'none', cursor: 'pointer', fontFamily: body, marginTop: 8 }}>Fermer</button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 style={{ fontFamily: display, fontSize: 32, fontWeight: 400, color: C.white, marginBottom: 8 }}>Réserver une table</h2>
                <p style={{ fontSize: 14, color: C.smoke, marginBottom: 28 }}>Nous confirmerons votre réservation sous 24h.</p>

                <form onSubmit={handleResa} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Nom complet">
                      <input required value={resaForm.nom} placeholder="Votre nom"
                        onChange={e => setResaForm(f => ({ ...f, nom: e.target.value }))} />
                    </Field>
                    <Field label="Téléphone">
                      <input required value={resaForm.telephone} placeholder="+212 6…"
                        onChange={e => setResaForm(f => ({ ...f, telephone: e.target.value }))} />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <Field label="Date">
                      <input required type="date" value={resaForm.date} min={new Date().toISOString().split('T')[0]}
                        onChange={e => setResaForm(f => ({ ...f, date: e.target.value }))} />
                    </Field>
                    <Field label="Heure">
                      <select value={resaForm.heure} onChange={e => setResaForm(f => ({ ...f, heure: e.target.value }))}>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Personnes">
                      <select value={resaForm.personnes} onChange={e => setResaForm(f => ({ ...f, personnes: e.target.value }))}>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                        <option value="9">9+</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Demandes particulières (optionnel)">
                    <textarea rows={2} value={resaForm.message} placeholder="Allergies, occasion spéciale…"
                      onChange={e => setResaForm(f => ({ ...f, message: e.target.value }))} />
                  </Field>

                  {resaError && (
                    <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '10px 14px' }}>{resaError}</div>
                  )}

                  <Btn primary type="submit" disabled={resaLoading} icon={resaLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                    {resaLoading ? 'Envoi…' : 'Confirmer la réservation'}
                  </Btn>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input, select, textarea {
          background: ${C.steel}; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 2px; color: ${C.white}; font-family: ${body};
          font-size: 14px; padding: 11px 14px; outline: none; width: 100%;
          transition: border-color 200ms;
        }
        input::placeholder, textarea::placeholder { color: ${C.iron}; }
        input:focus, select:focus, textarea:focus { border-color: ${C.cedar}; box-shadow: 0 0 0 2px rgba(160,113,79,0.2); }
        select { appearance: none; cursor: pointer; }
        textarea { resize: none; }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Btn({ children, primary, onClick, icon, type = 'button', disabled, style: extraStyle }) {
  const [hov, setHov] = useState(false)
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 28px', borderRadius: 4, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14, fontWeight: 500, letterSpacing: '0.04em',
    fontFamily: "'DM Sans', sans-serif", transition: 'background 200ms, border-color 200ms',
    opacity: disabled ? 0.6 : 1,
    ...extraStyle,
  }
  if (primary) return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, background: hov ? '#C8966A' : '#A0714F', color: '#FFFFFF' }}>
      {children}{icon}
    </button>
  )
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, background: 'transparent', color: '#FFFFFF', border: `1px solid ${hov ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}` }}>
      {children}{icon}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A4A4A' }}>{label}</label>
      {children}
    </div>
  )
}

function Footer({ onMenu, onResa }) {
  return (
    <footer style={{ borderTop: '1px solid #2C2C2C' }}>
      <div style={{
        padding: '48px 80px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#FFFFFF', letterSpacing: '0.14em' }}>SKY07</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'menu',        action: onMenu },
            { label: 'réservation', action: onResa },
            { label: 'instagram',   action: () => {} },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{
              background: 'none', border: 'none', fontSize: 12, letterSpacing: '0.08em',
              color: '#4A4A4A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'color 200ms',
            }}
              onMouseEnter={e => e.target.style.color = '#BDBDBD'}
              onMouseLeave={e => e.target.style.color = '#4A4A4A'}
            >{label}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#4A4A4A', letterSpacing: '0.04em' }}>© 2026 SKY07</span>
      </div>
      <div style={{
        padding: '12px 80px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#3A3A3A', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
          Développé par <span style={{ color: '#5A5A5A' }}>Yasser Lahrouni</span>
        </span>
      </div>
    </footer>
  )
}
