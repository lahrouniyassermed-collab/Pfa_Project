import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTableQR, creerCommandeQR, createPaymentIntent, confirmerPaiement, payerEspeces, statutCommandeQR, inscrireClient } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const MODES_PAIEMENT = [
  { id: 'carte',   label: 'Carte bancaire', icon: '💳' },
  { id: 'especes', label: 'Espèces (à la caisse)', icon: '💵' },
]

// ── Formulaire carte Stripe ───────────────────────────────────────────────
function FormulaireStripe({ clientSecret, commandeId, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    })

    if (error) {
      onError(error.message)
      setLoading(false)
      return
    }

    if (paymentIntent.status === 'succeeded') {
      try {
        await confirmerPaiement(commandeId, {
          payment_intent_id: paymentIntent.id,
          mode: 'carte'
        })
        onSuccess(paymentIntent.id)
      } catch (e) {
        onError(e.response?.data?.detail || 'Erreur confirmation')
      }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
        <CardElement options={{
          style: {
            base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9CA3AF' } },
            invalid: { color: '#EF4444' }
          }
        }} />
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1">
        🔒 Paiement sécurisé par Stripe
      </p>
      <button type="submit" disabled={!stripe || loading}
        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-50">
        {loading ? 'Traitement…' : 'Confirmer le paiement'}
      </button>
      <p className="text-center text-xs text-gray-400">
        Test : <span className="font-mono">4242 4242 4242 4242</span> · 12/26 · 123
      </p>
    </form>
  )
}

// ── Étapes ────────────────────────────────────────────────────────────────
// 1 = menu  2 = panier  3 = paiement  4 = suivi  5 = fidélité (optionnel)

