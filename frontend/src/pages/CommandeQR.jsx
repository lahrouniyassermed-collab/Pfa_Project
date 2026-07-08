// src/pages/CommandeQR.jsx — SKY07 QR ordering flow
// Flow: Menu → Panier → [Stripe si carte] → Confirmation/Suivi

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  getTableQR, creerCommandeQR, createPaymentIntent, confirmerPaiement,
  payerEspeces, statutCommandeQR, clientLogin, clientRegister, getClientPrizes,
} from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  UtensilsCrossed, ShoppingCart, ArrowLeft, Check, CreditCard,
  Banknote, Shield, Lock, Star, AlertTriangle, ChefHat,
  PartyPopper, Loader2, Plus, Minus, User, Mail, Phone, KeyRound,
  X, Trash2, ChevronRight, HelpCircle, ChevronDown, ChevronUp,
  Clock, MapPin, Leaf, Wheat,
} from 'lucide-react'
import TrendingSection from '../components/shared/TrendingSection'

// ── Image fallbacks ───────────────────────────────────────────────────────────
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
  if (n.includes('moelleux') || n.includes('fondant') || n.includes('gâteau') || n.includes('tarte') || n.includes('glace') || c.includes('dessert')) return IMG_DESSERT
  if (c.includes('boisson') || n.includes('jus') || n.includes('café') || n.includes('thé') || n.includes('soda') || n.includes('eau')) return IMG_BOISSON
  if (c.includes('entrée') || c.includes('soupe')) return IMG_ENTREE
  return IMG_PLAT
}

// ── Stripe form ───────────────────────────────────────────────────────────────
function FormulaireStripe({ clientSecret, commandeId, onSuccess, onError }) {
  const stripe   = useStripe()
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
        onSuccess()
      } catch (e2) { onError(e2.response?.data?.detail || 'Erreur confirmation') }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl p-4" style={{ background: '#0a1408', border: '1px solid rgba(232,130,74,0.2)' }}>
        <CardElement options={{
          style: {
            base: { fontSize: '15px', color: '#f5f0e8', fontFamily: "'Inter', sans-serif", '::placeholder': { color: 'rgba(168,152,128,0.6)' } },
            invalid: { color: '#f87171' },
          },
        }} />
      </div>
      <p className="flex items-center gap-1.5 text-xs" style={{ color: '#a89880' }}>
        <Lock size={11} strokeWidth={1.75} />
        Paiement sécurisé par Stripe — données chiffrées
      </p>
      <button
        type="submit" disabled={!stripe || loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-sm transition-all disabled:opacity-50"
        style={{ background: loading ? 'rgba(232,130,74,0.5)' : '#e8824a', color: '#0a1408', boxShadow: '0 4px 20px rgba(232,130,74,0.3)' }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} strokeWidth={1.75} />}
        {loading ? 'Traitement…' : 'Confirmer le paiement'}
      </button>
      <p className="text-center text-xs" style={{ color: '#a89880' }}>
        Test :{' '}
        <span className="font-mono rounded px-1.5 py-0.5" style={{ background: 'rgba(245,240,232,0.07)' }}>
          4242 4242 4242 4242
        </span>{' '}
        · 12/26 · 123
      </p>
    </form>
  )
}

