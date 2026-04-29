import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FloorPlan from '../components/landing/FloorPlan'
import { categories, plats, avisClients, offresEmploi } from '../data/mockData'
import {
  UtensilsCrossed, Star, MapPin, Phone, Clock,
  MessageCircle, ChevronDown, Users, CalendarCheck, Send,
  Briefcase, Trophy, ChevronRight, Menu, X, ExternalLink
} from 'lucide-react'

const NAV_LINKS = [
  { href: '#menu',        label: 'Menu' },
  { href: '#reservation', label: 'Réserver' },
  { href: '#avis',        label: 'Avis' },
  { href: '#emplois',     label: 'Carrières' },
  { href: '#fidelite',    label: 'Fidélité' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [activeCat, setActiveCat] = useState(categories[0]?.id)
  const [resaForm, setResaForm] = useState({ nom: '', telephone: '', date: '', heure: '', personnes: 2 })
  const [resaSent, setResaSent] = useState(false)
  const [activeOffre, setActiveOffre] = useState(null)
  const [candidatureForm, setCandidatureForm] = useState({ prenom: '', nom: '', email: '', message: '' })
  const [candidatureSent, setCandidatureSent] = useState(false)

  const filteredPlats = plats.filter(p => p.categorie_id === activeCat && p.disponible)

  function handleResa(e) {
    e.preventDefault()
    setResaSent(true)
  }

  function handleCandidature(e) {
    e.preventDefault()
    setCandidatureSent(true)
    setActiveOffre(null)
  }

  return (
    <div className="min-h-screen bg-[#0a1408] text-[#f5f0e8]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(10,20,8,0.92)] backdrop-blur-md border-b border-[rgba(232,130,74,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="text-2xl font-bold text-[#e8824a]"
            style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 24px rgba(232,130,74,0.4)' }}>
            SKY07
          </a>
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#e8824a] transition-colors font-medium">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <a href="tel:+212600000000"
              className="flex items-center gap-1.5 text-sm text-[rgba(245,240,232,0.55)] hover:text-[#f5f0e8] transition-colors">
              <Phone size={13} /> +212 6 00 00 00
            </a>
            <button onClick={() => navigate('/qr')}
              className="bg-[#e8824a] text-black text-sm font-semibold px-4 py-2 rounded-[8px] hover:bg-[#d4703a] transition-colors"
              style={{ boxShadow: '0 4px 14px rgba(232,130,74,0.35)' }}>
              Commander
            </button>
          </div>
          <button className="md:hidden text-[#f5f0e8]" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-[#0d1b0b] border-t border-[rgba(232,130,74,0.08)] px-6 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block text-sm text-[rgba(245,240,232,0.7)] hover:text-[#e8824a] py-1 transition-colors">
                {l.label}
              </a>
            ))}
            <button onClick={() => navigate('/qr')}
              className="w-full mt-2 bg-[#e8824a] text-black text-sm font-semibold px-4 py-2.5 rounded-[8px]">
              Commander
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(232,130,74,0.08) 0%, transparent 60%), linear-gradient(180deg, #0a1408 0%, #0d1b0b 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(232,130,74,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e8824a] mb-5 opacity-80">
          Restaurant Gastronomique Marocain
        </p>
        <h1 className="text-[clamp(64px,12vw,110px)] font-black leading-none text-white mb-6"
          style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 60px rgba(232,130,74,0.25)' }}>
          SKY07
        </h1>
        <p className="text-lg text-[rgba(245,240,232,0.55)] max-w-md mb-10 leading-relaxed">
          Une cuisine marocaine raffinée, des saveurs authentiques et une ambiance unique au cœur de Casablanca.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href="#menu"
            className="flex items-center gap-2 bg-[#e8824a] text-black font-semibold px-7 py-3.5 rounded-[10px] text-sm transition-all hover:bg-[#d4703a] hover:scale-105"
            style={{ boxShadow: '0 6px 24px rgba(232,130,74,0.4)' }}>
            <UtensilsCrossed size={16} /> Voir le menu
          </a>
          <a href="#reservation"
            className="flex items-center gap-2 border border-[rgba(232,130,74,0.4)] text-[#e8824a] font-semibold px-7 py-3.5 rounded-[10px] text-sm transition-all hover:border-[#e8824a] hover:bg-[rgba(232,130,74,0.07)]">
            <CalendarCheck size={16} /> Réserver une table
          </a>
        </div>

        {/* Infos rapides */}
        <div className="flex flex-wrap gap-6 justify-center mt-16 text-xs text-[rgba(245,240,232,0.38)]">
          <span className="flex items-center gap-1.5"><MapPin size={12} /> Casablanca, Maroc</span>
          <span className="flex items-center gap-1.5"><Clock size={12} /> Lun – Dim · 12h00 – 23h30</span>
          <span className="flex items-center gap-1.5"><Phone size={12} /> +212 6 00 00 00 00</span>
        </div>

        <a href="#menu" className="absolute bottom-10 animate-bounce text-[rgba(232,130,74,0.4)] hover:text-[#e8824a] transition-colors">
          <ChevronDown size={28} />
        </a>
      </section>

      {/* ── MENU ── */}
      <section id="menu" className="py-24 px-6 bg-[#0d1b0b]">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="Notre Menu" sub="Des recettes transmises de génération en génération" />

          {/* Onglets catégories */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCat === cat.id
                    ? 'bg-[#e8824a] text-black shadow-lg'
                    : 'bg-[rgba(255,255,255,0.05)] text-[rgba(245,240,232,0.6)] hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.07)]'
                }`}>
                {cat.nom}
              </button>
            ))}
          </div>

          {/* Grille plats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPlats.map(plat => (
              <div key={plat.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[16px] overflow-hidden hover:border-[rgba(232,130,74,0.25)] transition-all group">
                {plat.image && (
                  <div className="h-44 overflow-hidden">
                    <img src={plat.image} alt={plat.nom}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-[#f5f0e8] text-sm leading-snug">{plat.nom}</h4>
                  {plat.description && (
                    <p className="text-xs text-[rgba(245,240,232,0.45)] mt-1.5 line-clamp-2 leading-relaxed">
                      {plat.description}
                    </p>
                  )}
                  <p className="text-[#e8824a] font-bold text-base mt-3">{plat.prix} MAD</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button onClick={() => navigate('/qr')}
              className="inline-flex items-center gap-2 bg-[rgba(232,130,74,0.12)] border border-[rgba(232,130,74,0.3)] text-[#e8824a] font-semibold px-7 py-3 rounded-[10px] text-sm hover:bg-[rgba(232,130,74,0.2)] transition-all">
              <UtensilsCrossed size={15} /> Commander depuis votre table
            </button>
          </div>
        </div>
      </section>

      {/* ── RÉSERVATION ── */}
      <section id="reservation" className="py-24 px-6"
        style={{ background: 'linear-gradient(180deg, #0a1408 0%, #0d1b0b 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="Réserver une table" sub="Choisissez votre emplacement sur le plan interactif" />

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Plan interactif */}
            <div>
              <p className="text-xs text-[rgba(245,240,232,0.4)] mb-3 text-center tracking-wide uppercase">
                Cliquez sur une table disponible
              </p>
              <FloorPlan
                selectedTableId={selectedTable?.id ?? null}
                onTableClick={(table) => {
                  setSelectedTable(table)
                  if (table) setResaForm(f => ({ ...f, personnes: table.capacite }))
                }}
              />
              {selectedTable && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[#e8824a]">
                  <MapPin size={14} />
                  Table {selectedTable.numero} · {selectedTable.capacite} pers. · {selectedTable.emplacement}
                </div>
              )}
            </div>

            {/* Formulaire */}
            <div>
              {resaSent ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center mb-4">
                    <CalendarCheck size={28} className="text-[#22c55e]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Demande envoyée !</h3>
                  <p className="text-[rgba(245,240,232,0.5)] text-sm">Nous vous contacterons sous 24h pour confirmer.</p>
                  <button onClick={() => setResaSent(false)}
                    className="mt-6 text-sm text-[rgba(245,240,232,0.4)] hover:text-[#f5f0e8] transition-colors">
                    Nouvelle réservation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResa}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-6 space-y-4">
                  <h3 className="text-lg font-bold mb-2">Informations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">
                        Nom complet
                      </label>
                      <input required value={resaForm.nom} placeholder="Votre nom"
                        onChange={e => setResaForm(f => ({ ...f, nom: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">
                        Téléphone
                      </label>
                      <input required value={resaForm.telephone} placeholder="+212 6…"
                        onChange={e => setResaForm(f => ({ ...f, telephone: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">
                        Personnes
                      </label>
                      <input required type="number" min="1" max="20" value={resaForm.personnes}
                        onChange={e => setResaForm(f => ({ ...f, personnes: parseInt(e.target.value) }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">
                        Date
                      </label>
                      <input required type="date" value={resaForm.date}
                        onChange={e => setResaForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">
                        Heure
                      </label>
                      <input required type="time" value={resaForm.heure}
                        onChange={e => setResaForm(f => ({ ...f, heure: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                  </div>
                  {selectedTable && (
                    <div className="flex items-center gap-2 bg-[rgba(232,130,74,0.1)] border border-[rgba(232,130,74,0.25)] rounded-[8px] px-3 py-2.5 text-sm text-[#e8824a]">
                      <MapPin size={13} />
                      Table {selectedTable.numero} — {selectedTable.emplacement} sélectionnée
                    </div>
                  )}
                  <button type="submit"
                    className="w-full bg-[#e8824a] text-black font-bold py-3.5 rounded-[10px] text-sm transition-all hover:bg-[#d4703a] flex items-center justify-center gap-2 mt-2"
                    style={{ boxShadow: '0 4px 16px rgba(232,130,74,0.35)' }}>
                    <Send size={15} /> Envoyer la demande
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── AVIS CLIENTS ── */}
      <section id="avis" className="py-24 px-6 bg-[#0d1b0b]">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="Ce que disent nos clients" sub="Des expériences authentiques partagées avec vous" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {avisClients.map(avis => (
              <div key={avis.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[16px] p-6 hover:border-[rgba(232,130,74,0.2)] transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: avis.couleur }}>
                    {avis.initiales}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#f5f0e8]">{avis.nom}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} className={i < avis.note ? 'text-[#e8824a] fill-[#e8824a]' : 'text-[rgba(245,240,232,0.2)]'} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[rgba(245,240,232,0.6)] text-sm italic leading-relaxed">"{avis.commentaire}"</p>
                <p className="text-[rgba(245,240,232,0.25)] text-xs mt-3">{avis.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARRIÈRES ── */}
      <section id="emplois" className="py-24 px-6"
        style={{ background: 'linear-gradient(180deg, #0a1408 0%, #0d1b0b 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <SectionTitle title="Rejoignez notre équipe" sub="Nous recrutons des passionnés de gastronomie" />
          <div className="space-y-4">
            {offresEmploi.map(offre => (
              <div key={offre.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[16px] p-6 hover:border-[rgba(232,130,74,0.2)] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase size={15} className="text-[#e8824a] shrink-0" />
                      <h4 className="font-bold text-[#f5f0e8]">{offre.titre}</h4>
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-[rgba(232,130,74,0.12)] text-[#e8824a] border border-[rgba(232,130,74,0.25)] px-2.5 py-1 rounded-full mb-3">
                      {offre.type}
                    </span>
                    <p className="text-[rgba(245,240,232,0.5)] text-sm leading-relaxed">{offre.description}</p>
                  </div>
                  <button onClick={() => setActiveOffre(offre.id)}
                    className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#e8824a] border border-[rgba(232,130,74,0.35)] px-4 py-2 rounded-[8px] hover:bg-[rgba(232,130,74,0.1)] transition-all whitespace-nowrap">
                    Postuler <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FIDÉLITÉ ── */}
      <section id="fidelite" className="py-24 px-6 bg-[#0d1b0b]">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(232,130,74,0.12)] border border-[rgba(232,130,74,0.25)] flex items-center justify-center mx-auto mb-6">
            <Trophy size={24} className="text-[#e8824a]" />
          </div>
          <SectionTitle title="Programme Fidélité" sub="Gagnez des points à chaque visite et débloquez des récompenses exclusives" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: <Star size={18} />, label: 'Points à chaque commande' },
              { icon: <Trophy size={18} />, label: 'Roue de la fortune mensuelle' },
              { icon: <Users size={18} />, label: 'Offres anniversaire' },
            ].map((item, i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[12px] p-4 text-center">
                <div className="text-[#e8824a] flex justify-center mb-2">{item.icon}</div>
                <p className="text-xs text-[rgba(245,240,232,0.5)] leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
          <a href="/client/login"
            className="inline-flex items-center gap-2 bg-[#e8824a] text-black font-bold px-8 py-3.5 rounded-[10px] text-sm hover:bg-[#d4703a] transition-all"
            style={{ boxShadow: '0 4px 20px rgba(232,130,74,0.38)' }}>
            <Star size={15} /> Rejoindre le programme
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-[rgba(255,255,255,0.06)]"
        style={{ background: '#080f07' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="text-2xl font-bold text-[#e8824a] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}>SKY07</p>
              <p className="text-sm text-[rgba(245,240,232,0.4)] leading-relaxed">
                Restaurant gastronomique marocain. Une expérience unique depuis 2018.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(245,240,232,0.35)] mb-3">Contact</p>
              <div className="space-y-2 text-sm text-[rgba(245,240,232,0.5)]">
                <p className="flex items-center gap-2"><MapPin size={13} className="text-[#e8824a]" /> Casablanca, Maroc</p>
                <p className="flex items-center gap-2"><Phone size={13} className="text-[#e8824a]" /> +212 6 00 00 00 00</p>
                <p className="flex items-center gap-2"><Clock size={13} className="text-[#e8824a]" /> Lun – Dim · 12h – 23h30</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(245,240,232,0.35)] mb-3">Suivez-nous</p>
              <div className="flex gap-3">
                <a href="https://www.instagram.com/sky07restaurant" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-[8px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(245,240,232,0.5)] hover:text-[#e8824a] hover:border-[rgba(232,130,74,0.4)] transition-all">
                  <ExternalLink size={15} />
                </a>
                <a href="https://wa.me/212600000000" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-[8px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(245,240,232,0.5)] hover:text-[#25D366] hover:border-[rgba(37,211,102,0.4)] transition-all">
                  <MessageCircle size={15} />
                </a>
              </div>
              <div className="mt-4 space-y-1 text-sm text-[rgba(245,240,232,0.35)]">
                <a href="/client/login" className="block hover:text-[#e8824a] transition-colors">Espace fidélité</a>
                <a href="/qr" className="block hover:text-[#e8824a] transition-colors">Commander en ligne</a>
              </div>
            </div>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.05)] pt-6 text-center text-[11px] text-[rgba(245,240,232,0.2)]">
            © 2026 SKY07 — Tous droits réservés
          </div>
        </div>
      </footer>

      {/* ── MODAL CANDIDATURE ── */}
      {activeOffre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2e1a] border border-[rgba(232,130,74,0.2)] rounded-[20px] p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Postuler</h2>
              <button onClick={() => setActiveOffre(null)} className="text-[rgba(245,240,232,0.4)] hover:text-[#f5f0e8]">
                <X size={20} />
              </button>
            </div>
            {candidatureSent ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">✓</p>
                <p className="font-semibold text-lg">Candidature envoyée !</p>
                <p className="text-sm text-[rgba(245,240,232,0.5)] mt-2">Nous reviendrons vers vous rapidement.</p>
                <button onClick={() => { setCandidatureSent(false); setActiveOffre(null) }}
                  className="mt-4 text-sm text-[rgba(245,240,232,0.4)] hover:text-[#f5f0e8] transition-colors">Fermer</button>
              </div>
            ) : (
              <form onSubmit={handleCandidature} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'Prénom', key: 'prenom', placeholder: 'Yasser' }, { label: 'Nom', key: 'nom', placeholder: 'Lahrouni' }].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">{label}</label>
                      <input required value={candidatureForm[key]} placeholder={placeholder}
                        onChange={e => setCandidatureForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:border-[#e8824a]" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">Email</label>
                  <input required type="email" value={candidatureForm.email} placeholder="vous@email.com"
                    onChange={e => setCandidatureForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:border-[#e8824a]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.5)] mb-1.5">Message de motivation</label>
                  <textarea rows={3} value={candidatureForm.message}
                    onChange={e => setCandidatureForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:border-[#e8824a] resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setActiveOffre(null)}
                    className="flex-1 border border-[rgba(255,255,255,0.1)] text-[rgba(245,240,232,0.6)] rounded-[8px] py-2.5 text-sm hover:bg-[rgba(255,255,255,0.05)] transition-all">
                    Annuler
                  </button>
                  <button type="submit"
                    className="flex-1 bg-[#e8824a] text-black font-bold rounded-[8px] py-2.5 text-sm hover:bg-[#d4703a] transition-all">
                    Envoyer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title, sub }) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold text-[#f5f0e8]">{title}</h2>
      {sub && <p className="text-sm text-[rgba(245,240,232,0.45)] mt-2">{sub}</p>}
      <div className="w-10 h-0.5 mx-auto mt-4 rounded-full bg-[#e8824a]" />
    </div>
  )
}
