import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  getTableQR, creerCommandeQR, createPaymentIntent, confirmerPaiement,
  payerEspeces, statutCommandeQR, clientLogin, clientRegister,
} from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  UtensilsCrossed, ShoppingCart, ArrowLeft, Check, CreditCard,
  Banknote, Shield, Lock, Star, AlertTriangle, ChefHat,
  PartyPopper, Loader2, Plus, Minus, Target, User, Mail, Phone, KeyRound
} from 'lucide-react'

const ICON_CAT = {
  entrée: UtensilsCrossed, entrées: UtensilsCrossed,
  plat: UtensilsCrossed, plats: UtensilsCrossed, 'plats principaux': UtensilsCrossed,
  dessert: Star, desserts: Star,
  boisson: ShoppingCart, boissons: ShoppingCart,
  default: UtensilsCrossed,
}

function IconCat({ nom, size = 14 }) {
  const Ic = ICON_CAT[nom?.toLowerCase().trim()] || ICON_CAT.default
  return <Ic size={size} strokeWidth={2} />
}

const IMG_SALADE  = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'
const IMG_DESSERT = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80'
const IMG_TAJINE  = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80'
const IMG_ENTREE  = 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80'
const IMG_PLAT    = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80'
const IMG_BOISSON = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80'

function getImageUrl(plat, catNom) {
  if (plat.image) return plat.image
  const n = plat.nom.toLowerCase()
  const c = (catNom || '').toLowerCase()
  if (n.includes('salade') || n.includes('nicoise') || n.includes('niçoise')) return IMG_SALADE
  if (n.includes('tajine') || n.includes('tagine')) return IMG_TAJINE
  if (n.includes('dessert') || n.includes('moelleux') || n.includes('fondant') || n.includes('gâteau') || n.includes('tarte') || n.includes('glace') || c.includes('dessert')) return IMG_DESSERT
  if (c.includes('boisson') || n.includes('jus') || n.includes('café') || n.includes('thé') || n.includes('soda') || n.includes('eau')) return IMG_BOISSON
  if (c.includes('entrée') || c.includes('soupe')) return IMG_ENTREE
  return IMG_PLAT
}

function FormulaireStripe({ clientSecret, commandeId, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    })
    if (error) { onError(error.message); setLoading(false); return }
    if (paymentIntent.status === 'succeeded') {
      try {
        await confirmerPaiement(commandeId, { payment_intent_id: paymentIntent.id, mode: 'carte' })
        onSuccess(paymentIntent.id)
      } catch (e) { onError(e.response?.data?.detail || 'Erreur confirmation') }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-[10px] p-4 shadow-sm">
        <CardElement options={{
          style: { base: { fontSize: '15px', color: '#111827', '::placeholder': { color: '#9CA3AF' } }, invalid: { color: '#ef4444' } },
        }} />
      </div>
      <p className="text-xs text-[#a89880] flex items-center gap-1.5">
        <Lock size={11} /> Paiement sécurisé par Stripe — vos données sont chiffrées
      </p>
      <button type="submit" disabled={!stripe || loading}
        className="w-full bg-[#e8824a] hover:bg-[#d4703a] text-black font-bold py-4 rounded-[10px] text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        style={{ boxShadow: '0 4px 16px rgba(232,130,74,0.3)' }}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? 'Traitement…' : 'Confirmer le paiement'}
      </button>
      <p className="text-center text-xs text-[#a89880]">
        Test : <span className="font-mono bg-[rgba(255,255,255,0.07)] px-2 py-0.5 rounded">4242 4242 4242 4242</span> · 12/26 · 123
      </p>
    </form>
  )
}