export default function CommandeQR() {
  const [params] = useSearchParams()
  const tableId = params.get('table')

  const [etape, setEtape]           = useState(1)
  const [table, setTable]           = useState(null)
  const [menu, setMenu]             = useState([])
  const [stripePromise, setStripePromise] = useState(null)
  const [panier, setPanier]         = useState({})
  const [modePaiement, setMode]     = useState('carte')
  const [commandeId, setCommandeId] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [suivi, setSuivi]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [erreur, setErreur]         = useState(null)

  // Fidélité
  const [fideliteForm, setFideliteForm] = useState({ prenom: '', nom: '', telephone: '', email: '', accept_emails: false, date_naissance: '' })
  const [fideliteEnvoye, setFideliteEnvoye] = useState(false)
  const [fideliteErreur, setFideliteErreur] = useState(null)

  // ── Chargement table + menu + clé Stripe ─────────────────────────────
  useEffect(() => {
    if (!tableId) return
    getTableQR(tableId)
      .then(r => {
        setTable(r.data.table)
        setMenu(r.data.menu)
        if (r.data.stripe_publishable_key) {
          setStripePromise(loadStripe(r.data.stripe_publishable_key))
        }
      })
      .catch(() => setErreur("Table introuvable ou menu indisponible."))
  }, [tableId])

  // ── Polling statut commande ───────────────────────────────────────────
  useEffect(() => {
    if (etape !== 4 || !commandeId) return
    const interval = setInterval(async () => {
      try {
        const r = await statutCommandeQR(commandeId)
        setSuivi(r.data)
        if (r.data.statut === 'prete' || r.data.statut === 'cloturee') {
          clearInterval(interval)
        }
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [etape, commandeId])

  // ── Panier ────────────────────────────────────────────────────────────
  function ajouterPlat(plat) {
    setPanier(p => ({
      ...p,
      [plat.id]: p[plat.id]
        ? { ...p[plat.id], quantite: p[plat.id].quantite + 1 }
        : { plat, quantite: 1, note: '' }
    }))
  }

  function retirerPlat(platId) {
    setPanier(p => {
      const item = p[platId]
      if (!item) return p
      if (item.quantite <= 1) {
        const { [platId]: _, ...reste } = p
        return reste
      }
      return { ...p, [platId]: { ...item, quantite: item.quantite - 1 } }
    })
  }

  function modifierNote(platId, note) {
    setPanier(p => ({ ...p, [platId]: { ...p[platId], note } }))
  }

  const lignesPanier = Object.values(panier)
  const total = lignesPanier.reduce((s, l) => s + l.plat.prix * l.quantite, 0)
  const nbArticles = lignesPanier.reduce((s, l) => s + l.quantite, 0)

  // ── Créer commande et initialiser paiement ───────────────────────────
  async function handlePasserPaiement() {
    if (lignesPanier.length === 0) return
    setLoading(true)
    setErreur(null)
    try {
      const lignes = lignesPanier.map(l => ({
        plat_id: l.plat.id, quantite: l.quantite, note: l.note || null,
      }))
      const r1 = await creerCommandeQR({ table_id: parseInt(tableId), lignes })
      const cmdId = r1.data.commande_id
      setCommandeId(cmdId)

      if (modePaiement === 'especes') {
        // Espèces → pas de Stripe, envoie directement en cuisine
        const r2 = await payerEspeces(cmdId)
        setSuivi({ statut: 'envoyee', statut_label: 'En attente de préparation', montant_total: r2.data.montant, code_unique: r2.data.code_unique, lignes: [] })
        setEtape(4)
      } else {
        // Carte → créer PaymentIntent Stripe
        const r2 = await createPaymentIntent(cmdId)
        setClientSecret(r2.data.client_secret)
        setEtape(3)
      }
    } catch (e) {
      setErreur(e.response?.data?.detail || "Erreur lors de la création de commande.")
    } finally {
      setLoading(false)
    }
  }

  function handleStripeSuccess(paymentIntentId) {
    setSuivi({ statut: 'envoyee', statut_label: 'En attente de préparation', montant_total: total, lignes: [] })
    setEtape(4)
  }

  function handleStripeError(msg) {
    setErreur(msg)
  }

  // ── Inscription fidélité ──────────────────────────────────────────────
  async function handleFidelite(e) {
    e.preventDefault()
    setFideliteErreur(null)
    try {
      await inscrireClient(fideliteForm)
      setFideliteEnvoye(true)
    } catch (err) {
      setFideliteErreur(err.response?.data?.detail || "Erreur lors de l'inscription.")
    }
  }

  // ── Affichage erreur ──────────────────────────────────────────────────
  if (!tableId) return <Ecran><p className="text-red-500 text-sm">Aucune table spécifiée dans l'URL.</p></Ecran>
  if (erreur && !menu.length) return <Ecran><p className="text-red-500 text-sm">{erreur}</p></Ecran>
  if (!table) return <Ecran><p className="text-gray-400 text-sm animate-pulse">Chargement…</p></Ecran>

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900 text-lg">Sky07</p>
          <p className="text-xs text-gray-400">Table {table.numero} · {table.emplacement}</p>
        </div>
        {etape <= 2 && nbArticles > 0 && (
          <button onClick={() => setEtape(2)}
            className="relative bg-gray-900 text-white text-sm px-4 py-2 rounded-xl font-medium">
            Panier
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {nbArticles}
            </span>
          </button>
        )}
      </div>

      {/* ── ÉTAPE 1 : Menu ── */}
      {etape === 1 && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          {menu.map(cat => (
            <div key={cat.id} className="mb-8">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{cat.nom}</h2>
              <div className="space-y-3">
                {cat.plats.map(plat => {
                  const qte = panier[plat.id]?.quantite || 0
                  return (
                    <div key={plat.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                      {plat.image && (
                        <img src={plat.image} alt={plat.nom} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{plat.nom}</p>
                        {plat.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{plat.description}</p>}
                        <p className="text-sm font-bold text-amber-600 mt-1">{plat.prix} dh</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {qte > 0 && (
                          <>
                            <button onClick={() => retirerPlat(plat.id)}
                              className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 text-lg leading-none flex items-center justify-center">
                              −
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{qte}</span>
                          </>
                        )}
                        <button onClick={() => ajouterPlat(plat)}
                          className="w-7 h-7 rounded-full bg-gray-900 text-white text-lg leading-none flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {nbArticles > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
              <button onClick={() => setEtape(2)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold text-sm shadow-xl flex items-center justify-between px-5">
                <span>Voir le panier ({nbArticles})</span>
                <span>{total.toFixed(0)} dh</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 2 : Panier ── */}
      {etape === 2 && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setEtape(1)} className="text-sm text-gray-400 mb-4 flex items-center gap-1">
            ← Revenir au menu
          </button>
          <h2 className="font-bold text-gray-900 text-lg mb-4">Votre commande</h2>

          <div className="space-y-3 mb-6">
            {lignesPanier.map(({ plat, quantite, note }) => (
              <div key={plat.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{plat.nom}</p>
                    <p className="text-xs text-gray-400">{plat.prix} dh × {quantite} = <strong>{(plat.prix * quantite).toFixed(0)} dh</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => retirerPlat(plat.id)}
                      className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center text-lg">−</button>
                    <span className="text-sm font-bold w-4 text-center">{quantite}</span>
                    <button onClick={() => ajouterPlat(plat)}
                      className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg">+</button>
                  </div>
                </div>
                <input
                  placeholder="Note (sans oignon, bien cuit…)"
                  value={note}
                  onChange={e => modifierNote(plat.id, e.target.value)}
                  className="mt-2 w-full text-xs border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none text-gray-500"
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Sous-total</span><span>{total.toFixed(0)} dh</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span><span>{total.toFixed(0)} dh</span>
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2 mb-4">
            {MODES_PAIEMENT.map(m => (
              <label key={m.id}
                className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${modePaiement === m.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                <input type="radio" name="mode" value={m.id} checked={modePaiement === m.id}
                  onChange={() => setMode(m.id)} className="hidden" />
                <span className="text-xl">{m.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{m.label}</span>
                {modePaiement === m.id && <span className="ml-auto">✓</span>}
              </label>
            ))}
          </div>

          {erreur && <p className="text-red-500 text-sm mb-3">{erreur}</p>}

          <button onClick={handlePasserPaiement} disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-50">
            {loading ? 'Chargement…' : modePaiement === 'especes' ? 'Commander (payer à la caisse)' : 'Payer par carte →'}
          </button>
        </div>
      )}

      {/* ── ÉTAPE 3 : Formulaire carte Stripe ── */}
      {etape === 3 && clientSecret && stripePromise && (
        <div className="max-w-md mx-auto px-4 py-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Paiement par carte</h2>
          <p className="text-2xl font-bold text-amber-600 mb-6">{total.toFixed(0)} dh</p>
          {erreur && <p className="text-red-500 text-sm mb-4">{erreur}</p>}
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FormulaireStripe
              clientSecret={clientSecret}
              commandeId={commandeId}
              onSuccess={handleStripeSuccess}
              onError={handleStripeError}
            />
          </Elements>
        </div>
      )}

      {/* ── ÉTAPE 4 : Suivi commande ── */}
      {etape === 4 && suivi && (
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-4">
            {suivi.statut === 'prete' ? '🎉' : suivi.statut === 'en_preparation' ? '👨‍🍳' : '✓'}
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Commande confirmée</h2>
          <p className="text-sm text-gray-400 mb-2">{suivi.code_unique}</p>

          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            suivi.statut === 'prete' ? 'bg-green-100 text-green-700' :
            suivi.statut === 'en_preparation' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {suivi.statut_label}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 text-left mb-6">
            {suivi.lignes?.map((l, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{l.quantite}× {l.nom}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
              <span>Total payé</span>
              <span>{suivi.montant_total?.toFixed(0)} dh</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6 animate-pulse">
            {suivi.statut !== 'prete' ? 'Mise à jour automatique toutes les 4 secondes…' : 'Le serveur arrive avec votre commande !'}
          </p>

          {/* Proposition fidélité */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left mt-4">
            <p className="font-semibold text-gray-900 text-sm mb-1">Programme fidélité Sky07</p>
            <p className="text-xs text-gray-500 mb-3">Gagnez des récompenses à chaque visite.</p>
            <button onClick={() => setEtape(5)}
              className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium">
              Rejoindre gratuitement
            </button>
            <button className="w-full text-gray-400 text-xs mt-2 py-1">Non merci</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 5 : Inscription fidélité ── */}
      {etape === 5 && (
        <div className="max-w-md mx-auto px-4 py-6">
          <button onClick={() => setEtape(4)} className="text-sm text-gray-400 mb-4">← Retour</button>
          <h2 className="font-bold text-gray-900 text-lg mb-1">Créer mon compte</h2>
          <p className="text-xs text-gray-400 mb-5">Programme fidélité Sky07 — gratuit</p>

          {fideliteEnvoye ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">✓</p>
              <p className="font-semibold text-gray-900">Compte créé !</p>
              <p className="text-sm text-gray-400 mt-1">Vérifiez votre email pour activer votre compte.</p>
            </div>
          ) : (
            <form onSubmit={handleFidelite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prénom *</label>
                  <input required value={fideliteForm.prenom}
                    onChange={e => setFideliteForm(f => ({ ...f, prenom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom</label>
                  <input value={fideliteForm.nom}
                    onChange={e => setFideliteForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Téléphone *</label>
                <input required value={fideliteForm.telephone}
                  onChange={e => setFideliteForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="+212 6 00 00 00 00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email <span className="text-gray-400">(pour recevoir vos récompenses)</span></label>
                <input type="email" value={fideliteForm.email}
                  onChange={e => setFideliteForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date de naissance <span className="text-gray-400">(pour votre cadeau anniversaire)</span></label>
                <input type="date" value={fideliteForm.date_naissance}
                  onChange={e => {
                    const d = e.target.value  // format YYYY-MM-DD
                    const mmdd = d ? d.slice(5) : ''  // extraire MM-DD
                    setFideliteForm(f => ({ ...f, date_naissance: mmdd }))
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={fideliteForm.accept_emails}
                  onChange={e => setFideliteForm(f => ({ ...f, accept_emails: e.target.checked }))}
                  className="mt-0.5" />
                <span className="text-xs text-gray-500">
                  J'accepte de recevoir les offres et nouveautés de Sky07 par email.
                </span>
              </label>

              {fideliteErreur && <p className="text-red-500 text-xs">{fideliteErreur}</p>}

              <button type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium text-sm">
                Créer mon compte
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function Ecran({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {children}
    </div>
  )
}