// ── Ecran loading/error ───────────────────────────────────────────────────────
function Ecran({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a1408' }}>{children}</div>
}

// ── Input style ───────────────────────────────────────────────────────────────
const inputCls = 'w-full text-sm rounded-xl px-4 py-3 outline-none transition-all duration-200 placeholder:text-[rgba(168,152,128,0.5)] focus:border-[#e8824a] focus:ring-1 focus:ring-[rgba(232,130,74,0.2)]'
const inputStyle = { background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.1)', color: '#f5f0e8' }

// ── Traductions complètes ─────────────────────────────────────────────────────
const I18N = {
  fr: {
    dir: 'ltr',
    slides: [
      { emoji: '🍽️', title: 'Parcourez le menu', body: 'Explorez nos plats par catégorie. Appuyez sur + pour ajouter un plat à votre panier.', color: '#e8824a' },
      { emoji: '🛒', title: 'Composez votre panier', body: 'Ajustez les quantités, ajoutez des notes personnalisées (sans oignon, bien cuit…) puis choisissez votre mode de paiement.', color: '#4ade80' },
      { emoji: '⚡', title: 'Payez & suivez en direct', body: "Payez par carte ou espèces. Votre commande est transmise et vous suivez l'avancement en temps réel.", color: '#60a5fa' },
    ],
    // Onboarding
    passer: 'Passer', suivant: 'Suivant', commencer: 'Commencer',
    // Menu
    tout: 'Tout', vegetarien: 'Végétarien', sansGluten: 'Sans gluten',
    fidelite: 'Fidélité',
    // Panier
    voirPanier: 'Voir mon panier',
    votreCommande: 'Votre commande', toutVider: 'Tout vider',
    notePlaceholder: 'Note (sans oignon, bien cuit…)',
    sousTotal: 'Sous-total', total: 'Total', totalApres: 'Total après réduction',
    reduction: 'Réduction',
    // Fidélité
    fideliteTitle: 'Espace fidélité SKY07 (optionnel)',
    connecte: 'Connecté',
    pointsEstimes: 'pts estimés',
    pointsCredites: 'pts crédités',
    deconnexion: 'Déconnexion',
    gainAppli: '✓ Réduction appliquée — économie de',
    mesFidelite: 'Mes réductions roue fortune',
    ajouterFidelite: 'Ajouter mon compte fidélité (optionnel)',
    // Paiement
    payerCarte: 'Payer par carte', payerEspeces: 'Payer en espèces',
    paiementSecurise: 'Paiement sécurisé', paiementChiffre: 'Paiement sécurisé par Stripe — données chiffrées',
    confirmerPaiement: 'Confirmer le paiement', traitement: 'Traitement…',
    recapitulatif: 'Récapitulatif',
    paiementIndispo: 'Paiement par carte indisponible',
    revenirEspeces: 'Revenir et choisir Espèces',
    // Confirmation
    commandeEnvoyee: 'Commande envoyée !', commandeConfirmee: 'Commande confirmée',
    especesInfo: 'Votre commande a bien été transmise au serveur.',
    especesDetail: 'Le serveur passera à votre table pour finaliser votre commande et encaisser le paiement.',
    fideliteInfo: 'Gagnez des points fidélité ! Lors du paiement, communiquez votre email ou téléphone au serveur.',
    misAJour: 'Mise à jour automatique toutes les 4 secondes…',
    serveurArriveTable: 'Le serveur arrive bientôt à votre table.',
    commandePrete: 'Votre commande est prête — le serveur arrive !',
    accesEspaceFidelite: 'Accéder à mon espace fidélité',
    totalAPayer: 'Total à payer', totalPaye: 'Total payé',
    // Erreurs
    aucuneTable: "Aucune table spécifiée dans l'URL.",
    tableIntrouvable: 'Table introuvable ou menu indisponible.',
  },
  en: {
    dir: 'ltr',
    slides: [
      { emoji: '🍽️', title: 'Browse the menu', body: 'Explore our dishes by category. Tap + to add an item to your cart.', color: '#e8824a' },
      { emoji: '🛒', title: 'Build your order', body: 'Adjust quantities, add personalized notes (no onion, well done…) then choose your payment method.', color: '#4ade80' },
      { emoji: '⚡', title: 'Pay & track live', body: 'Pay by card or cash. Your order is sent to the kitchen and you track progress in real time.', color: '#60a5fa' },
    ],
    passer: 'Skip', suivant: 'Next', commencer: 'Start',
    tout: 'All', vegetarien: 'Vegetarian', sansGluten: 'Gluten-free',
    fidelite: 'Loyalty',
    voirPanier: 'View my cart',
    votreCommande: 'Your order', toutVider: 'Clear all',
    notePlaceholder: 'Note (no onion, well done…)',
    sousTotal: 'Subtotal', total: 'Total', totalApres: 'Total after discount',
    reduction: 'Discount',
    fideliteTitle: 'SKY07 Loyalty (optional)',
    connecte: 'Connected',
    pointsEstimes: 'pts estimated',
    pointsCredites: 'pts credited',
    deconnexion: 'Sign out',
    gainAppli: '✓ Discount applied — saving',
    mesFidelite: '🎁 My fortune wheel discounts',
    ajouterFidelite: 'Add my loyalty account (optional)',
    payerCarte: 'Pay by card', payerEspeces: 'Pay in cash',
    paiementSecurise: 'Secure payment', paiementChiffre: 'Secured by Stripe — encrypted data',
    confirmerPaiement: 'Confirm payment', traitement: 'Processing…',
    recapitulatif: 'Summary',
    paiementIndispo: 'Card payment unavailable',
    revenirEspeces: 'Go back and choose Cash',
    commandeEnvoyee: 'Order sent!', commandeConfirmee: 'Order confirmed',
    especesInfo: 'Your order has been sent to the server.',
    especesDetail: 'The server will come to your table to finalize your order and collect payment.',
    fideliteInfo: 'Earn loyalty points! When paying, give your email or phone number to the server.',
    misAJour: 'Auto-updated every 4 seconds…',
    serveurArriveTable: 'The server will be at your table soon.',
    commandePrete: 'Your order is ready — the server is coming!',
    accesEspaceFidelite: 'Access my loyalty space',
    totalAPayer: 'Total to pay', totalPaye: 'Total paid',
    aucuneTable: 'No table specified in the URL.',
    tableIntrouvable: 'Table not found or menu unavailable.',
  },
  ar: {
    dir: 'rtl',
    slides: [
      { emoji: '🍽️', title: 'تصفح القائمة', body: 'استكشف أطباقنا حسب الفئة. اضغط على + لإضافة طبق إلى سلتك.', color: '#e8824a' },
      { emoji: '🛒', title: 'كوّن طلبك', body: 'عدّل الكميات، أضف ملاحظات شخصية (بدون بصل، مطبوخ جيداً…) ثم اختر طريقة الدفع.', color: '#4ade80' },
      { emoji: '⚡', title: 'ادفع وتابع مباشرة', body: 'ادفع بالبطاقة أو نقداً. يُرسل طلبك إلى المطبخ ويمكنك متابعة التقدم في الوقت الفعلي.', color: '#60a5fa' },
    ],
    passer: 'تخطي', suivant: 'التالي', commencer: 'ابدأ',
    tout: 'الكل', vegetarien: 'نباتي', sansGluten: 'بدون غلوتين',
    fidelite: 'الولاء',
    voirPanier: 'عرض سلتي',
    votreCommande: 'طلبك', toutVider: 'مسح الكل',
    notePlaceholder: 'ملاحظة (بدون بصل، مطبوخ جيداً…)',
    sousTotal: 'المجموع الجزئي', total: 'الإجمالي', totalApres: 'الإجمالي بعد الخصم',
    reduction: 'خصم',
    fideliteTitle: 'برنامج الولاء SKY07 (اختياري)',
    connecte: 'متصل',
    pointsEstimes: 'نقطة متوقعة',
    pointsCredites: 'نقطة مضافة',
    deconnexion: 'تسجيل الخروج',
    gainAppli: '✓ تم تطبيق الخصم — وفرت',
    mesFidelite: '🎁 خصوماتي من عجلة الحظ',
    ajouterFidelite: 'إضافة حساب الولاء (اختياري)',
    payerCarte: 'الدفع بالبطاقة', payerEspeces: 'الدفع نقداً',
    paiementSecurise: 'دفع آمن', paiementChiffre: 'مؤمَّن بواسطة Stripe — بيانات مشفرة',
    confirmerPaiement: 'تأكيد الدفع', traitement: 'جارٍ المعالجة…',
    recapitulatif: 'ملخص الطلب',
    paiementIndispo: 'الدفع بالبطاقة غير متاح',
    revenirEspeces: 'الرجوع واختيار النقد',
    commandeEnvoyee: 'تم إرسال الطلب!', commandeConfirmee: 'تم تأكيد الطلب',
    especesInfo: 'تم إرسال طلبك إلى النادل.',
    especesDetail: 'سيأتي النادل إلى طاولتك لإتمام طلبك واستلام الدفع.',
    fideliteInfo: 'اكسب نقاط ولاء! عند الدفع، أعطِ بريدك الإلكتروني أو رقم هاتفك للنادل.',
    misAJour: 'تحديث تلقائي كل 4 ثوانٍ…',
    serveurArriveTable: 'النادل في طريقه إلى طاولتك.',
    commandePrete: 'طلبك جاهز — النادل قادم!',
    accesEspaceFidelite: 'الوصول إلى مساحة الولاء',
    totalAPayer: 'الإجمالي للدفع', totalPaye: 'الإجمالي المدفوع',
    aucuneTable: 'لم يتم تحديد أي طاولة في الرابط.',
    tableIntrouvable: 'الطاولة غير موجودة أو القائمة غير متاحة.',
  },
}

const SLIDES = I18N.fr.slides // fallback

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function CommandeQR() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const tableId    = params.get('table')

  // ── Core state ────────────────────────────────────────────────────────────
  const [etape,         setEtape]         = useState(1)
  const [table,         setTable]         = useState(null)
  const [menu,          setMenu]          = useState([])
  const [stripePromise, setStripePromise] = useState(null)
  const [panier,        setPanier]        = useState({})
  const [modePaiement,  setMode]          = useState('carte')
  const [commandeId,    setCommandeId]    = useState(null)
  const [clientSecret,  setClientSecret]  = useState(null)
  const [suivi,         setSuivi]         = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [erreur,        setErreur]        = useState(null)

  // ── Fidélité (panel caché) ────────────────────────────────────────────────
  const [clientFideliteId, setClientFideliteId] = useState(null)
  const [clientPrenom,     setClientPrenom]      = useState(null)
  const [showFidelite,     setShowFidelite]      = useState(false)
  const [fideliteMode,     setFideliteMode]      = useState('login')
  const [loginForm,    setLoginForm]    = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ prenom: '', nom: '', telephone: '', email: '', password: '' })
  const [fideliteLoading,  setFideliteLoading]  = useState(false)
  const [fideliteErreur,   setFideliteErreur]   = useState(null)

  // ── Réductions roue ────────────────────────────────────────────────────────
  const [prizesDispos,  setPrizesDispos]  = useState([])   // gains réduction disponibles
  const [gainChoisi,    setGainChoisi]    = useState(null)  // { gain_id, nom, valeur }

  // ── Menu UI ───────────────────────────────────────────────────────────────
  const [categorieActive,  setCategorieActive]  = useState(null)
  const [panierPulse,      setPanierPulse]      = useState(false)
  const [filtreVege,       setFiltreVege]       = useState(false)
  const [filtreSansGluten, setFiltreSansGluten] = useState(false)

  // ── Langue ────────────────────────────────────────────────────────────────
  const [lang] = useState(() => localStorage.getItem('sky07_lang') || 'fr')
  const tr = I18N[lang] || I18N.fr
  const slides = tr.slides

  // ── Accessibilité (mode lecture vocale) ──────────────────────────────────
  const [accessMode, setAccessMode] = useState(false)

  function speak(text, onEnd) {
    window.speechSynthesis.cancel()
    const msg = new SpeechSynthesisUtterance(text)
    msg.lang = 'fr-FR'
    msg.rate = 0.9
    if (onEnd) msg.onend = onEnd
    window.speechSynthesis.speak(msg)
  }

  function lireMenuComplet(cats) {
    const plats = cats.flatMap(cat =>
      cat.plats.map(p => ({ ...p, catNom: cat.nom }))
    )
    if (plats.length === 0) return
    let i = 0
    function lireSuivant() {
      if (i >= plats.length) {
        speak('Fin du menu. Cliquez sur un plat pour l\'ajouter à votre commande.')
        return
      }
      const p = plats[i++]
      const texte = `${p.nom}. ${p.description ? p.description + '.' : ''} Prix : ${p.prix} dirhams.`
      speak(texte, lireSuivant)
    }
    lireSuivant()
  }

  function toggleAccessMode() {
    setAccessMode(prev => {
      if (!prev) {
        const msg = new SpeechSynthesisUtterance('Mode accessibilité activé. Je vais vous lire le menu.')
        msg.lang = 'fr-FR'
        msg.rate = 0.9
        msg.onend = () => lireMenuComplet(categories)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(msg)
      } else {
        window.speechSynthesis.cancel()
      }
      return !prev
    })
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [slideIdx, setSlideIdx] = useState(0)

  function dismissOnboarding() {
    setShowOnboarding(false)
  }
  function reopenOnboarding() {
    setSlideIdx(0)
    setShowOnboarding(true)
  }

  // ── useEffects ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableId) return
    getTableQR(tableId)
      .then(r => {
        setTable(r.data.table)
        setMenu(r.data.menu)
        if (r.data.stripe_publishable_key)
          setStripePromise(loadStripe(r.data.stripe_publishable_key))
      })
      .catch(() => setErreur('Table introuvable ou menu indisponible.'))
  }, [tableId])

  useEffect(() => {
    if (etape !== 4 || !commandeId) return
    const interval = setInterval(async () => {
      try {
        const r = await statutCommandeQR(commandeId)
        setSuivi(r.data)
        if (r.data.statut === 'prete' || r.data.statut === 'cloturee') clearInterval(interval)
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [etape, commandeId])

  // ── Panier helpers ────────────────────────────────────────────────────────
  function ajouterPlat(plat) {
    setPanier(p => ({
      ...p,
      [plat.id]: p[plat.id]
        ? { ...p[plat.id], quantite: p[plat.id].quantite + 1 }
        : { plat, quantite: 1, note: '' },
    }))
    setPanierPulse(true)
    setTimeout(() => setPanierPulse(false), 400)
    speak(`${plat.nom} ajouté à votre commande.`)
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
  function viderPanier() { setPanier({}) }

  const lignesPanier   = Object.values(panier)
  const totalBrut      = lignesPanier.reduce((s, l) => s + l.plat.prix * l.quantite, 0)
  const reductionPct   = gainChoisi?.valeur ?? 0
  const montantRemise  = reductionPct > 0 ? +(totalBrut * reductionPct / 100).toFixed(2) : 0
  const total          = +(totalBrut - montantRemise).toFixed(2)
  const nbArticles     = lignesPanier.reduce((s, l) => s + l.quantite, 0)
  const pointsEstimes  = Math.floor(total / 20)
  const menuFiltré = (categorieActive ? menu.filter(c => c.id === categorieActive) : menu).map(cat => ({
    ...cat,
    plats: cat.plats.filter(p =>
      (!filtreVege || p.vegetarien) &&
      (!filtreSansGluten || p.sans_gluten)
    ),
  })).filter(cat => cat.plats.length > 0)

  // ── Fidélité handlers ─────────────────────────────────────────────────────
  async function loadPrizes(clientId) {
    try {
      const r = await getClientPrizes(clientId)
      setPrizesDispos(r.data)
    } catch { setPrizesDispos([]) }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setFideliteLoading(true); setFideliteErreur(null)
    try {
      const r = await clientLogin(loginForm)
      setClientFideliteId(r.data.client.id)
      setClientPrenom(r.data.client.prenom)
      setShowFidelite(false)
      loadPrizes(r.data.client.id)
    } catch (err) {
      setFideliteErreur(err.response?.data?.detail || 'Email ou mot de passe incorrect')
    } finally { setFideliteLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (registerForm.password.length < 6) { setFideliteErreur('Minimum 6 caractères.'); return }
    setFideliteLoading(true); setFideliteErreur(null)
    try {
      const r = await clientRegister(registerForm)
      if (r.data.requires_email_verification) {
        setFideliteErreur('Compte créé ! Vérifiez votre email pour activer les points fidélité.')
        return
      }
      setClientFideliteId(r.data.client.id)
      setClientPrenom(r.data.client.prenom)
      setShowFidelite(false)
    } catch (err) {
      setFideliteErreur(err.response?.data?.detail || 'Erreur lors de la création du compte')
    } finally { setFideliteLoading(false) }
  }

  // ── Payment handlers ──────────────────────────────────────────────────────
  function buildCommandePayload() {
    return {
      table_id: parseInt(tableId),
      lignes: lignesPanier.map(l => ({ plat_id: l.plat.id, quantite: l.quantite, note: l.note || null })),
      client_fidelite_id: clientFideliteId || null,
      gain_id: gainChoisi?.gain_id || null,
    }
  }

  async function handlePasserEspeces() {
    if (!lignesPanier.length) return
    setLoading(true); setErreur(null)
    try {
      const r1 = await creerCommandeQR(buildCommandePayload())
      const cmdId = r1.data.commande_id
      setCommandeId(cmdId)
      const r2 = await payerEspeces(cmdId)
      setMode('especes')
      setSuivi({ statut: 'envoyee', statut_label: 'En attente du serveur', montant_total: r2.data.montant, code_unique: r2.data.code_unique, lignes: [] })
      setEtape(4)
    } catch (e) {
      setErreur(e.response?.data?.detail || 'Erreur lors de l\'envoi de la commande.')
    } finally { setLoading(false) }
  }

  async function handlePasserCarte() {
    if (!lignesPanier.length) return
    if (!stripePromise) { setErreur('Paiement par carte indisponible.'); return }
    setLoading(true); setErreur(null)
    try {
      const r1 = await creerCommandeQR(buildCommandePayload())
      const cmdId = r1.data.commande_id
      setCommandeId(cmdId)
      const r2 = await createPaymentIntent(cmdId)
      setClientSecret(r2.data.client_secret)
      setMode('carte')
      setEtape(3)
    } catch (e) {
      setErreur(e.response?.data?.detail || 'Erreur lors de la création de commande.')
    } finally { setLoading(false) }
  }

  function handleStripeSuccess() {
    setSuivi({ statut: 'envoyee', statut_label: 'En attente de préparation', montant_total: total, lignes: [] })
    setEtape(4)
  }
  function handleStripeError(msg) { setErreur(msg) }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tableId)               return <Ecran><p className="text-red-400 text-sm">{tr.aucuneTable}</p></Ecran>
  if (erreur && !menu.length) return <Ecran><p className="text-red-400 text-sm">{tr.tableIntrouvable}</p></Ecran>
  if (!table)                 return <Ecran><Loader2 size={32} className="animate-spin" style={{ color: '#e8824a' }} /></Ecran>

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: '#0a1408', color: '#f5f0e8', fontFamily: "'Inter', sans-serif" }}>

      {/* ── ONBOARDING POPUP ──────────────────────────────────────────────── */}
      {showOnboarding && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) dismissOnboarding() }}
        >
          <div
            className="w-full relative flex flex-col"
            style={{
              maxWidth: 400,
              background: '#111f0f',
              border: '1px solid rgba(232,130,74,0.2)',
              borderRadius: 24,
              padding: '32px 28px 28px',
            }}
          >
            <button
              onClick={dismissOnboarding}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(245,240,232,0.06)', color: '#a89880' }}
            >
              <X size={15} strokeWidth={2} />
            </button>
            <div className="text-center mb-6">
              <div className="inline-block text-sm font-bold tracking-widest px-4 py-1.5 rounded-full"
                   style={{ background: 'rgba(232,130,74,0.1)', color: '#e8824a', border: '1px solid rgba(232,130,74,0.2)' }}>
                SKY07
              </div>
            </div>
            <div className="text-center mb-8" style={{ minHeight: 160 }}>
              <div className="text-6xl mb-5" style={{ lineHeight: 1 }}>{slides[slideIdx].emoji}</div>
              <h3 className="text-xl font-bold mb-3"
                  style={{ fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : "'Playfair Display', serif", color: slides[slideIdx].color }}>
                {slides[slideIdx].title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#a89880' }}>
                {slides[slideIdx].body}
              </p>
            </div>
            <div className="flex justify-center gap-2 mb-6">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlideIdx(i)}
                  className="rounded-full transition-all duration-200"
                  style={{ width: i === slideIdx ? 24 : 8, height: 8, background: i === slideIdx ? '#e8824a' : 'rgba(245,240,232,0.15)' }} />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={dismissOnboarding}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid rgba(245,240,232,0.1)', color: '#a89880', background: 'transparent' }}>
                {tr.passer}
              </button>
              <button
                onClick={() => { if (slideIdx < slides.length - 1) setSlideIdx(s => s + 1); else dismissOnboarding() }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#e8824a', color: '#0a1408', boxShadow: '0 4px 16px rgba(232,130,74,0.35)', fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : 'inherit' }}
              >
                {slideIdx < slides.length - 1
                  ? <><ChevronRight size={16} strokeWidth={2.5} style={lang === 'ar' ? {transform:'scaleX(-1)'} : {}} /> {tr.suivant}</>
                  : <>{tr.commencer} <UtensilsCrossed size={14} strokeWidth={2} /></>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER (étapes 2-4) ───────────────────────────────────────────── */}
      {etape !== 1 && (
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
          style={{ background: 'rgba(10,20,8,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(232,130,74,0.12)' }}
        >
          <button
            onClick={() => etape === 2 ? navigate(`/commande?table=${tableId}`) : setEtape(etape - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(245,240,232,0.06)', color: '#a89880' }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <div className="flex-1">
            <p className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif", color: '#e8824a' }}>SKY07</p>
            <p className="text-xs" style={{ color: '#a89880' }}>Table {table.numero} · {table.emplacement}</p>
          </div>
          {etape === 2 && nbArticles > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                 style={{ background: 'rgba(232,130,74,0.1)', color: '#e8824a', border: '1px solid rgba(232,130,74,0.2)' }}>
              <ShoppingCart size={13} strokeWidth={2} /> {nbArticles}
            </div>
          )}
        </header>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 1 — MENU
      ══════════════════════════════════════════════════════════════════════ */}
      {etape === 1 && (
        <div>
          <style>{`
            @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
            .card-plat { animation: fadeUp 0.4s ease forwards; opacity:0; }
            .hide-scrollbar::-webkit-scrollbar { display:none; }
            .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
            .plat-img { transition: transform 0.4s ease; }
            .card-plat:hover .plat-img { transform:scale(1.06); }
          `}</style>

          {/* Header menu sticky */}
          <div className="sticky top-0 z-30 px-4 pt-8 pb-4"
               style={{ background: 'linear-gradient(to bottom, #0a1408 80%, transparent)' }}>
            <div className="flex items-center justify-between mb-3">

              {/* Bouton retour */}
              <button onClick={() => navigate(`/commande?table=${tableId}`)}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(245,240,232,0.06)', color: '#a89880' }}>
                <ArrowLeft size={16} strokeWidth={1.75} />
              </button>

              {/* Logo */}
              <div className="text-center">
                <h1 className="text-3xl font-black tracking-wider select-none"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#e8824a', textShadow: '0 0 32px rgba(232,130,74,0.5)' }}>
                  SKY07
                </h1>
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                     style={{ background: 'rgba(232,130,74,0.1)', border: '1px solid rgba(232,130,74,0.2)', color: '#e8824a', letterSpacing: '0.1em' }}>
                  <MapPin size={10} strokeWidth={2} />
                  Table {table.numero} · {table.emplacement}
                </div>
              </div>

              {/* Boutons aide + fidélité */}
              <div className="flex flex-col items-end gap-1.5">
                <button onClick={reopenOnboarding}
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                  style={{ background: 'rgba(245,240,232,0.06)', color: '#a89880' }}
                  title="Voir le guide">
                  <HelpCircle size={15} strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => { setShowFidelite(f => !f); setEtape(1) }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                  style={clientFideliteId
                    ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
                    : { background: 'rgba(232,130,74,0.08)', color: '#e8824a', border: '1px solid rgba(232,130,74,0.2)' }
                  }
                  title="Espace fidélité">
                  <Star size={10} strokeWidth={2} />
                  {clientFideliteId ? clientPrenom : tr.fidelite}
                </button>
              </div>
            </div>

            {/* Tabs catégories */}
            <div className="overflow-x-auto hide-scrollbar -mx-1 px-1">
              <div className="flex gap-2 w-max py-1">
                <button onClick={() => setCategorieActive(null)}
                  className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200"
                  style={categorieActive === null
                    ? { background: '#e8824a', color: '#0a1408', boxShadow: '0 3px 14px rgba(232,130,74,0.4)' }
                    : { border: '1px solid rgba(232,130,74,0.25)', color: 'rgba(245,240,232,0.6)', background: 'transparent' }
                  }>
                  <UtensilsCrossed size={12} strokeWidth={2} /> {tr.tout}
                </button>
                {menu.map(cat => (
                  <button key={cat.id} onClick={() => setCategorieActive(cat.id)}
                    className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200"
                    style={categorieActive === cat.id
                      ? { background: '#e8824a', color: '#0a1408', boxShadow: '0 3px 14px rgba(232,130,74,0.4)' }
                      : { border: '1px solid rgba(232,130,74,0.25)', color: 'rgba(245,240,232,0.6)', background: 'transparent' }
                    }>
                    {cat.nom}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Panel fidélité (caché, accessible via bouton) */}
          {showFidelite && (
            <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.18)' }}>
              {clientFideliteId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check size={16} strokeWidth={2} style={{ color: '#4ade80' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Connecté — {clientPrenom}</p>
                      <p className="text-xs" style={{ color: 'rgba(74,222,128,0.6)' }}>Points crédités après paiement</p>
                    </div>
                  </div>
                  <button onClick={() => { setClientFideliteId(null); setClientPrenom(null) }}
                    className="text-xs" style={{ color: '#a89880' }}>
                    Déconnexion
                  </button>
                </div>
              ) : (
                <FideliteForm
                  mode={fideliteMode} setMode={setFideliteMode}
                  loginForm={loginForm} setLoginForm={setLoginForm}
                  registerForm={registerForm} setRegisterForm={setRegisterForm}
                  loading={fideliteLoading} erreur={fideliteErreur}
                  onLogin={handleLogin} onRegister={handleRegister}
                />
              )}
            </div>
          )}

          {/* Filtres rapides */}
          <div className="flex gap-2 px-4 mb-4">
            <button
              onClick={() => setFiltreVege(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${filtreVege ? 'bg-green-500 border-green-500 text-white' : 'border-green-500/40 text-green-400 bg-transparent'}`}
            >
              <Leaf size={11} /> {tr.vegetarien}
            </button>
            <button
              onClick={() => setFiltreSansGluten(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${filtreSansGluten ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-500/40 text-amber-400 bg-transparent'}`}
            >
              <Wheat size={11} /> {tr.sansGluten}
            </button>
          </div>

          {/* Tendances de la semaine */}
          {!categorieActive && !filtreVege && !filtreSansGluten && (
            <div className="mb-2">
              <TrendingSection
                showAdd
                onAddToCart={plat => ajouterPlat(plat)}
              />
            </div>
          )}

          {/* Grille des plats */}
          <div className="px-4 pb-36">
            {menuFiltré.map((cat, catIdx) => (
              <div key={cat.id} className="mb-10">
                {!categorieActive && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(232,130,74,0.7)' }}>
                      {cat.nom}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(232,130,74,0.1)' }} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {cat.plats.map((plat, platIdx) => {
                    const qte = panier[plat.id]?.quantite || 0
                    return (
                      <div key={plat.id}
                        className="card-plat flex flex-col rounded-2xl overflow-hidden"
                        onClick={() => { if (accessMode) speak(`${plat.nom}. ${plat.description || ''}. Prix : ${plat.prix} dirhams.`) }}
                        style={{
                          animationDelay: `${(catIdx * 6 + platIdx) * 45}ms`,
                          background: '#111f0f',
                          border: qte > 0 ? '1.5px solid rgba(232,130,74,0.5)' : '1px solid rgba(245,240,232,0.06)',
                          boxShadow: qte > 0 ? '0 0 16px rgba(232,130,74,0.1)' : 'none',
                          transition: 'border-color 200ms, box-shadow 200ms',
                          cursor: accessMode ? 'pointer' : 'default',
                        }}>
                        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                          <img src={getImageUrl(plat, cat.nom)} alt={plat.nom} className="plat-img w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,20,8,0.7) 0%, transparent 50%)' }} />
                          {qte > 0 && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                                 style={{ background: '#e8824a', color: '#0a1408' }}>
                              {qte}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 p-3 flex-1">
                          <div>
                            <p className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: '#f5f0e8' }}>{plat.nom}</p>
                            {plat.description && (
                              <p className="text-xs mt-1 line-clamp-2 leading-snug" style={{ color: '#a89880' }}>{plat.description}</p>
                            )}
                          </div>
                          {/* Badges végétarien */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {plat.vegetarien && <span className="text-xs text-green-400" title="Végétarien">🌿</span>}
                            {plat.sans_gluten && <span className="text-xs text-amber-400" title="Sans gluten">🌾</span>}
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-bold text-base" style={{ color: '#e8824a' }}>{plat.prix} Dh</span>
                            {qte === 0 ? (
                              <button onClick={() => ajouterPlat(plat)}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
                                style={{ background: '#e8824a', color: '#0a1408', boxShadow: '0 3px 12px rgba(232,130,74,0.4)' }}>
                                <span style={{ fontSize: 20, lineHeight: 1, fontWeight: 700 }}>+</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => retirerPlat(plat.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ border: '1px solid rgba(232,130,74,0.35)', color: '#e8824a' }}>
                                  <Minus size={12} strokeWidth={2.5} />
                                </button>
                                <span className="text-sm font-bold w-4 text-center" style={{ color: '#f5f0e8' }}>{qte}</span>
                                <button onClick={() => ajouterPlat(plat)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ background: '#e8824a', color: '#0a1408' }}>
                                  <Plus size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
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
              <button onClick={() => { setEtape(2); speak(`Votre panier contient ${nbArticles} plats pour un total de ${total.toFixed(0)} dirhams.`) }}
                className="w-full rounded-2xl py-4 px-5 font-bold text-sm flex items-center justify-between transition-transform duration-200"
                style={{
                  background: '#e8824a', color: '#0a1408',
                  boxShadow: '0 8px 32px rgba(232,130,74,0.45)',
                  transform: panierPulse ? 'scale(1.03)' : 'scale(1)',
                }}>
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                        style={{ background: 'rgba(10,20,8,0.2)' }}>{nbArticles}</span>
                  {tr.voirPanier}
                </span>
                <span className="font-black text-base">{total.toFixed(0)} Dh</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 2 — PANIER
      ══════════════════════════════════════════════════════════════════════ */}
      {etape === 2 && (
        <div className="max-w-lg mx-auto px-4 py-6">

          {/* Titre + vider */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', serif", color: '#f5f0e8' }}>
              <ShoppingCart size={20} strokeWidth={1.75} style={{ color: '#e8824a' }} />
              {tr.votreCommande}
            </h2>
            {lignesPanier.length > 0 && (
              <button onClick={viderPanier}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                <Trash2 size={13} strokeWidth={2} /> {tr.toutVider}
              </button>
            )}
          </div>

          {/* Lignes panier */}
          <div className="flex flex-col gap-3 mb-5">
            {lignesPanier.map(({ plat, quantite, note }) => (
              <div key={plat.id} className="rounded-2xl p-4"
                   style={{ background: '#111f0f', border: '1px solid rgba(245,240,232,0.06)' }}>
                <div className="flex items-center gap-3">
                  <img src={getImageUrl(plat, '')} alt={plat.nom}
                       className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#f5f0e8' }}>{plat.nom}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#a89880' }}>
                      {plat.prix} Dh × {quantite} ={' '}
                      <strong style={{ color: '#e8824a' }}>{(plat.prix * quantite).toFixed(0)} Dh</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => retirerPlat(plat.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8' }}>
                      <Minus size={12} strokeWidth={2} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center" style={{ color: '#f5f0e8' }}>{quantite}</span>
                    <button onClick={() => ajouterPlat(plat)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: '#e8824a', color: '#0a1408' }}>
                      <Plus size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <input placeholder="Note (sans oignon, bien cuit…)"
                  value={note}
                  onChange={e => modifierNote(plat.id, e.target.value)}
                  className="mt-3 w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.08)', color: '#a89880' }} placeholder={tr.notePlaceholder} />
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="rounded-2xl p-4 mb-4"
               style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.15)' }}>
            <div className="flex justify-between text-sm mb-2" style={{ color: '#a89880' }}>
              <span>{tr.sousTotal}</span><span>{totalBrut.toFixed(0)} Dh</span>
            </div>
            {gainChoisi && (
              <div className="flex justify-between text-sm mb-2" style={{ color: '#B8963E' }}>
                <span>{tr.reduction} {gainChoisi.valeur}% ({gainChoisi.nom})</span>
                <span>-{montantRemise.toFixed(0)} Dh</span>
              </div>
            )}
            <div className="h-px mb-2" style={{ background: 'rgba(245,240,232,0.06)' }} />
            <div className="flex justify-between font-bold text-lg" style={{ color: '#f5f0e8' }}>
              <span>{gainChoisi ? tr.totalApres : tr.total}</span>
              <span style={{ color: '#e8824a' }}>{total.toFixed(0)} Dh</span>
            </div>
          </div>

          {/* Section fidélité (discrète) */}
          <button
            onClick={() => setShowFidelite(f => !f)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-3 transition-all"
            style={{
              background: clientFideliteId ? 'rgba(74,222,128,0.07)' : 'rgba(232,130,74,0.06)',
              border: `1px solid ${clientFideliteId ? 'rgba(74,222,128,0.2)' : 'rgba(232,130,74,0.15)'}`,
            }}>
            <div className="flex items-center gap-2">
              <Star size={14} strokeWidth={1.75} style={{ color: clientFideliteId ? '#4ade80' : '#e8824a' }} />
              <span className="text-sm font-medium" style={{ color: clientFideliteId ? '#4ade80' : '#e8824a' }}>
                {clientFideliteId
                  ? `${tr.connecte} — ${clientPrenom} · +${pointsEstimes} ${tr.pointsEstimes}`
                  : tr.fideliteTitle}
              </span>
            </div>
            {showFidelite ? <ChevronUp size={15} style={{ color: '#a89880' }} /> : <ChevronDown size={15} style={{ color: '#a89880' }} />}
          </button>

          {showFidelite && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.15)' }}>
              {clientFideliteId ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>✓ {tr.connecte} — {clientPrenom}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(74,222,128,0.6)' }}>+{pointsEstimes} {tr.pointsCredites}</p>
                  </div>
                  <button onClick={() => { setClientFideliteId(null); setClientPrenom(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgba(245,240,232,0.1)', color: '#a89880' }}>
                    {tr.deconnexion}
                  </button>
                </div>
              ) : (
                <FideliteForm
                  mode={fideliteMode} setMode={setFideliteMode}
                  loginForm={loginForm} setLoginForm={setLoginForm}
                  registerForm={registerForm} setRegisterForm={setRegisterForm}
                  loading={fideliteLoading} erreur={fideliteErreur}
                  onLogin={handleLogin} onRegister={handleRegister}
                />
              )}
            </div>
          )}

          {/* ── Réductions disponibles (si connecté et prizes dispo) ── */}
          {clientFideliteId && prizesDispos.length > 0 && (
            <div className="rounded-2xl p-4 mb-3" style={{ background: '#111f0f', border: '1px solid rgba(184,150,62,0.25)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B8963E' }}>
                {tr.mesFidelite}
              </p>
              <div className="flex flex-col gap-2">
                {prizesDispos.map(p => {
                  const selected = gainChoisi?.gain_id === p.gain_id
                  return (
                    <button key={p.gain_id} onClick={() => setGainChoisi(selected ? null : p)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                      style={{
                        background: selected ? 'rgba(184,150,62,0.15)' : 'rgba(245,240,232,0.04)',
                        border: `1.5px solid ${selected ? '#B8963E' : 'rgba(184,150,62,0.2)'}`,
                        color: selected ? '#B8963E' : '#f5f0e8',
                      }}>
                      <span>{p.nom}</span>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>-{p.valeur}%</span>
                    </button>
                  )
                })}
              </div>
              {gainChoisi && (
                <p className="text-xs mt-2" style={{ color: 'rgba(184,150,62,0.7)' }}>
                  {tr.gainAppli} {montantRemise.toFixed(0)} Dh
                </p>
              )}
            </div>
          )}

          {erreur && <p className="text-red-400 text-sm mb-4 text-center">{erreur}</p>}

          {/* 2 boutons de paiement */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handlePasserCarte}
              disabled={loading || !lignesPanier.length}
              className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: '#e8824a', color: '#0a1408', boxShadow: '0 4px 20px rgba(232,130,74,0.35)', fontSize: 15 }}>
              {loading && modePaiement !== 'especes'
                ? <Loader2 size={16} className="animate-spin" />
                : <CreditCard size={17} strokeWidth={1.75} />}
              {tr.payerCarte}
            </button>
            <button
              onClick={handlePasserEspeces}
              disabled={loading || !lignesPanier.length}
              className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: 'transparent', color: '#f5f0e8', border: '1.5px solid rgba(245,240,232,0.15)', fontSize: 15 }}>
              {loading && modePaiement === 'especes'
                ? <Loader2 size={16} className="animate-spin" />
                : <Banknote size={17} strokeWidth={1.75} />}
              {tr.payerEspeces}
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(168,152,128,0.5)' }}>
            Pour espèces : commande envoyée, paiement à la caisse
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 3 — PAIEMENT CARTE (STRIPE)
      ══════════════════════════════════════════════════════════════════════ */}
      {etape === 3 && (
        <div className="max-w-lg mx-auto px-4 py-8">
          {!stripePromise || !clientSecret ? (
            <div className="text-center py-12">
              <AlertTriangle size={44} style={{ color: '#e8824a', margin: '0 auto 16px' }} />
              <p className="font-semibold text-lg mb-2" style={{ color: '#f5f0e8' }}>{tr.paiementIndispo}</p>
              <p className="text-sm mb-6" style={{ color: '#a89880' }}>Stripe configuration missing.</p>
              <button onClick={() => setEtape(2)} className="text-sm underline" style={{ color: '#a89880' }}>
                {tr.revenirEspeces}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Récap commande */}
              <div className="rounded-2xl p-4" style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.12)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,130,74,0.6)' }}>
                  {tr.recapitulatif}
                </p>
                <div className="flex flex-col gap-2 mb-3">
                  {lignesPanier.map(({ plat, quantite }) => (
                    <div key={plat.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: '#a89880' }}>{quantite}× {plat.nom}</span>
                      <span style={{ color: '#e8824a' }}>{(plat.prix * quantite).toFixed(0)} Dh</span>
                    </div>
                  ))}
                </div>
                <div className="h-px mb-2" style={{ background: 'rgba(245,240,232,0.06)' }} />
                <div className="flex justify-between font-bold" style={{ color: '#f5f0e8' }}>
                  <span>{tr.total}</span>
                  <span style={{ color: '#e8824a' }}>{total.toFixed(0)} Dh</span>
                </div>
              </div>

              {/* Fidélité dans Stripe */}
              {clientFideliteId ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                     style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <Check size={15} strokeWidth={2} style={{ color: '#4ade80', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: '#4ade80' }}>
                    <strong>{clientPrenom}</strong> · +{pointsEstimes} {tr.pointsCredites}
                  </p>
                </div>
              ) : (
                <button onClick={() => setShowFidelite(f => !f)}
                  className="flex items-center gap-2 text-xs transition-all self-start px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(232,130,74,0.06)', border: '1px solid rgba(232,130,74,0.15)', color: '#a89880' }}>
                  <Star size={12} strokeWidth={1.75} style={{ color: '#e8824a' }} />
                  {tr.ajouterFidelite}
                  {showFidelite ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}

              {showFidelite && !clientFideliteId && (
                <div className="rounded-2xl p-4" style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.15)' }}>
                  <FideliteForm
                    mode={fideliteMode} setMode={setFideliteMode}
                    loginForm={loginForm} setLoginForm={setLoginForm}
                    registerForm={registerForm} setRegisterForm={setRegisterForm}
                    loading={fideliteLoading} erreur={fideliteErreur}
                    onLogin={handleLogin} onRegister={handleRegister}
                  />
                </div>
              )}

              {/* Formulaire Stripe */}
              <div className="rounded-2xl p-5" style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.12)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={14} strokeWidth={1.75} style={{ color: '#e8824a' }} />
                  <p className="font-semibold text-sm" style={{ color: '#f5f0e8' }}>{tr.paiementSecurise}</p>
                </div>
                {erreur && <p className="text-red-400 text-sm mb-4">{erreur}</p>}
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <FormulaireStripe
                    clientSecret={clientSecret}
                    commandeId={commandeId}
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                  />
                </Elements>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 4 — CONFIRMATION / SUIVI
      ══════════════════════════════════════════════════════════════════════ */}
      {etape === 4 && suivi && (
        <div className="max-w-md mx-auto px-4 py-12 text-center">

          {/* Icône */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
               style={{
                 background: suivi.statut === 'prete' ? 'rgba(74,222,128,0.1)' : 'rgba(232,130,74,0.1)',
                 border: `2px solid ${suivi.statut === 'prete' ? 'rgba(74,222,128,0.35)' : 'rgba(232,130,74,0.35)'}`,
               }}>
            {suivi.statut === 'prete'
              ? <PartyPopper size={36} style={{ color: '#4ade80' }} />
              : suivi.statut === 'en_preparation'
              ? <ChefHat size={36} style={{ color: '#e8824a' }} />
              : modePaiement === 'especes'
              ? <Clock size={36} style={{ color: '#e8824a' }} />
              : <Check size={36} style={{ color: '#4ade80' }} />
            }
          </div>

          <h2 className="text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: '#f5f0e8' }}>
            {modePaiement === 'especes' ? tr.commandeEnvoyee : tr.commandeConfirmee}
          </h2>

          <p className="font-mono text-sm mb-4" style={{ color: '#a89880' }}>{suivi.code_unique}</p>

          {/* Statut badge */}
          <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold mb-6"
               style={suivi.statut === 'prete'
                 ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
                 : suivi.statut === 'en_preparation'
                 ? { background: 'rgba(232,130,74,0.1)', color: '#e8824a', border: '1px solid rgba(232,130,74,0.25)' }
                 : { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }
               }>
            {suivi.statut_label}
          </div>

          {/* Message espèces */}
          {modePaiement === 'especes' && (
            <div className="rounded-2xl p-5 mb-5 text-left"
                 style={{ background: '#111f0f', border: '1px solid rgba(232,130,74,0.15)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#f5f0e8' }}>
                {tr.especesInfo}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#a89880' }}>
                {tr.especesDetail}
              </p>
              <div className="mt-4 pt-4 flex items-start gap-3"
                   style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}>
                <Star size={16} strokeWidth={1.75} style={{ color: '#e8824a', flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs leading-relaxed" style={{ color: '#a89880' }}>
                  {tr.fideliteInfo}
                </p>
              </div>
            </div>
          )}

          {/* Détail commande */}
          {suivi.lignes?.length > 0 && (
            <div className="rounded-2xl p-4 text-left mb-4"
                 style={{ background: '#111f0f', border: '1px solid rgba(245,240,232,0.07)' }}>
              {suivi.lignes.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-2"
                     style={{ borderBottom: i < suivi.lignes.length - 1 ? '1px solid rgba(245,240,232,0.05)' : 'none' }}>
                  <span style={{ color: '#a89880' }}>{l.quantite}× {l.nom}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl p-4 text-left mb-4"
               style={{ background: '#111f0f', border: '1px solid rgba(245,240,232,0.07)' }}>
            <div className="flex justify-between font-bold" style={{ color: '#f5f0e8' }}>
              <span>{modePaiement === 'especes' ? tr.totalAPayer : tr.totalPaye}</span>
              <span style={{ color: '#e8824a' }}>{suivi.montant_total?.toFixed(0)} Dh</span>
            </div>
          </div>

          {/* Points crédités (carte) */}
          {modePaiement === 'carte' && clientFideliteId && pointsEstimes > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-left"
                 style={{ background: 'rgba(232,130,74,0.08)', border: '1px solid rgba(232,130,74,0.2)' }}>
              <Star size={15} strokeWidth={1.75} style={{ color: '#e8824a', flexShrink: 0 }} />
              <p className="text-sm font-medium" style={{ color: '#e8824a' }}>+{pointsEstimes} points crédités sur votre compte</p>
            </div>
          )}

          {/* Polling info */}
          {suivi.statut !== 'prete' && suivi.statut !== 'cloturee' && (
            <p className="text-xs mb-5" style={{ color: '#a89880' }}>
              {modePaiement === 'carte' ? tr.misAJour : tr.serveurArriveTable}
            </p>
          )}
          {suivi.statut === 'prete' && (
            <p className="text-xs mb-5 font-medium" style={{ color: '#4ade80' }}>
              {tr.commandePrete}
            </p>
          )}

          <a href="/client/login" className="text-xs" style={{ color: 'rgba(232,130,74,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e8824a'; e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,130,74,0.5)'; e.currentTarget.style.textDecoration = 'none' }}>
            {tr.accesEspaceFidelite}
          </a>
        </div>
      )}

      {/* ── BOUTON ACCESSIBILITÉ FLOTTANT ─────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: accessMode ? '#5A6B47' : '#A0714F', fontWeight: 600, letterSpacing: '0.04em', userSelect: 'none' }}>
          Accessibilité
        </span>
        <button
          onClick={toggleAccessMode}
          title={accessMode ? 'Désactiver le mode accessibilité' : 'Activer le mode accessibilité'}
          aria-pressed={accessMode}
          aria-label="Mode accessibilité — lecture vocale du menu"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: accessMode ? '#5A6B47' : '#A0714F',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: accessMode
              ? '0 4px 18px rgba(90,107,71,0.55)'
              : '0 4px 18px rgba(160,113,79,0.45)',
            transition: 'background 0.25s, box-shadow 0.25s',
          }}
        >
          🎧
        </button>
      </div>
    </div>
  )
}

// ── Formulaire fidélité réutilisable ─────────────────────────────────────────
function FideliteForm({ mode, setMode, loginForm, setLoginForm, registerForm, setRegisterForm, loading, erreur, onLogin, onRegister }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-xl p-1" style={{ background: 'rgba(245,240,232,0.04)' }}>
        {[{ id: 'login', label: "J'ai un compte" }, { id: 'register', label: 'Créer un compte' }].map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={mode === t.id ? { background: '#e8824a', color: '#0a1408' } : { background: 'transparent', color: '#a89880' }}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'login' && (
        <form onSubmit={onLogin} className="flex flex-col gap-2">
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a89880' }} />
            <input type="email" required placeholder="Email" value={loginForm.email}
              onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }} />
          </div>
          <div className="relative">
            <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a89880' }} />
            <input type="password" required placeholder="Mot de passe" value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }} />
          </div>
          {erreur && <p className="text-red-400 text-xs">{erreur}</p>}
          <button type="submit" disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
            style={{ background: '#e8824a', color: '#0a1408' }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <User size={13} strokeWidth={1.75} />}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={onRegister} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Prénom *" value={registerForm.prenom}
              onChange={e => setRegisterForm(f => ({ ...f, prenom: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, fontSize: 13 }} />
            <input placeholder="Nom" value={registerForm.nom}
              onChange={e => setRegisterForm(f => ({ ...f, nom: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, fontSize: 13 }} />
          </div>
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a89880' }} />
            <input placeholder="Téléphone" value={registerForm.telephone}
              onChange={e => setRegisterForm(f => ({ ...f, telephone: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }} />
          </div>
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a89880' }} />
            <input type="email" required placeholder="Email *" value={registerForm.email}
              onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }} />
          </div>
          <div className="relative">
            <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a89880' }} />
            <input type="password" required placeholder="Mot de passe (min. 6 car.) *" value={registerForm.password}
              onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }} />
          </div>
          {erreur && <p className="text-red-400 text-xs">{erreur}</p>}
          <button type="submit" disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
            style={{ background: '#e8824a', color: '#0a1408' }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <User size={13} strokeWidth={1.75} />}
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}
    </div>
  )
}