export default function CommandeQR() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tableId = params.get('table')

  const [etape, setEtape] = useState(1)
  const [table, setTable] = useState(null)
  const [menu, setMenu] = useState([])
  const [stripePromise, setStripePromise] = useState(null)
  const [panier, setPanier] = useState({})
  const [modePaiement, setMode] = useState('carte')
  const [commandeId, setCommandeId] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [suivi, setSuivi] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  const [clientFideliteId, setClientFideliteId] = useState(null)
  const [clientPrenom, setClientPrenom] = useState(null)
  const [fideliteMode, setFideliteMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ prenom: '', nom: '', telephone: '', email: '', password: '' })
  const [fideliteLoading, setFideliteLoading] = useState(false)
  const [fideliteErreur, setFideliteErreur] = useState(null)

  const [categorieActive, setCategorieActive] = useState(null)
  const [panierPulse, setPanierPulse] = useState(false)

  useEffect(() => {
    if (!tableId) return
    getTableQR(tableId)
      .then(r => {
        setTable(r.data.table)
        setMenu(r.data.menu)
        if (r.data.stripe_publishable_key) setStripePromise(loadStripe(r.data.stripe_publishable_key))
      })
      .catch(() => setErreur('Table introuvable ou menu indisponible.'))
  }, [tableId])

  useEffect(() => {
    if (etape !== 5 || !commandeId) return
    const interval = setInterval(async () => {
      try {
        const r = await statutCommandeQR(commandeId)
        setSuivi(r.data)
        if (r.data.statut === 'prete' || r.data.statut === 'cloturee') clearInterval(interval)
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [etape, commandeId])

  function ajouterPlat(plat) {
    setPanier(p => ({ ...p, [plat.id]: p[plat.id] ? { ...p[plat.id], quantite: p[plat.id].quantite + 1 } : { plat, quantite: 1, note: '' } }))
    setPanierPulse(true)
    setTimeout(() => setPanierPulse(false), 400)
  }

  function retirerPlat(platId) {
    setPanier(p => {
      const item = p[platId]
      if (!item) return p
      if (item.quantite <= 1) { const { [platId]: _, ...reste } = p; return reste }
      return { ...p, [platId]: { ...item, quantite: item.quantite - 1 } }
    })
  }

  function modifierNote(platId, note) {
    setPanier(p => ({ ...p, [platId]: { ...p[platId], note } }))
  }

  const lignesPanier = Object.values(panier)
  const total = lignesPanier.reduce((s, l) => s + l.plat.prix * l.quantite, 0)
  const nbArticles = lignesPanier.reduce((s, l) => s + l.quantite, 0)
  const pointsEstimes = Math.floor(total / 20)
  const menuFiltré = categorieActive ? menu.filter(c => c.id === categorieActive) : menu

  async function handleLogin(e) {
    e.preventDefault()
    setFideliteLoading(true); setFideliteErreur(null)
    try {
      const r = await clientLogin(loginForm)
      setClientFideliteId(r.data.client.id)
      setClientPrenom(r.data.client.prenom)
    } catch (err) {
      setFideliteErreur(err.response?.data?.detail || 'Email ou mot de passe incorrect')
    } finally { setFideliteLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (registerForm.password.length < 6) { setFideliteErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setFideliteLoading(true); setFideliteErreur(null)
    try {
      const r = await clientRegister(registerForm)
      setClientFideliteId(r.data.client.id)
      setClientPrenom(r.data.client.prenom)
    } catch (err) {
      setFideliteErreur(err.response?.data?.detail || 'Erreur lors de la création du compte')
    } finally { setFideliteLoading(false) }
  }

  async function handlePasserPaiement() {
    if (lignesPanier.length === 0) return
    if (modePaiement === 'carte' && !stripePromise) { setErreur('Paiement par carte indisponible.'); return }
    setLoading(true); setErreur(null)
    try {
      const lignes = lignesPanier.map(l => ({ plat_id: l.plat.id, quantite: l.quantite, note: l.note || null }))
      const r1 = await creerCommandeQR({ table_id: parseInt(tableId), lignes, client_fidelite_id: clientFideliteId || null })
      const cmdId = r1.data.commande_id
      setCommandeId(cmdId)
      if (modePaiement === 'especes') {
        const r2 = await payerEspeces(cmdId)
        setSuivi({ statut: 'envoyee', statut_label: 'En attente de préparation', montant_total: r2.data.montant, code_unique: r2.data.code_unique, lignes: [] })
        setEtape(5)
      } else {
        const r2 = await createPaymentIntent(cmdId)
        setClientSecret(r2.data.client_secret)
        setEtape(4)
      }
    } catch (e) {
      setErreur(e.response?.data?.detail || 'Erreur lors de la création de commande.')
    } finally { setLoading(false) }
  }

  function handleStripeSuccess() {
    setSuivi({ statut: 'envoyee', statut_label: 'En attente de préparation', montant_total: total, lignes: [] })
    setEtape(5)
  }

  const inputDark = "w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-2.5 text-[#f5f0e8] placeholder-[#a89880] text-sm focus:outline-none focus:border-[#e8824a] transition-all"

  if (!tableId) return <Ecran><p className="text-red-400 text-sm">Aucune table spécifiée dans l'URL.</p></Ecran>
  if (erreur && !menu.length) return <Ecran><p className="text-red-400 text-sm">{erreur}</p></Ecran>
  if (!table) return <Ecran><Loader2 size={32} className="animate-spin text-[#e8824a]" /></Ecran>

  return (
    <div className={`min-h-screen ${etape === 1 ? 'bg-[#0a1408]' : 'bg-[#0a1408]'}`}>

      {/* Header étapes 2-5 */}
      {etape !== 1 && (
        <div className="bg-[#0f1a0e]/95 backdrop-blur border-b border-[rgba(232,130,74,0.15)] px-4 py-4 sticky top-0 z-30 flex items-center gap-3">
          <button onClick={() => etape === 2 ? navigate(`/commande?table=${tableId}`) : setEtape(etape - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-[#a89880] hover:text-[#f5f0e8] transition-all">
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1">
            <p className="font-bold text-[#f5f0e8] text-base">SKY07</p>
            <p className="text-xs text-[#a89880]">Table {table.numero} · {table.emplacement}</p>
          </div>
          {etape <= 2 && nbArticles > 0 && (
            <button onClick={() => setEtape(2)}
              className="relative bg-[#e8824a] text-black text-xs px-4 py-2 rounded-[8px] font-bold flex items-center gap-1.5">
              <ShoppingCart size={13} />
              Panier
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                {nbArticles}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ÉTAPE 1 — Menu */}
      {etape === 1 && (
        <div>
          <style>{`
            @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
            .hide-scrollbar::-webkit-scrollbar { display:none; }
            .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
          `}</style>

          <div className="sticky top-0 z-30 px-4 pt-8 pb-3" style={{ background: 'linear-gradient(to bottom, #0a1408 85%, transparent)' }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => navigate(`/commande?table=${tableId}`)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[#a89880] hover:text-[#f5f0e8] transition-all">
                <ArrowLeft size={17} />
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-black tracking-[0.18em] text-[#e8824a]"
                  style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 28px rgba(232,130,74,0.55)' }}>
                  SKY07
                </h1>
                <div className="inline-flex items-center gap-1.5 bg-[rgba(232,130,74,0.1)] border border-[rgba(232,130,74,0.2)] rounded-full px-3 py-0.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8824a] opacity-80" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#e8824a]/90">
                    Table {table.numero} · {table.emplacement}
                  </span>
                </div>
              </div>
              <div className="w-9" />
            </div>
            <p className="text-center text-[rgba(245,240,232,0.35)] text-xs tracking-widest uppercase mt-1">
              Que souhaitez-vous commander ?
            </p>
          </div>

          {/* Filtres */}
          <div className="overflow-x-auto hide-scrollbar px-4 py-3">
            <div className="flex gap-2 w-max">
              <button onClick={() => setCategorieActive(null)}
                className={`flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-4 py-1.5 rounded-full transition-all ${
                  categorieActive === null ? 'bg-[#e8824a] text-black' : 'border border-[rgba(232,130,74,0.3)] text-[rgba(245,240,232,0.6)] hover:border-[rgba(232,130,74,0.6)]'
                }`} style={categorieActive === null ? { boxShadow: '0 3px 12px rgba(232,130,74,0.35)' } : {}}>
                <UtensilsCrossed size={13} strokeWidth={2.5} /> Tout
              </button>
              {menu.map(cat => (
                <button key={cat.id} onClick={() => setCategorieActive(cat.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-4 py-1.5 rounded-full transition-all ${
                    categorieActive === cat.id ? 'bg-[#e8824a] text-black' : 'border border-[rgba(232,130,74,0.3)] text-[rgba(245,240,232,0.6)] hover:border-[rgba(232,130,74,0.6)]'
                  }`} style={categorieActive === cat.id ? { boxShadow: '0 3px 12px rgba(232,130,74,0.35)' } : {}}>
                  <IconCat nom={cat.nom} size={13} /> {cat.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Liste plats */}
          <div className="px-4 pb-32">
            {menuFiltré.map((cat, catIdx) => (
              <div key={cat.id} className="mb-8">
                {!categorieActive && (
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-black uppercase tracking-[0.22em] text-[11px] text-[rgba(232,130,74,0.7)]">{cat.nom}</span>
                    <div className="flex-1 h-px bg-[rgba(232,130,74,0.12)]" />
                  </div>
                )}
                <div className="space-y-2.5">
                  {cat.plats.map((plat, platIdx) => {
                    const qte = panier[plat.id]?.quantite || 0
                    return (
                      <div key={plat.id}
                        className="flex overflow-hidden bg-[#1a2e1a] rounded-[12px]"
                        style={{
                          height: '120px', border: '1px solid rgba(255,255,255,0.05)',
                          borderLeft: '3px solid rgba(232,130,74,0.3)',
                          animation: 'fadeUp 0.45s ease forwards',
                          animationDelay: `${(catIdx * 6 + platIdx) * 50}ms`,
                          opacity: 0, transition: 'transform 0.2s ease, border-left-color 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.borderLeftColor = 'rgba(232,130,74,0.9)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderLeftColor = 'rgba(232,130,74,0.3)' }}>
                        <div className="shrink-0 overflow-hidden" style={{ width: '40%' }}>
                          <img src={getImageUrl(plat, cat.nom)} alt={plat.nom} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 px-3 py-3 flex flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-[#f5f0e8] leading-tight line-clamp-1 flex-1 text-[15px]">{plat.nom}</p>
                            {qte > 0 && (
                              <span className="shrink-0 text-black font-black text-[9px] bg-[#e8824a] px-1.5 py-0.5 rounded-full ml-1">{qte}×</span>
                            )}
                          </div>
                          {plat.description && (
                            <p className="line-clamp-2 leading-snug text-[12px] text-[#a89880]">{plat.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[16px] text-[#e8824a]">{plat.prix} dh</span>
                            <button onClick={() => ajouterPlat(plat)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-black font-black active:scale-90 transition-transform"
                              style={{ background: 'linear-gradient(135deg,#f0914e,#e8824a)', boxShadow: '0 3px 10px rgba(232,130,74,0.4)' }}>
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panier flottant */}
          {nbArticles > 0 && (
            <div className="fixed bottom-6 left-0 right-0 px-4 z-40">
              <button onClick={() => setEtape(2)}
                className={`w-full text-black py-4 rounded-[16px] font-bold text-sm flex items-center justify-between px-5 transition-transform duration-200 ${panierPulse ? 'scale-[1.04]' : 'scale-100'}`}
                style={{ background: 'linear-gradient(135deg,#f0914e,#e8824a)', boxShadow: '0 8px 32px rgba(232,130,74,0.45)' }}>
                <span className="flex items-center gap-2.5">
                  <span className="bg-black/20 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black">{nbArticles}</span>
                  <span>Voir mon panier</span>
                </span>
                <span className="font-black text-base">{total.toFixed(0)} dh</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 2 — Panier */}
      {etape === 2 && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h2 className="font-bold text-[#f5f0e8] text-lg mb-5 flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#e8824a]" /> Votre commande
          </h2>
          <div className="space-y-3 mb-6">
            {lignesPanier.map(({ plat, quantite, note }) => (
              <div key={plat.id} className="bg-[#1a2e1a] rounded-[12px] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-[#f5f0e8] text-sm">{plat.nom}</p>
                    <p className="text-xs text-[#a89880] mt-0.5">{plat.prix} dh × {quantite} = <strong className="text-[#e8824a]">{(plat.prix * quantite).toFixed(0)} dh</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => retirerPlat(plat.id)}
                      className="w-7 h-7 rounded-full border border-[rgba(255,255,255,0.15)] text-[#f5f0e8] flex items-center justify-center hover:border-[#e8824a] transition-all">
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center text-[#f5f0e8]">{quantite}</span>
                    <button onClick={() => ajouterPlat(plat)}
                      className="w-7 h-7 rounded-full bg-[#e8824a] text-black flex items-center justify-center hover:bg-[#d4703a] transition-all">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <input placeholder="Note (sans oignon, bien cuit…)" value={note}
                  onChange={e => modifierNote(plat.id, e.target.value)}
                  className="mt-3 w-full text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-[#a89880] placeholder-[rgba(168,152,128,0.5)] focus:outline-none focus:border-[rgba(232,130,74,0.4)] transition-all" />
              </div>
            ))}
          </div>

          <div className="bg-[#1a2e1a] rounded-[12px] border border-[rgba(232,130,74,0.15)] p-4 mb-5">
            <div className="flex justify-between text-sm text-[#a89880] mb-1.5"><span>Sous-total</span><span>{total.toFixed(0)} dh</span></div>
            <div className="h-px bg-[rgba(255,255,255,0.06)] mb-1.5" />
            <div className="flex justify-between font-bold text-[#f5f0e8]"><span>Total</span><span className="text-[#e8824a] text-lg">{total.toFixed(0)} dh</span></div>
          </div>

          <div className="space-y-2 mb-6">
            {[
              { id: 'carte', label: 'Carte bancaire', icon: <CreditCard size={17} /> },
              { id: 'especes', label: 'Espèces à la caisse', icon: <Banknote size={17} /> },
            ].map(m => (
              <label key={m.id} className={`flex items-center gap-4 p-3.5 rounded-[10px] border-2 cursor-pointer transition-all ${
                modePaiement === m.id ? 'border-[#e8824a] bg-[rgba(232,130,74,0.06)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(232,130,74,0.3)]'
              }`}>
                <input type="radio" name="mode" value={m.id} checked={modePaiement === m.id} onChange={() => setMode(m.id)} className="hidden" />
                <span className={modePaiement === m.id ? 'text-[#e8824a]' : 'text-[#a89880]'}>{m.icon}</span>
                <span className="font-semibold text-[#f5f0e8] text-sm flex-1">{m.label}</span>
                {modePaiement === m.id && <Check size={16} className="text-[#e8824a]" />}
              </label>
            ))}
          </div>

          <button onClick={() => setEtape(3)}
            className="w-full bg-[#e8824a] hover:bg-[#d4703a] text-black py-4 rounded-[10px] font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ boxShadow: '0 4px 16px rgba(232,130,74,0.3)' }}>
            Continuer <ArrowLeft size={15} className="rotate-180" />
          </button>
        </div>
      )}

      {/* ÉTAPE 3 — Fidélité */}
      {etape === 3 && (
        <div className="max-w-md mx-auto px-4 py-6">
          <h2 className="font-bold text-[#f5f0e8] text-lg mb-1">Cumulez vos points SKY07</h2>
          <p className="text-xs text-[#a89880] mb-5">Connectez-vous pour gagner des points sur cette commande</p>

          {pointsEstimes > 0 && (
            <div className="bg-[rgba(232,130,74,0.1)] border border-[rgba(232,130,74,0.25)] rounded-[10px] px-4 py-3 mb-5 flex items-center gap-2">
              <Target size={16} className="text-[#e8824a] shrink-0" />
              <p className="text-sm text-[#e8824a] font-medium">
                Vous gagnerez <strong>{pointsEstimes} point{pointsEstimes > 1 ? 's' : ''}</strong> sur cette commande
              </p>
            </div>
          )}

          {clientFideliteId ? (
            <div className="space-y-4">
              <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] rounded-[10px] p-4 flex items-center gap-3">
                <Check size={18} className="text-[#22c55e] shrink-0" />
                <div>
                  <p className="font-semibold text-[#22c55e] text-sm">Connecté en tant que {clientPrenom}</p>
                  <p className="text-xs text-[rgba(34,197,94,0.7)] mt-0.5">+{pointsEstimes} points crédités après paiement</p>
                </div>
              </div>
              {erreur && <p className="text-red-400 text-sm">{erreur}</p>}
              <button onClick={handlePasserPaiement} disabled={loading}
                className="w-full bg-[#e8824a] hover:bg-[#d4703a] text-black py-4 rounded-[10px] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {loading ? 'Chargement…' : (modePaiement === 'especes' ? 'Commander (payer à la caisse)' : 'Payer par carte')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex bg-[rgba(255,255,255,0.04)] rounded-[10px] p-1">
                {[{ id: 'login', label: "J'ai un compte" }, { id: 'register', label: 'Créer un compte' }].map(t => (
                  <button key={t.id} onClick={() => { setFideliteMode(t.id); setFideliteErreur(null) }}
                    className={`flex-1 py-2.5 rounded-[8px] text-sm font-semibold transition-all ${fideliteMode === t.id ? 'bg-[#e8824a] text-black shadow' : 'text-[#a89880] hover:text-[#f5f0e8]'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {fideliteMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89880]" />
                      <input type="email" required value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="votre@email.com" className={inputDark + " pl-9"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89880]" />
                      <input type="password" required value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                        className={inputDark + " pl-9"} />
                    </div>
                  </div>
                  {fideliteErreur && <p className="text-red-400 text-xs">{fideliteErreur}</p>}
                  <button type="submit" disabled={fideliteLoading}
                    className="w-full bg-[#e8824a] text-black py-3 rounded-[10px] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {fideliteLoading ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                    {fideliteLoading ? 'Connexion…' : 'Se connecter et continuer'}
                  </button>
                </form>
              )}

              {fideliteMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Prénom *</label>
                      <input required value={registerForm.prenom} onChange={e => setRegisterForm(f => ({ ...f, prenom: e.target.value }))} className={inputDark} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Nom</label>
                      <input value={registerForm.nom} onChange={e => setRegisterForm(f => ({ ...f, nom: e.target.value }))} className={inputDark} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Téléphone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89880]" />
                      <input value={registerForm.telephone} onChange={e => setRegisterForm(f => ({ ...f, telephone: e.target.value }))}
                        placeholder="+212 6 00 00 00 00" className={inputDark + " pl-9"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89880]" />
                      <input type="email" required value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="votre@email.com" className={inputDark + " pl-9"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5">Mot de passe *</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a89880]" />
                      <input type="password" required value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Minimum 6 caractères" className={inputDark + " pl-9"} />
                    </div>
                  </div>
                  {fideliteErreur && <p className="text-red-400 text-xs">{fideliteErreur}</p>}
                  <button type="submit" disabled={fideliteLoading}
                    className="w-full bg-[#e8824a] text-black py-3 rounded-[10px] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {fideliteLoading ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                    {fideliteLoading ? 'Création…' : 'Créer et continuer'}
                  </button>
                </form>
              )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[rgba(255,255,255,0.06)]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a1408] px-3 text-xs text-[#a89880]">ou</span></div>
              </div>

              {erreur && <p className="text-red-400 text-sm text-center">{erreur}</p>}
              <div className="text-center">
                <button onClick={handlePasserPaiement} disabled={loading || fideliteLoading}
                  className="text-sm text-[#a89880] hover:text-[#f5f0e8] disabled:opacity-40 transition-colors">
                  {loading ? 'Chargement…' : 'Passer cette étape'}
                </button>
                <p className="text-xs text-[rgba(168,152,128,0.5)] mt-1">Aucun point ne sera crédité</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 4 — Paiement Stripe (style two-column) */}
      {etape === 4 && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          {!stripePromise || !clientSecret ? (
            <div className="text-center py-10">
              <AlertTriangle size={40} className="text-[#e8824a] mx-auto mb-4" />
              <p className="font-semibold text-[#f5f0e8] mb-2">Paiement par carte indisponible</p>
              <p className="text-sm text-[#a89880] mb-6">La configuration Stripe est manquante sur ce serveur.</p>
              <button onClick={() => setEtape(2)} className="text-sm text-[#a89880] hover:text-[#f5f0e8] underline">
                Revenir et choisir Espèces
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-start">

              {/* Colonne gauche — Récapitulatif */}
              <div className="bg-[#1a2e1a] border border-[rgba(232,130,74,0.15)] rounded-[16px] p-6 order-2 md:order-1">
                <h3 className="font-semibold text-[#f5f0e8] text-base mb-4">Récapitulatif</h3>
                <div className="space-y-3 mb-4">
                  {lignesPanier.map(({ plat, quantite }) => (
                    <div key={plat.id} className="flex items-center gap-3">
                      <img src={getImageUrl(plat, '')} alt={plat.nom}
                        className="w-10 h-10 rounded-[8px] object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f5f0e8] font-medium truncate">{plat.nom}</p>
                        <p className="text-xs text-[#a89880]">× {quantite}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#e8824a] shrink-0">{(plat.prix * quantite).toFixed(0)} dh</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[rgba(255,255,255,0.07)] mb-3" />
                <div className="flex justify-between text-[#a89880] text-sm mb-1">
                  <span>Sous-total</span><span>{total.toFixed(0)} dh</span>
                </div>
                <div className="flex justify-between font-bold text-[#f5f0e8] text-lg mt-1">
                  <span>Total</span><span className="text-[#e8824a]">{total.toFixed(0)} dh</span>
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2 text-xs text-[#a89880]">
                  <Shield size={13} className="text-[#22c55e] shrink-0" />
                  Paiement 100% sécurisé
                </div>
              </div>

              {/* Colonne droite — Formulaire */}
              <div className="bg-[#1a2e1a] border border-[rgba(232,130,74,0.15)] rounded-[16px] p-6 order-1 md:order-2">
                <h3 className="font-semibold text-[#f5f0e8] text-base mb-1">Paiement</h3>
                <p className="text-[#a89880] text-sm mb-5">Table {table.numero} · {table.emplacement}</p>
                {erreur && <p className="text-red-400 text-sm mb-4">{erreur}</p>}
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <FormulaireStripe clientSecret={clientSecret} commandeId={commandeId}
                    onSuccess={handleStripeSuccess} onError={handleStripeError} />
                </Elements>
                <div className="mt-4 flex items-center justify-center gap-4 text-[#a89880]">
                  {[{ icon: <Shield size={11} />, label: 'Sécurisé' }, { icon: <Lock size={11} />, label: 'Chiffré' }, { icon: <CreditCard size={11} />, label: 'Stripe' }].map(b => (
                    <div key={b.label} className="flex items-center gap-1 text-[11px]">{b.icon} {b.label}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 5 — Suivi */}
      {etape === 5 && suivi && (
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="mb-6">
            {suivi.statut === 'prete' ? <PartyPopper size={52} className="text-[#22c55e] mx-auto" /> :
             suivi.statut === 'en_preparation' ? <ChefHat size={52} className="text-[#e8824a] mx-auto" /> :
             <Check size={52} className="text-[#22c55e] mx-auto" />}
          </div>
          <h2 className="font-bold text-[#f5f0e8] text-xl mb-1">Commande confirmée</h2>
          <p className="text-sm text-[#a89880] mb-3 font-mono">{suivi.code_unique}</p>

          <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6 ${
            suivi.statut === 'prete' ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]' :
            suivi.statut === 'en_preparation' ? 'bg-[rgba(232,130,74,0.15)] text-[#e8824a]' :
            'bg-[rgba(59,130,246,0.15)] text-blue-400'
          }`}>{suivi.statut_label}</div>

          <div className="bg-[#1a2e1a] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4 text-left mb-4">
            {suivi.lignes?.map((l, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
                <span className="text-[#a89880]">{l.quantite}× {l.nom}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[#f5f0e8] mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
              <span>Total payé</span>
              <span className="text-[#e8824a]">{suivi.montant_total?.toFixed(0)} dh</span>
            </div>
          </div>

          {clientFideliteId && pointsEstimes > 0 && (
            <div className="bg-[rgba(232,130,74,0.1)] border border-[rgba(232,130,74,0.2)] rounded-[10px] px-4 py-3 mb-4 flex items-center gap-2 text-left">
              <Star size={15} className="text-[#e8824a] shrink-0" />
              <p className="text-sm text-[#e8824a] font-medium">+{pointsEstimes} points crédités sur votre compte</p>
            </div>
          )}

          <p className="text-xs text-[#a89880] mb-4 animate-pulse">
            {suivi.statut !== 'prete' ? 'Mise à jour automatique toutes les 4 secondes…' : 'Le serveur arrive avec votre commande !'}
          </p>
          <a href="/client/login" className="text-xs text-[#e8824a] hover:underline">
            Accéder à mon espace fidélité
          </a>
        </div>
      )}
    </div>
  )
}

function handleStripeError(msg) { }

function Ecran({ children }) {
  return (
    <div className="min-h-screen bg-[#0a1408] flex items-center justify-center p-6">
      {children}
    </div>
  )
}
