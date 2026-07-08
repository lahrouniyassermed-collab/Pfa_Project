# Flow Commande QR — Documentation complète

**Projet :** MangerManger / SKY07  
**Date :** 2026-06-21  
**Portée :** Tout le parcours client QR, du scan jusqu'à la confirmation de commande, côté backend (FastAPI) et frontend (React).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Génération du QR code](#2-génération-du-qr-code)
3. [Structure des URL et routage React](#3-structure-des-url-et-routage-react)
4. [Accès public — aucune authentification](#4-accès-public--aucune-authentification)
5. [Page QRLanding (`/commande`)](#5-page-qrlanding-commande)
6. [Page CommandeQR (`/commande/menu`)](#6-page-commandeqr-commandemenu)
7. [Flux en 4 étapes (étape 1 à 4)](#7-flux-en-4-étapes-étape-1-à-4)
8. [Gestion du panier](#8-gestion-du-panier)
9. [Filtres menu et affichage des plats](#9-filtres-menu-et-affichage-des-plats)
10. [Paiement par carte — Stripe](#10-paiement-par-carte--stripe)
11. [Paiement en espèces](#11-paiement-en-espèces)
12. [Intégration fidélité et points](#12-intégration-fidélité-et-points)
13. [Réductions roue de la fortune (GainSpin)](#13-réductions-roue-de-la-fortune-gainspin)
14. [Suivi en temps réel — polling](#14-suivi-en-temps-réel--polling)
15. [i18n — FR / EN / AR avec support RTL](#15-i18n--fr--en--ar-avec-support-rtl)
16. [Internationalisation de QRLanding](#16-internationalisation-de-qrlanding)
17. [Routes backend `/api/qr/` — référence complète](#17-routes-backend-apiqr--référence-complète)
18. [Routes backend `/api/commandes/` — éléments liés au QR](#18-routes-backend-apicommandes--éléments-liés-au-qr)
19. [Modèles de données SQLAlchemy](#19-modèles-de-données-sqlalchemy)
20. [Enum OrigineCommandeEnum — distinction QR vs Serveur](#20-enum-originecommandeenum--distinction-qr-vs-serveur)
21. [Statuts de commande vus par le client](#21-statuts-de-commande-vus-par-le-client)
22. [Fonctions API JavaScript (api.js)](#22-fonctions-api-javascript-apijs)
23. [Gestion des erreurs](#23-gestion-des-erreurs)
24. [Onboarding — popup de présentation](#24-onboarding--popup-de-présentation)
25. [Mode sombre / Mode clair](#25-mode-sombre--mode-clair)
26. [Comportements de la table côté base de données](#26-comportements-de-la-table-côté-base-de-données)
27. [Schéma Pydantic des requêtes QR](#27-schéma-pydantic-des-requêtes-qr)
28. [Séquence complète — diagramme textuel](#28-séquence-complète--diagramme-textuel)
29. [Différences entre commande QR et commande serveur](#29-différences-entre-commande-qr-et-commande-serveur)
30. [Points de vigilance et cas limites](#30-points-de-vigilance-et-cas-limites)

---

## 1. Vue d'ensemble

Le système de commande QR permet à un client assis à une table de scanner un QR code imprimé sur la table et de passer une commande complète sans l'intervention d'un serveur. Il couvre :

- La **découverte** du restaurant (page d'accueil QR avec logo, tagline et liens sociaux)
- La **navigation dans le menu** par catégorie, avec filtres végétarien / sans gluten
- La **composition du panier** avec quantités et notes personnalisées par plat
- Le **paiement** en ligne par carte (Stripe) ou en espèces (serveur encaisse à la caisse)
- Le **suivi en temps réel** de la commande, mis à jour toutes les 4 secondes par polling
- L'**intégration optionnelle** du programme de fidélité SKY07 (points, réductions roue)
- Un support **trilingue** (français, anglais, arabe) avec mode RTL pour l'arabe

Toutes les pages QR sont **entièrement publiques** : aucun JWT n'est nécessaire.

---

## 2. Génération du QR code

### Bibliothèque Python utilisée

La génération de QR codes repose sur la bibliothèque Python `qrcode` (avec `Pillow` pour le rendu image). La dépendance est déclarée dans `backend/requirements.txt`.

### URL encodée dans le QR code

```
https://mangermanger.app/commande?table_id={id}
```

Le QR code encode l'URL complète de la page `QRLanding` avec l'identifiant de la table en paramètre `table_id`.

### Stockage en base de données

Le QR code généré est **encodé en base64** et stocké directement dans la colonne `qr_code_url` du modèle `Table` :

```python
class Table(Base):
    __tablename__ = "tables"

    id          = Column(Integer, primary_key=True, index=True)
    numero      = Column(Integer, unique=True, nullable=False)
    capacite    = Column(Integer, nullable=False)
    emplacement = Column(Enum(EmplacementEnum), default=EmplacementEnum.interieur)
    statut      = Column(Enum(StatutTableEnum), default=StatutTableEnum.libre)
    qr_code_url = Column(String(500))   # ← base64 ou URL de l'image QR
```

La valeur stockée est soit une chaîne base64 (data URI `data:image/png;base64,...`) soit une URL externe, selon la méthode de génération choisie par le gérant.

### Création côté gérant

La route `POST /api/tables/` (protégée gérant) crée la table et génère le QR code associé. Le gérant peut ensuite l'imprimer depuis l'interface `GerantTables.jsx`.

---

## 3. Structure des URL et routage React

### Déclaration des routes dans `App.jsx`

```jsx
// Routes publiques QR (aucune protection)
<Route path="/commande"      element={<QRLanding />} />
<Route path="/commande/menu" element={<CommandeQR />} />
```

Ces deux routes sont définies en dehors de tout `ProtectedRoute`. Elles sont accessibles sans connexion.

### Parcours URL complet

| Étape | URL | Composant | Rôle |
|-------|-----|-----------|------|
| 1 | `/commande?table_id={id}` | `QRLanding` | Page d'accueil : logo, langue, boutons |
| 2 | `/commande/menu?table={id}` | `CommandeQR` | Menu + panier + paiement + suivi |

### Paramètres d'URL

**QRLanding** lit les deux formes suivantes pour être compatible avec différents encodages de QR :

```javascript
const tableId = params.get('table_id') || params.get('table')
```

**CommandeQR** utilise uniquement `table` :

```javascript
const tableId = params.get('table')
```

### Navigation entre les deux pages

Le bouton principal de `QRLanding` navigue vers `CommandeQR` :

```javascript
onClick={() => navigate(`/commande/menu?table=${tableId}`)}
```

Le bouton retour dans `CommandeQR` (étape 2 → 1) revient sur `QRLanding` :

```javascript
onClick={() => etape === 2 ? navigate(`/commande?table=${tableId}`) : setEtape(etape - 1)}
```

---

## 4. Accès public — aucune authentification

### Principe

Toutes les routes sous `/api/qr/` sont déclarées sans dépendance `require_role` ni `get_current_user`. Elles n'attendent aucun header `Authorization`.

```python
router_qr = APIRouter(prefix="/api/qr", tags=["QR Commande (public)"])

@router_qr.get("/table/{table_id}")
def info_table(table_id: int, db: Session = Depends(get_db)):
    # Pas de Depends(require_role(...)) → accès libre
    ...
```

### Intercepteur Axios

Le fichier `api.js` configure un intercepteur qui ajoute le Bearer token **si présent**, mais ne bloque pas si absent :

```javascript
api.interceptors.request.use((config) => {
  const token = _storageGet('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

Pour les routes QR, aucun token n'est stocké (le client non connecté n'a pas de session), donc les requêtes partent sans header `Authorization`, ce qui est parfaitement accepté par le backend.

---

## 5. Page QRLanding (`/commande`)

### Fichier source

`frontend/src/pages/QRLanding.jsx`

### Rôle

Page d'accueil présentée immédiatement après le scan du QR code. Elle charge les informations de la table, affiche le branding du restaurant et propose deux actions principales :

1. **Voir le menu et commander** → navigue vers `/commande/menu?table={id}`
2. **Accéder à l'espace fidélité** → lien vers `/client/login`

Plus deux liens sociaux : Instagram (`@sky07restaurant`) et WhatsApp (`+212530450523`).

### Chargement des données

```javascript
useEffect(() => {
  if (!tableId) { setTimeout(() => setVisible(true), 50); return }
  getTableQR(tableId)
    .then(r => setTable(r.data.table))
    .catch(() => {})
    .finally(() => setTimeout(() => setVisible(true), 50))
}, [tableId])
```

La fonction `getTableQR(tableId)` appelle `GET /api/qr/table/{table_id}`. En cas d'erreur (table introuvable), la page s'affiche quand même sans le badge de table.

### Badge de table

Si le `tableId` est présent dans l'URL et que la table est chargée, un badge s'affiche :

```jsx
{tableId && (
  <div style={{ /* ... pill styling ... */ }}>
    <MapPin size={13} color={ACCENT} />
    <span>{tableLabel}</span>
    {/* Exemple : "Table 4 · Terrasse" */}
  </div>
)}
```

Le label est construit avec `t.table(table.numero, empl)` où `empl` est la traduction de l'emplacement dans la langue active.

### Animation d'apparition

La page démarre avec `opacity: 0` et passe à `opacity: 1` après 50 ms via `visible` state, créant une transition douce :

```javascript
const [visible, setVisible] = useState(false)
// ...
opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease, background 0.3s ease',
```

---

## 6. Page CommandeQR (`/commande/menu`)

### Fichier source

`frontend/src/pages/CommandeQR.jsx`

### Rôle

Composant principal du parcours de commande QR. Il gère en un seul composant les 4 étapes du tunnel de commande, le panier, le paiement Stripe, le suivi de commande et l'espace fidélité.

### Initialisation

Au montage, `CommandeQR` appelle `getTableQR(tableId)` qui retourne en une seule requête :
- Les informations de la table (`id`, `numero`, `capacite`, `emplacement`)
- Le menu complet structuré par catégorie (uniquement les plats `disponible=True` et `statut="valide"`)
- La clé publishable Stripe (`stripe_publishable_key`)
- Le nom du restaurant (`nom_restaurant`)

```javascript
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
```

### Variables d'état principales

```javascript
const [etape,         setEtape]         = useState(1)       // 1=menu, 2=panier, 3=stripe, 4=suivi
const [table,         setTable]         = useState(null)    // infos table
const [menu,          setMenu]          = useState([])      // menu par catégorie
const [stripePromise, setStripePromise] = useState(null)    // instance Stripe.js
const [panier,        setPanier]        = useState({})      // { [plat_id]: {plat, quantite, note} }
const [modePaiement,  setMode]          = useState('carte') // 'carte' | 'especes'
const [commandeId,    setCommandeId]    = useState(null)    // ID commande créée
const [clientSecret,  setClientSecret]  = useState(null)    // secret PaymentIntent Stripe
const [suivi,         setSuivi]         = useState(null)    // données polling commande
const [lang]                            = useState(...)     // langue persistée en localStorage
```

### Images de fallback

Quand un plat n'a pas d'image, une image Unsplash est choisie en fonction du nom ou de la catégorie :

```javascript
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
  if (n.includes('salade') || n.includes('nicoise')) return IMG_SALADE
  if (n.includes('tajine') || n.includes('tagine'))  return IMG_TAJINE
  if (n.includes('moelleux') || c.includes('dessert')) return IMG_DESSERT
  if (c.includes('boisson') || n.includes('jus'))    return IMG_BOISSON
  if (c.includes('entrée') || c.includes('soupe'))   return IMG_ENTREE
  return IMG_PLAT
}
```

---

## 7. Flux en 4 étapes (étape 1 à 4)

Le composant `CommandeQR` est organisé autour d'une variable `etape` (1 à 4). Chaque étape correspond à une vue différente rendue conditionnellement.

### Étape 1 — Menu

Affichage du menu par catégorie avec :
- Onglets de catégories scrollables (filtre par catégorie active)
- Filtres rapides végétarien / sans gluten
- Section « Tendances de la semaine » (composant `TrendingSection` quand aucun filtre actif)
- Cartes de plats avec image, nom, description, prix, badges végétarien/sans gluten, bouton nutrition
- Contrôles quantité (boutons `+` / `-` ou simple `+` si quantité = 0)
- Bouton panier flottant fixé en bas (visible si au moins 1 article)

Transition vers étape 2 : clic sur le bouton panier flottant.

### Étape 2 — Panier

Affichage du récapitulatif de commande avec :
- Liste des articles (image miniature, nom, prix × quantité = sous-total)
- Contrôles quantité +/- par article
- Champ note par article (« sans oignon », « bien cuit »…)
- Bouton « Tout vider »
- Bloc total avec sous-total, réduction éventuelle, total final
- Panneau fidélité rétractable (connexion ou inscription optionnelle)
- Affichage des réductions roue disponibles (si client connecté)
- Deux boutons : « Payer par carte » et « Payer en espèces »

Transitions :
- Clic sur « Payer par carte » → appel backend, puis étape 3
- Clic sur « Payer en espèces » → appel backend, puis étape 4

### Étape 3 — Paiement Stripe

Affichage du formulaire de paiement par carte avec :
- Récapitulatif de commande (lignes + total)
- Indicateur fidélité (points estimés si connecté)
- Formulaire `CardElement` de Stripe (dans un composant `<Elements>`)
- Bouton « Confirmer le paiement »
- Message de test : `4242 4242 4242 4242 · 12/26 · 123`
- En cas d'indisponibilité Stripe : message d'erreur + lien retour vers espèces

Transition vers étape 4 : confirmation Stripe réussie.

### Étape 4 — Confirmation et suivi

Affichage de la confirmation avec :
- Icône animée selon statut (`Check` vert, `ChefHat` orange, `Clock`, `PartyPopper` vert)
- Titre : « Commande envoyée ! » (espèces) ou « Commande confirmée » (carte)
- Code unique de commande en police monospace (ex : `CMD-20260621-4271`)
- Badge de statut coloré (bleu = envoyée, orange = en_preparation, vert = prete)
- Pour espèces : message expliquant que le serveur viendra encaisser
- Pour carte : message de polling « Mise à jour toutes les 4 secondes »
- Détail des lignes de commande (si disponibles)
- Total payé / à payer
- Points crédités (si paiement carte + fidélité connecté)
- Lien vers l'espace fidélité

---

## 8. Gestion du panier

### Structure de données

Le panier est un objet JavaScript indexé par `plat_id` :

```javascript
const [panier, setPanier] = useState({})
// Structure : { [plat_id]: { plat: PlatObject, quantite: number, note: string } }
```

### Fonctions de manipulation

```javascript
// Ajouter ou incrémenter
function ajouterPlat(plat) {
  setPanier(p => ({
    ...p,
    [plat.id]: p[plat.id]
      ? { ...p[plat.id], quantite: p[plat.id].quantite + 1 }
      : { plat, quantite: 1, note: '' },
  }))
  setPanierPulse(true)
  setTimeout(() => setPanierPulse(false), 400)  // animation bouton panier
}

// Décrémenter ou supprimer si quantite <= 1
function retirerPlat(platId) {
  setPanier(p => {
    const item = p[platId]
    if (!item) return p
    if (item.quantite <= 1) { const { [platId]: _, ...reste } = p; return reste }
    return { ...p, [platId]: { ...item, quantite: item.quantite - 1 } }
  })
}

// Modifier la note d'un plat
function modifierNote(platId, note) {
  setPanier(p => ({ ...p, [platId]: { ...p[platId], note } }))
}

// Vider tout
function viderPanier() { setPanier({}) }
```

### Calculs dérivés

```javascript
const lignesPanier  = Object.values(panier)
const totalBrut     = lignesPanier.reduce((s, l) => s + l.plat.prix * l.quantite, 0)
const reductionPct  = gainChoisi?.valeur ?? 0
const montantRemise = reductionPct > 0 ? +(totalBrut * reductionPct / 100).toFixed(2) : 0
const total         = +(totalBrut - montantRemise).toFixed(2)
const nbArticles    = lignesPanier.reduce((s, l) => s + l.quantite, 0)
const pointsEstimes = Math.floor(total / 20)   // 1 point par tranche de 20 Dh
```

### Indicateur visuel panier

Le bouton panier flottant pulse brièvement quand un article est ajouté :

```javascript
transform: panierPulse ? 'scale(1.03)' : 'scale(1)',
```

---

## 9. Filtres menu et affichage des plats

### Filtre par catégorie

Un onglet « Tout » et un onglet par catégorie sont affichés. L'état `categorieActive` vaut `null` (tout afficher) ou l'`id` d'une catégorie spécifique :

```javascript
const menuFiltré = (categorieActive ? menu.filter(c => c.id === categorieActive) : menu)
  .map(cat => ({
    ...cat,
    plats: cat.plats.filter(p =>
      (!filtreVege || p.vegetarien) &&
      (!filtreSansGluten || p.sans_gluten)
    ),
  }))
  .filter(cat => cat.plats.length > 0)
```

### Filtres rapides

Deux boutons toggleables :
- `🌿 Végétarien` — filtre `p.vegetarien === true`
- `🌾 Sans gluten` — filtre `p.sans_gluten === true`

### Badges sur les cartes de plats

```jsx
{plat.vegetarien && <span title="Végétarien">🌿</span>}
{plat.sans_gluten && <span title="Sans gluten">🌾</span>}
{plat.nutrition && (
  <button onClick={() => setNutritionPlat({ ...plat, categorie: cat.nom })}>
    🥗 Nutrition
  </button>
)}
```

Le clic sur « Nutrition » ouvre le composant `NutritionModal` (importé depuis `../components/shared/NutritionModal`).

### Tendances de la semaine

Quand aucun filtre actif et aucune catégorie sélectionnée, la section `TrendingSection` est affichée en tête de liste. Elle appelle `GET /api/plats/tendances` et propose un accès rapide aux plats populaires avec les mêmes contrôles d'ajout au panier.

### Animation des cartes

```css
@keyframes fadeUp {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
.card-plat { animation: fadeUp 0.4s ease forwards; opacity:0; }
```

Chaque carte est animée avec un délai décalé (`animationDelay: ${(catIdx * 6 + platIdx) * 45}ms`) pour un effet de cascade.

---

## 10. Paiement par carte — Stripe

### Librairies utilisées

- `@stripe/stripe-js` — chargement de Stripe.js côté client
- `@stripe/react-stripe-js` — composants React (`Elements`, `CardElement`, `useStripe`, `useElements`)

### Flux paiement carte — étapes techniques

**Étape 1 : Créer la commande**

```javascript
async function handlePasserCarte() {
  const r1 = await creerCommandeQR(buildCommandePayload())
  const cmdId = r1.data.commande_id
  setCommandeId(cmdId)
  // ...
}
```

**Étape 2 : Créer le PaymentIntent Stripe**

```javascript
  const r2 = await createPaymentIntent(cmdId)
  setClientSecret(r2.data.client_secret)
  setMode('carte')
  setEtape(3)
```

**Étape 3 : Confirmer le paiement côté client**

Le composant `FormulaireStripe` gère la confirmation :

```javascript
async function handleSubmit(e) {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: elements.getElement(CardElement) },
  })
  if (paymentIntent.status === 'succeeded') {
    await confirmerPaiement(commandeId, {
      payment_intent_id: paymentIntent.id,
      mode: 'carte'
    })
    onSuccess()
  }
}
```

**Étape 4 : Confirmation backend**

Le backend vérifie le PaymentIntent auprès de Stripe, crée un enregistrement `Paiement` avec `statut=valide`, passe la commande en `envoyee` (envoyée en cuisine) et crédite les points fidélité si applicable.

### Montant en centimes

```python
montant_centimes = int(commande.montant_total * 100)
intent = stripe.PaymentIntent.create(
    amount=montant_centimes,
    currency="eur",   # EUR pour tests Stripe (MAD non supporté en test)
    metadata={
        "commande_id": str(commande.id),
        "code_unique": commande.code_unique,
    },
    automatic_payment_methods={"enabled": True},
)
```

**Note importante :** La devise utilisée en test est l'EUR car Stripe ne supporte pas le MAD (dirham marocain) en mode test. En production, il faudra adapter.

### Carte de test Stripe

Affichée dans l'interface pour faciliter les tests :

```
4242 4242 4242 4242  ·  12/26  ·  123
```

### Cas d'erreur Stripe

- Si `stripePromise` est null (clé publishable non configurée) : message « Paiement par carte indisponible » + lien pour revenir au choix espèces.
- Si la confirmation Stripe échoue : message d'erreur affiché au-dessus du formulaire.

---

## 11. Paiement en espèces

### Flux technique

```javascript
async function handlePasserEspeces() {
  const r1 = await creerCommandeQR(buildCommandePayload())
  const cmdId = r1.data.commande_id
  setCommandeId(cmdId)
  const r2 = await payerEspeces(cmdId)
  setMode('especes')
  setSuivi({
    statut: 'envoyee',
    statut_label: 'En attente du serveur',
    montant_total: r2.data.montant,
    code_unique: r2.data.code_unique,
    lignes: []
  })
  setEtape(4)
}
```

### Comportement backend — commande espèces

```python
@router_qr.post("/paiement-especes/{commande_id}")
def payer_especes(commande_id: int, db: Session = Depends(get_db)):
    # ...
    paiement = Paiement(
        commande_id=commande.id,
        montant=commande.montant_total,
        mode=ModePaiementEnum.especes,
        statut=StatutPaiementEnum.en_attente,   # ← sera validé à la caisse
        reference_transaction=f"ESPECES-{commande.code_unique}",
    )
    db.add(paiement)
    # IMPORTANT : commande.statut reste StatutCommandeEnum.en_cours
    # Le serveur doit valider et envoyer en cuisine manuellement
```

**Différence clé :** Pour les espèces, la commande reste en statut `en_cours`. Le serveur voit apparaître la commande QR dans son interface avec un indicateur `especes_en_attente: true` (champ calculé dans `GET /api/commandes/`). Il doit :
1. Aller voir le client pour récupérer le paiement
2. Envoyer manuellement la commande en cuisine via `POST /api/commandes/{id}/envoyer-cuisine`

### Référence de transaction espèces

```
ESPECES-CMD-20260621-4271
```

Format : `ESPECES-` + code unique de la commande.

### Message affiché au client

```
"Votre commande a bien été transmise au serveur. Le serveur passera à votre table pour finaliser votre commande et encaisser le paiement."
"Gagnez des points fidélité ! Lors du paiement, communiquez votre email ou téléphone au serveur."
```

---

## 12. Intégration fidélité et points

### Principe

L'intégration fidélité est **entièrement optionnelle**. Le client peut commander sans se connecter. S'il souhaite accumuler des points, il peut :
1. Se connecter à son compte fidélité existant (email + mot de passe)
2. Créer un compte fidélité pendant le tunnel de commande

### Panneau fidélité — `FideliteForm`

Un composant réutilisable `FideliteForm` est rendu dans trois endroits :
- Étape 1 (menu) : dans un panneau dépliable en haut de page
- Étape 2 (panier) : dans un panneau rétractable avant les boutons de paiement
- Étape 3 (Stripe) : en option discrète au-dessus du formulaire carte

Le panneau propose deux onglets :

```jsx
[{ id: 'login',    label: "J'ai un compte"  },
 { id: 'register', label: 'Créer un compte' }]
```

### Connexion fidélité

```javascript
async function handleLogin(e) {
  const r = await clientLogin(loginForm)   // POST /api/client/login
  setClientFideliteId(r.data.client.id)
  setClientPrenom(r.data.client.prenom)
  setShowFidelite(false)
  loadPrizes(r.data.client.id)
}
```

### Inscription fidélité

```javascript
async function handleRegister(e) {
  if (registerForm.password.length < 6) { /* erreur */ return }
  const r = await clientRegister(registerForm)   // POST /api/client/register
  if (r.data.requires_email_verification) {
    setFideliteErreur('Compte créé ! Vérifiez votre email pour activer les points fidélité.')
    return
  }
  setClientFideliteId(r.data.client.id)
  setClientPrenom(r.data.client.prenom)
}
```

### Calcul des points estimés

```javascript
const pointsEstimes = Math.floor(total / 20)
```

**Règle :** 1 point par tranche de 20 Dh. Un achat de 85 Dh génère `Math.floor(85/20) = 4` points. Cette valeur est affichée en temps réel dans le panier et à l'étape Stripe.

### Créditage effectif des points — backend

Le créditage réel se fait dans deux routes backend :

**Paiement carte (`confirmer_paiement`) :**
```python
if commande.client_fidelite_id:
    client = db.query(ClientFidelite).filter(ClientFidelite.id == commande.client_fidelite_id).first()
    if client:
        points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
```

**Paiement espèces (`payer_especes`) :**
```python
if commande.client_fidelite_id:
    client = db.query(ClientFidelite).filter(ClientFidelite.id == commande.client_fidelite_id).first()
    if client:
        points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
```

La fonction `_crediter_points` est importée de `app.api.routes.clients` et applique la règle de `ConfigFidelite` (par défaut : 5 points par tranche de 20 Dh, seuil minimum 80 Dh).

### Payload commande avec fidélité

```javascript
function buildCommandePayload() {
  return {
    table_id: parseInt(tableId),
    lignes: lignesPanier.map(l => ({
      plat_id: l.plat.id,
      quantite: l.quantite,
      note: l.note || null
    })),
    client_fidelite_id: clientFideliteId || null,
    gain_id: gainChoisi?.gain_id || null,
  }
}
```

---

## 13. Réductions roue de la fortune (GainSpin)

### Principe

Quand un client fidélité est connecté, le système récupère automatiquement ses gains de type `reduction` non utilisés depuis la roue de la fortune :

```javascript
async function loadPrizes(clientId) {
  const r = await getClientPrizes(clientId)   // GET /api/qr/client-prizes/{client_id}
  setPrizesDispos(r.data)
}
```

### Route backend

```python
@router_qr.get("/client-prizes/{client_id}")
def get_client_prizes(client_id: int, db: Session = Depends(get_db)):
    gains = db.query(GainSpin).filter(
        GainSpin.client_id == client_id,
        GainSpin.statut == StatutGainEnum.non_utilise,
    ).all()
    result = []
    for g in gains:
        prix = db.query(PrixRoue).filter(PrixRoue.id == g.prix_id).first()
        if prix and prix.type == TypePrixEnum.reduction:
            result.append({
                "gain_id": g.id,
                "nom": prix.nom,
                "valeur": prix.valeur,  # pourcentage ex: 20 pour 20%
            })
    return result
```

### Affichage dans le panier

```jsx
{clientFideliteId && prizesDispos.length > 0 && (
  <div>
    {prizesDispos.map(p => {
      const selected = gainChoisi?.gain_id === p.gain_id
      return (
        <button key={p.gain_id} onClick={() => setGainChoisi(selected ? null : p)}>
          <span>{p.nom}</span>
          <span>-{p.valeur}%</span>
        </button>
      )
    })}
    {gainChoisi && (
      <p>✓ Réduction appliquée — économie de {montantRemise.toFixed(0)} Dh</p>
    )}
  </div>
)}
```

### Application de la réduction — backend

Dans `creer_commande_qr`, si `gain_id` et `client_fidelite_id` sont fournis :

```python
if data.gain_id and data.client_fidelite_id:
    gain = db.query(GainSpin).filter(
        GainSpin.id == data.gain_id,
        GainSpin.client_id == data.client_fidelite_id,
        GainSpin.statut == StatutGainEnum.non_utilise,
    ).first()
    if gain:
        prix = db.query(PrixRoue).filter(PrixRoue.id == gain.prix_id).first()
        if prix and prix.type == TypePrixEnum.reduction and prix.valeur > 0:
            pct = prix.valeur              # ex: 20
            total_apres = round(total * (1 - pct / 100), 2)
            total = total_apres
            gain.statut = StatutGainEnum.utilise  # ← marque le gain comme utilisé
```

Le gain est marqué `utilise` **au moment de la création de la commande**, pas au moment du paiement. Cela empêche une utilisation multiple du même gain.

---

## 14. Suivi en temps réel — polling

### Déclenchement

Le polling démarre à l'entrée en étape 4 et s'arrête quand la commande est `prete` ou `cloturee` :

```javascript
useEffect(() => {
  if (etape !== 4 || !commandeId) return
  const interval = setInterval(async () => {
    try {
      const r = await statutCommandeQR(commandeId)   // GET /api/qr/commande/{id}
      setSuivi(r.data)
      if (r.data.statut === 'prete' || r.data.statut === 'cloturee')
        clearInterval(interval)
    } catch {}
  }, 4000)   // toutes les 4 secondes
  return () => clearInterval(interval)
}, [etape, commandeId])
```

### Route backend

```python
@router_qr.get("/commande/{commande_id}")
def statut_commande_qr(commande_id: int, db: Session = Depends(get_db)):
    commande = db.query(Commande).options(
        joinedload(Commande.lignes).joinedload(LigneCommande.plat)
    ).filter(Commande.id == commande_id).first()

    statut_label = {
        "envoyee":        "En attente de préparation",
        "en_preparation": "En préparation",
        "prete":          "Prête — le serveur arrive !",
        "cloturee":       "Terminée",
    }.get(commande.statut.value, "En cours")

    return {
        "statut": commande.statut.value,
        "statut_label": statut_label,
        "code_unique": commande.code_unique,
        "montant_total": commande.montant_total,
        "lignes": [{
            "nom": l.plat.nom if l.plat else "?",
            "quantite": l.quantite,
            "statut": l.statut.value,
        } for l in commande.lignes],
    }
```

### Affichage des statuts

| Statut backend | Affichage client | Couleur | Icône |
|----------------|-----------------|---------|-------|
| `en_cours` | « En cours » | bleu | Clock |
| `envoyee` | « En attente de préparation » | bleu | Check |
| `en_preparation` | « En préparation » | orange | ChefHat |
| `prete` | « Prête — le serveur arrive ! » | vert | PartyPopper |
| `cloturee` | « Terminée » | gris | — |

### Arrêt du polling

Le polling s'arrête automatiquement sur `prete` ou `cloturee`. Les statuts `prete` et `cloturee` affichent des messages finaux et désactivent l'indicateur de mise à jour automatique.

---

## 15. i18n — FR / EN / AR avec support RTL

### Structure des traductions

Toutes les traductions sont définies dans l'objet `I18N` directement dans `CommandeQR.jsx` :

```javascript
const I18N = {
  fr: { dir: 'ltr', slides: [...], passer: 'Passer', ... },
  en: { dir: 'ltr', slides: [...], passer: 'Skip',   ... },
  ar: { dir: 'rtl', slides: [...], passer: 'تخطي',   ... },
}
```

Chaque entrée contient la propriété `dir` : `'ltr'` pour FR et EN, `'rtl'` pour AR.

### Lecture et persistance

```javascript
const [lang] = useState(() => localStorage.getItem('sky07_lang') || 'fr')
const tr = I18N[lang] || I18N.fr
```

La langue est lue depuis `localStorage` (clé `sky07_lang`) et ne peut pas être changée depuis `CommandeQR` (pas de sélecteur dans cette page — le sélecteur est dans `QRLanding`). Si la langue stockée n'est pas reconnue, le français sert de fallback.

### Application du RTL

La direction n'est pas appliquée sur le `<div>` principal de `CommandeQR` (les titres et le flux sont en LTR). L'arabe affecte surtout les polices et les textes des boutons via la propriété `fontFamily` :

```javascript
fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : 'inherit'
```

L'icône `ChevronRight` dans l'onboarding est inversée horizontalement en mode RTL :

```jsx
style={lang === 'ar' ? {transform:'scaleX(-1)'} : {}}
```

### Clés de traduction complètes

Le fichier `I18N` couvre toutes les chaînes visibles :

- Navigation (passer, suivant, commencer)
- Filtres (tout, végétarien, sans gluten)
- Panier (votre commande, tout vider, note placeholder, sous-total, total, réduction)
- Fidélité (connecté, points estimés/crédités, déconnexion, messages)
- Paiement (payer par carte, payer en espèces, paiement sécurisé, confirmer, traitement)
- Confirmation (commande envoyée, commande confirmée, messages espèces, suivi)
- Erreurs (aucune table, table introuvable)

---

## 16. Internationalisation de QRLanding

### Objet LANGS

```javascript
const LANGS = {
  fr: {
    tagline: 'Restaurant & Lounge Marocain',
    bienvenue: 'Bienvenue',
    commander: 'Voir le menu & Commander',
    fidelite: 'Mon espace fidélité',
    ou: 'ou',
    whatsapp: 'Contacter sur WhatsApp',
    footer: '© 2026 SKY07 — Tous droits réservés',
    table: (n, e) => `Table ${n} · ${e}`,
    dir: 'ltr',
    emplacements: { interieur: 'Intérieur', terrasse: 'Terrasse', mezzanine: 'Mezzanine' },
  },
  en: { /* ... */ dir: 'ltr' },
  ar: {
    tagline: 'مطعم وصالون مغربي',
    bienvenue: 'أهلاً وسهلاً',
    /* ... */
    dir: 'rtl',
    emplacements: { interieur: 'داخلي', terrasse: 'تراس', mezzanine: 'ميزانين' },
  },
}
```

### Sélecteur de langue et thème

Positionnés en haut à gauche (LTR) ou haut à droite (RTL) :

```jsx
<div style={{
  position: 'absolute', top: 16,
  left: t.dir === 'rtl' ? 'auto' : 16,
  right: t.dir === 'rtl' ? 16 : 'auto',
}}>
  {/* Toggle dark/light */}
  <button onClick={() => setDark(d => !d)}>
    {dark ? <Sun size={13} /> : <Moon size={13} />}
  </button>
  {/* Boutons FR / EN / AR */}
  {['fr', 'en', 'ar'].map(l => (
    <button key={l} onClick={() => {
      setLang(l);
      localStorage.setItem('sky07_lang', l)   // persistance
    }}>
      {l.toUpperCase()}
    </button>
  ))}
</div>
```

### Application du RTL sur QRLanding

L'attribut `dir` est appliqué sur le `<div>` racine de la page :

```jsx
<div dir={t.dir} style={{ /* ... */ fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : "'Playfair Display', serif" }}>
```

Les ornements décoratifs (lignes et gradients) inversent leur direction en RTL :

```jsx
background: `linear-gradient(to ${t.dir === 'rtl' ? 'left' : 'right'}, transparent, rgba(232,130,74,0.4))`
```

---

## 17. Routes backend `/api/qr/` — référence complète

Fichier : `backend/app/api/routes/qr_commande.py`

Toutes ces routes sont **publiques** (aucun Depends d'authentification).

### GET `/api/qr/client-prizes/{client_id}`

Retourne les gains roue non utilisés de type `reduction` pour un client fidélité.

**Réponse :**
```json
[
  { "gain_id": 12, "nom": "Réduction 20%", "valeur": 20 },
  { "gain_id": 15, "nom": "Réduction 10%", "valeur": 10 }
]
```

### GET `/api/qr/table/{table_id}`

Charge les informations d'une table et le menu complet (uniquement plats disponibles et validés).

**Réponse :**
```json
{
  "table": {
    "id": 3,
    "numero": 4,
    "capacite": 4,
    "emplacement": "terrasse"
  },
  "menu": [
    {
      "id": 1,
      "nom": "Entrées",
      "plats": [
        {
          "id": 7,
          "nom": "Salade niçoise",
          "description": "Thon, olives, tomates",
          "prix": 65.0,
          "image": null
        }
      ]
    }
  ],
  "stripe_publishable_key": "pk_test_...",
  "nom_restaurant": "SKY07"
}
```

**Erreur possible :** `404 "Table introuvable."`

### POST `/api/qr/commande`

Crée une commande depuis le QR code. Passe la table en `occupee`.

**Corps de requête :**
```json
{
  "table_id": 3,
  "lignes": [
    { "plat_id": 7, "quantite": 2, "note": "sans oignon" },
    { "plat_id": 12, "quantite": 1, "note": null }
  ],
  "client_fidelite_id": 42,
  "gain_id": 12
}
```

**Réponse :**
```json
{
  "commande_id": 156,
  "code_unique": "CMD-20260621-4271",
  "montant_total": 156.0,
  "reduction": {
    "nom": "Réduction 20%",
    "pct": 20,
    "montant_remise": 39.0
  }
}
```

**Erreurs possibles :**
- `404 "Table introuvable."`
- `400 "La commande est vide."`
- `404 "Plat {id} introuvable."` (si plat non disponible)

### POST `/api/qr/create-payment-intent/{commande_id}`

Crée un PaymentIntent Stripe et retourne le `client_secret` pour la confirmation côté frontend.

**Réponse :**
```json
{
  "client_secret": "pi_3Qz..._secret_...",
  "payment_intent_id": "pi_3Qz...",
  "montant": 156.0
}
```

**Erreurs possibles :**
- `404 "Commande introuvable."`
- `400 "Cette commande a déjà été payée."` (statut != en_cours)
- `400` message d'erreur Stripe si clé invalide

### POST `/api/qr/confirmer-paiement/{commande_id}`

Vérifie le paiement Stripe et confirme la commande (statut → `envoyee`).

**Corps de requête :**
```json
{
  "payment_intent_id": "pi_3Qz...",
  "mode": "carte"
}
```

**Réponse :**
```json
{
  "message": "Paiement validé. Votre commande est en cuisine.",
  "code_unique": "CMD-20260621-4271",
  "montant": 156.0,
  "reference": "pi_3Qz...",
  "peut_participer_tombola": false,
  "points_gagnes": 7
}
```

**Logique :** `peut_participer_tombola` est `true` si `montant_total >= 200 Dh`.

### POST `/api/qr/paiement-especes/{commande_id}`

Enregistre un paiement espèces en attente. La commande reste en `en_cours`.

**Réponse :**
```json
{
  "message": "Commande envoyée en cuisine. Paiement en espèces à la caisse.",
  "code_unique": "CMD-20260621-4271",
  "montant": 156.0,
  "peut_participer_tombola": false,
  "points_gagnes": 7
}
```

### GET `/api/qr/commande/{commande_id}`

Retourne le statut actuel d'une commande pour le polling client.

**Réponse :**
```json
{
  "statut": "en_preparation",
  "statut_label": "En préparation",
  "code_unique": "CMD-20260621-4271",
  "montant_total": 156.0,
  "lignes": [
    { "nom": "Salade niçoise", "quantite": 2, "statut": "prete" },
    { "nom": "Tajine agneau",  "quantite": 1, "statut": "en_preparation" }
  ]
}
```

---

## 18. Routes backend `/api/commandes/` — éléments liés au QR

Fichier : `backend/app/api/routes/commandes.py`

Ces routes sont **protégées** (serveur / gérant) mais directement liées au traitement des commandes QR.

### GET `/api/commandes/` — détection des commandes QR espèces

La route liste toutes les commandes et calcule dynamiquement le champ `especes_en_attente` :

```python
qr_en_cours = [c.id for c in commandes
               if c.statut == StatutCommandeEnum.en_cours
               and c.origine and c.origine.value == 'qr_table']
if qr_en_cours:
    rows = db.query(Paiement.commande_id).filter(
        Paiement.commande_id.in_(qr_en_cours),
        Paiement.mode == ModePaiementEnum.especes,
        Paiement.statut == StatutPaiementEnum.en_attente,
    ).all()
    pending_cash_ids = {r.commande_id for r in rows}

# Dans la sérialisation :
"especes_en_attente": c.id in pending_cash_ids,
```

Le serveur utilise ce champ pour distinguer les commandes QR espèces qui attendent son intervention.

### POST `/api/commandes/{id}/envoyer-cuisine`

Utilisé par le serveur pour envoyer en cuisine une commande QR espèces (après encaissement) :

```python
commande.statut = StatutCommandeEnum.envoyee
```

### POST `/api/commandes/{id}/cloturer`

Clôture la commande, libère la table (`statut = libre`), et peut créditer les points fidélité si un `client_identifiant` est fourni (email ou téléphone) :

```python
if data.client_identifiant:
    client = db.query(ClientFidelite).filter(
        (ClientFidelite.email == identifiant) | (ClientFidelite.telephone == identifiant)
    ).first()
    if client:
        points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
        if points_gagnes > 0 and client.telephone:
            _notifier_n8n(...)  # notification WhatsApp via n8n
```

### GET `/api/commandes/client-prizes` (serveur)

Permet au serveur de rechercher les réductions disponibles d'un client par email ou téléphone, pour les appliquer manuellement depuis l'interface serveur.

### POST `/api/commandes/{id}/appliquer-reduction` (serveur)

Applique une réduction d'un gain roue sur une commande existante (flux serveur, pas QR direct).

---

## 19. Modèles de données SQLAlchemy

Fichier : `backend/app/models/models.py`

### Table — modèle complet

```python
class Table(Base):
    __tablename__ = "tables"

    id          = Column(Integer, primary_key=True, index=True)
    numero      = Column(Integer, unique=True, nullable=False)
    capacite    = Column(Integer, nullable=False)
    emplacement = Column(Enum(EmplacementEnum), default=EmplacementEnum.interieur)
    statut      = Column(Enum(StatutTableEnum), default=StatutTableEnum.libre)
    qr_code_url = Column(String(500))     # base64 ou URL image QR

    commandes    = relationship("Commande", back_populates="table")
    reservations = relationship("Reservation", back_populates="table")
```

### Commande — modèle complet

```python
class Commande(Base):
    __tablename__ = "commandes"

    id                 = Column(Integer, primary_key=True, index=True)
    code_unique        = Column(String(30), unique=True, index=True)   # CMD-YYYYMMDD-XXXX
    date_heure         = Column(DateTime, server_default=func.now())
    origine            = Column(Enum(OrigineCommandeEnum), default=OrigineCommandeEnum.serveur)
    statut             = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)
    montant_total      = Column(Float, default=0)
    employe_id         = Column(Integer, ForeignKey("employes.id"), nullable=True)   # null pour QR
    table_id           = Column(Integer, ForeignKey("tables.id"), nullable=True)
    cuisinier_id       = Column(Integer, ForeignKey("employes.id"), nullable=True)
    client_fidelite_id = Column(Integer, ForeignKey("clients_fidelite.id"), nullable=True)
```

**Note :** Pour une commande QR, `employe_id` est `null` (pas de serveur assigné à la prise de commande). `cuisinier_id` est renseigné quand un cuisinier prend en charge la commande.

### LigneCommande — modèle complet

```python
class LigneCommande(Base):
    __tablename__ = "lignes_commande"

    id            = Column(Integer, primary_key=True, index=True)
    quantite      = Column(Integer, nullable=False, default=1)
    prix_unitaire = Column(Float, nullable=False)
    note          = Column(Text)              # "sans oignon", "bien cuit"…
    statut        = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)

    commande_id = Column(Integer, ForeignKey("commandes.id"))
    plat_id     = Column(Integer, ForeignKey("plats.id"))
```

Le statut d'une `LigneCommande` suit le cycle : `en_cours → en_preparation → prete`. Quand toutes les lignes sont `prete`, la commande parente passe automatiquement en `prete`.

### Paiement — modèle complet

```python
class Paiement(Base):
    __tablename__ = "paiements"

    id                    = Column(Integer, primary_key=True, index=True)
    montant               = Column(Float, nullable=False)
    date_heure            = Column(DateTime, server_default=func.now())
    mode                  = Column(Enum(ModePaiementEnum), nullable=False)
    statut                = Column(Enum(StatutPaiementEnum), default=StatutPaiementEnum.en_attente)
    reference_transaction = Column(String(200))   # payment_intent_id Stripe ou ESPECES-CMD-...

    commande_id = Column(Integer, ForeignKey("commandes.id"), unique=True)
```

La contrainte `unique=True` sur `commande_id` garantit qu'il n'y a qu'un seul enregistrement de paiement par commande.

### GainSpin — modèle réductions

```python
class GainSpin(Base):
    __tablename__ = "gains_spin"

    id              = Column(Integer, primary_key=True, index=True)
    client_id       = Column(Integer, ForeignKey("clients_fidelite.id"))
    prix_id         = Column(Integer, ForeignKey("prix_roue.id"))
    date_gain       = Column(DateTime, server_default=func.now())
    statut          = Column(Enum(StatutGainEnum), default=StatutGainEnum.non_utilise)
    points_avant    = Column(Integer)
    points_apres    = Column(Integer)
    nb_gains_ce_prix = Column(Integer, default=1)
```

### ConfigFidelite — règles de points

```python
class ConfigFidelite(Base):
    __tablename__ = "config_fidelite"

    id                  = Column(Integer, primary_key=True, index=True)
    seuil_minimum_mad   = Column(Float, default=80)       # minimum pour gagner des points
    points_par_tranche  = Column(Integer, default=5)      # points gagnés par tranche
    tranche_mad         = Column(Integer, default=20)     # tranche en Dh (20 Dh = 1 pt par défaut)
    cout_spin_points    = Column(Integer, default=100)    # points pour tourner la roue
    points_avis_google  = Column(Integer, default=50)     # bonus avis Google validé
```

---

## 20. Enum OrigineCommandeEnum — distinction QR vs Serveur

```python
class OrigineCommandeEnum(str, enum.Enum):
    serveur  = "serveur"
    qr_table = "qr_table"
```

### Utilisation dans les commandes QR

```python
commande = Commande(
    code_unique=_generer_code(),
    table_id=data.table_id,
    origine=OrigineCommandeEnum.qr_table,   # ← toujours qr_table pour ce router
    statut=StatutCommandeEnum.en_cours,
    client_fidelite_id=data.client_fidelite_id,
)
```

### Utilisation dans les commandes serveur

```python
commande = Commande(
    code_unique=generer_code_unique(),
    table_id=data.table_id,
    employe_id=user.id,
    origine=OrigineCommandeEnum(data.origine),   # "serveur" par défaut
    statut=StatutCommandeEnum.en_cours
)
```

### Impact sur l'interface serveur

Dans `GET /api/commandes/`, l'origine est exposée dans la réponse. L'interface serveur (`ServeurCommande.jsx`) peut ainsi afficher un badge distinctif « QR » sur les commandes d'origine `qr_table` et mettre en évidence celles avec `especes_en_attente: true`.

---

## 21. Statuts de commande vus par le client

### Cycle de statut — paiement carte

```
en_cours     ← commande créée (POST /api/qr/commande)
             ← PaymentIntent créé (POST /api/qr/create-payment-intent/{id})
envoyee      ← paiement confirmé (POST /api/qr/confirmer-paiement/{id})
             [cuisinier prend en charge]
en_preparation ← cuisinier via PUT /api/commandes/{id}/statut
             [cuisinier marque toutes les lignes prêtes]
prete        ← automatique quand toutes lignes = prete
             [serveur clôture]
cloturee     ← PUT /api/commandes/{id}/cloturer (table → libre)
```

### Cycle de statut — paiement espèces

```
en_cours     ← commande créée (POST /api/qr/commande)
             ← paiement espèces enregistré (POST /api/qr/paiement-especes/{id})
             [serveur intervient physiquement]
envoyee      ← serveur envoie en cuisine (POST /api/commandes/{id}/envoyer-cuisine)
en_preparation ← cuisinier prend en charge
prete        ← automatique
cloturee     ← serveur clôture
```

### Messages correspondants côté client

| Statut | Icône | Message FR |
|--------|-------|------------|
| `en_cours` (espèces) | Clock orange | « Commande envoyée ! » + explication serveur |
| `envoyee` | Check vert | « Commande confirmée » / « Mise à jour toutes les 4 secondes » |
| `en_preparation` | ChefHat orange | badge « En préparation » |
| `prete` | PartyPopper vert | « Votre commande est prête — le serveur arrive ! » |
| `cloturee` | — | « Terminée » |

---

## 22. Fonctions API JavaScript (api.js)

Fichier : `frontend/src/services/api.js`

### Fonctions dédiées au QR

```javascript
// Charger table + menu + clé Stripe
export const getTableQR = (tableId) => api.get(`/api/qr/table/${tableId}`)

// Créer une commande QR
export const creerCommandeQR = (data) => api.post('/api/qr/commande', data)

// Créer un PaymentIntent Stripe
export const createPaymentIntent = (commandeId) => api.post(`/api/qr/create-payment-intent/${commandeId}`)

// Confirmer paiement carte après Stripe
export const confirmerPaiement = (commandeId, data) => api.post(`/api/qr/confirmer-paiement/${commandeId}`, data)

// Valider paiement espèces
export const payerEspeces = (commandeId) => api.post(`/api/qr/paiement-especes/${commandeId}`)

// Suivi de commande (polling)
export const statutCommandeQR = (commandeId) => api.get(`/api/qr/commande/${commandeId}`)

// Récupérer réductions disponibles d'un client (roue fortune)
export const getClientPrizes = (clientId) => api.get(`/api/qr/client-prizes/${clientId}`)
```

### Fonctions fidélité utilisées dans le tunnel QR

```javascript
// Connexion client fidélité
export const clientLogin = (data) => api.post('/api/client/login', data)

// Inscription client fidélité
export const clientRegister = (data) => api.post('/api/client/register', data)
```

### Configuration Axios

```javascript
const api = axios.create({
  baseURL: '',       // ← URL relative, proxy Vite vers :8000 en dev
  timeout: 30000,    // timeout 30 secondes
})
```

Le `baseURL` vide signifie que toutes les requêtes vont vers la même origine. En développement, Vite proxifie les requêtes `/api/*` vers `http://localhost:8000`.

---

## 23. Gestion des erreurs

### Erreurs frontend — guards de rendu

```javascript
if (!tableId)               return <Ecran><p className="text-red-400 text-sm">{tr.aucuneTable}</p></Ecran>
if (erreur && !menu.length) return <Ecran><p className="text-red-400 text-sm">{tr.tableIntrouvable}</p></Ecran>
if (!table)                 return <Ecran><Loader2 size={32} className="animate-spin" /></Ecran>
```

| Condition | Message affiché |
|-----------|-----------------|
| Pas de `table_id` dans l'URL | « Aucune table spécifiée dans l'URL. » |
| Table non trouvée (404) | « Table introuvable ou menu indisponible. » |
| Chargement en cours | Spinner animé |

### Erreurs de paiement

Les erreurs Stripe sont capturées et affichées dans l'interface :

```javascript
if (error) { onError(error.message); setLoading(false); return }
```

Les erreurs backend sont extraites du champ `detail` de la réponse :

```javascript
setErreur(e.response?.data?.detail || 'Erreur lors de la création de commande.')
```

### Erreurs backend — codes HTTP

| Situation | Code HTTP | Message |
|-----------|-----------|---------|
| Table non trouvée | 404 | « Table introuvable. » |
| Commande vide | 400 | « La commande est vide. » |
| Plat indisponible | 404 | « Plat {id} introuvable. » |
| Commande déjà payée | 400 | « Cette commande a déjà été payée. » |
| Paiement Stripe échoué | 400 | message Stripe |
| Commande introuvable (suivi) | 404 | « Commande introuvable. » |

### Erreurs ignorées silencieusement

Le polling avale les erreurs pour ne pas interrompre le suivi :

```javascript
try {
  const r = await statutCommandeQR(commandeId)
  setSuivi(r.data)
} catch {}   // ← erreur ignorée
```

De même, le chargement de la table dans `QRLanding` ignore les erreurs :

```javascript
getTableQR(tableId)
  .then(r => setTable(r.data.table))
  .catch(() => {})   // ← pas d'erreur affichée
```

---

## 24. Onboarding — popup de présentation

### Déclenchement

La popup s'affiche automatiquement à l'entrée dans `CommandeQR` (premier chargement) :

```javascript
const [showOnboarding, setShowOnboarding] = useState(true)
const [slideIdx, setSlideIdx] = useState(0)
```

L'utilisateur peut :
- Fermer avec le bouton X
- Cliquer « Passer » (skip)
- Naviguer entre les 3 slides avec « Suivant »
- Cliquer n'importe où en dehors du panneau pour fermer

Un bouton `?` dans le header menu permet de **rouvrir** l'onboarding :

```javascript
function reopenOnboarding() {
  setSlideIdx(0)
  setShowOnboarding(true)
}
```

### Contenu des 3 slides (FR)

| Slide | Emoji | Titre | Corps |
|-------|-------|-------|-------|
| 1 | 🍽️ | « Parcourez le menu » | Explorez nos plats par catégorie. Appuyez sur + pour ajouter un plat. |
| 2 | 🛒 | « Composez votre panier » | Ajustez les quantités, ajoutez des notes personnalisées puis choisissez votre mode de paiement. |
| 3 | ⚡ | « Payez & suivez en direct » | Payez par carte ou espèces. Votre commande est transmise et vous suivez l'avancement en temps réel. |

Les slides sont également traduits en EN et AR dans l'objet `I18N`.

### Design

- Fond semi-transparent avec blur (`rgba(0,0,0,0.75)` + `backdropFilter: blur(8px)`)
- Panneau `maxWidth: 400`, fond `#111f0f`, bordure orange subtile
- Indicateurs de progression : points clickables (actif = orange étiré `24px`, inactif = `8px`)

---

## 25. Mode sombre / Mode clair

### État et persistance

Le mode sombre/clair est géré dans `QRLanding` uniquement. L'état `dark` est initialisé à `true` (sombre par défaut) et peut être basculé par un bouton :

```javascript
const [dark, setDark] = useState(true)
// ...
<button onClick={() => setDark(d => !d)}>
  {dark ? <Sun size={13} /> : <Moon size={13} />}
</button>
```

**Note :** Le mode n'est pas persisté en localStorage et ne se propage pas à `CommandeQR` (qui utilise toujours le thème sombre `#0a1408`).

### Palette de couleurs

```javascript
const BG      = dark ? '#0a1408'                        : '#faf7f2'
const BG2     = dark ? 'rgba(232,130,74,0.10)'          : 'rgba(232,130,74,0.08)'
const ACCENT  = '#e8824a'                               // orange fixe
const TEXT    = dark ? 'rgba(245,240,232,0.9)'          : '#1a1208'
const MUTED   = dark ? 'rgba(245,240,232,0.35)'         : 'rgba(26,18,8,0.45)'
const MUTED2  = dark ? 'rgba(245,240,232,0.12)'         : 'rgba(26,18,8,0.1)'
const BORDER  = dark ? 'rgba(232,130,74,0.25)'          : 'rgba(232,130,74,0.35)'
const CTRL_BG = dark ? 'rgba(255,255,255,0.07)'         : 'rgba(0,0,0,0.06)'
```

---

## 26. Comportements de la table côté base de données

### Passage en `occupee`

Lors de la création d'une commande QR (`POST /api/qr/commande`), la table est immédiatement marquée comme occupée :

```python
table.statut = "occupee"
db.commit()
```

Cela se produit **avant** le paiement, au moment de la création de la commande. Même une commande espèces non encore envoyée en cuisine marque la table occupée.

### Retour à `libre`

La table repasse à `libre` uniquement lors de la clôture explicite (`POST /api/commandes/{id}/cloturer`) :

```python
if commande.table:
    commande.table.statut = "libre"
```

Un serveur doit donc obligatoirement clôturer la commande pour libérer la table, même pour les commandes QR.

### Statuts possibles

```python
class StatutTableEnum(str, enum.Enum):
    libre     = "libre"      # disponible pour une nouvelle commande/réservation
    occupee   = "occupee"    # commande en cours sur la table
    reservee  = "reservee"   # réservation confirmée
```

---

## 27. Schéma Pydantic des requêtes QR

### LigneQR

```python
class LigneQR(BaseModel):
    plat_id:  int
    quantite: int = 1
    note:     Optional[str] = None
```

### CommandeQRCreate

```python
class CommandeQRCreate(BaseModel):
    table_id:           int
    lignes:             List[LigneQR]
    client_fidelite_id: Optional[int] = None
    gain_id:            Optional[int] = None
```

### ConfirmerPaiement

```python
class ConfirmerPaiement(BaseModel):
    payment_intent_id: str
    mode:              str = "carte"   # carte | google_pay | apple_pay | especes
```

### Génération du code unique

```python
def _generer_code():
    today  = datetime.now().strftime("%Y%m%d")
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"CMD-{today}-{suffix}"

# Exemple : CMD-20260621-4271
```

---

## 28. Séquence complète — diagramme textuel

```
Client                    Frontend               Backend                 Stripe
  │                          │                      │                      │
  │ Scan QR code             │                      │                      │
  │─────────────────────────►│                      │                      │
  │                          │ GET /api/qr/table/3  │                      │
  │                          │─────────────────────►│                      │
  │                          │◄─────────────────────│                      │
  │                          │ {table, menu, stripe_key}                   │
  │                          │                      │                      │
  │ [Navigue vers /commande/menu]                   │                      │
  │─────────────────────────►│                      │                      │
  │                          │ GET /api/qr/table/3  │                      │
  │                          │─────────────────────►│                      │
  │                          │◄─────────────────────│                      │
  │                          │                      │                      │
  │ [Browse menu, add items] │                      │                      │
  │─────────────────────────►│                      │                      │
  │                          │ [panier local JS]    │                      │
  │                          │                      │                      │
  │ [Clic "Payer par carte"] │                      │                      │
  │─────────────────────────►│                      │                      │
  │                          │ POST /api/qr/commande│                      │
  │                          │─────────────────────►│                      │
  │                          │◄─────────────────────│                      │
  │                          │ {commande_id, code}  │                      │
  │                          │                      │                      │
  │                          │ POST /api/qr/create-payment-intent/156      │
  │                          │─────────────────────►│                      │
  │                          │                      │ stripe.PaymentIntent.create()
  │                          │                      │─────────────────────►│
  │                          │                      │◄─────────────────────│
  │                          │◄─────────────────────│                      │
  │                          │ {client_secret}       │                      │
  │                          │                      │                      │
  │ [Saisit carte, confirme] │                      │                      │
  │─────────────────────────►│                      │                      │
  │                          │ stripe.confirmCardPayment(client_secret)    │
  │                          │─────────────────────────────────────────────►
  │                          │◄─────────────────────────────────────────────
  │                          │ {paymentIntent.status: "succeeded"}         │
  │                          │                      │                      │
  │                          │ POST /api/qr/confirmer-paiement/156        │
  │                          │─────────────────────►│                      │
  │                          │                      │ stripe.PaymentIntent.retrieve()
  │                          │                      │─────────────────────►│
  │                          │                      │◄─────────────────────│
  │                          │                      │ commande → envoyee   │
  │                          │                      │ Paiement créé valide │
  │                          │                      │ points crédités      │
  │                          │◄─────────────────────│                      │
  │                          │ {message, points_gagnes}                    │
  │                          │                      │                      │
  │ [Étape 4 — Suivi]        │                      │                      │
  │─────────────────────────►│                      │                      │
  │                          │ GET /api/qr/commande/156 (toutes les 4s)   │
  │                          │─────────────────────►│                      │
  │                          │◄─────────────────────│                      │
  │                          │ {statut: "en_preparation"}                  │
  │                          │ ...polling...        │                      │
  │                          │ {statut: "prete"}    │                      │
  │                          │                      │                      │
  │ "Votre commande est prête !" (polling s'arrête) │                      │
```

---

## 29. Différences entre commande QR et commande serveur

| Caractéristique | Commande QR (`qr_table`) | Commande serveur (`serveur`) |
|----------------|--------------------------|------------------------------|
| Route de création | `POST /api/qr/commande` | `POST /api/commandes/` |
| Authentification | Aucune (public) | JWT serveur ou gérant |
| `employe_id` | `null` | ID du serveur connecté |
| `origine` | `qr_table` | `serveur` |
| Paiement carte | Via Stripe (côté client) | Non (le serveur encaisse) |
| Paiement espèces | `POST /api/qr/paiement-especes/{id}` | Géré à la clôture |
| Statut initial | `en_cours` | `en_cours` |
| Envoi en cuisine (carte) | Automatique à la confirmation | Manuel par serveur |
| Envoi en cuisine (espèces) | Manuel par serveur | Manuel par serveur |
| Suivi client | Polling public `/api/qr/commande/{id}` | Via interface serveur |
| Fidélité | Optionnelle, connexion inline | Via identifiant à la clôture |
| Modification commande | Impossible après création QR | Via routes dédiées |

---

## 30. Points de vigilance et cas limites

### Table déjà occupée

Il n'y a pas de garde côté backend qui empêche de créer une commande QR sur une table déjà occupée. Si un client scanne le QR d'une table déjà occupée, une deuxième commande sera créée. Le gérant doit superviser les tables depuis `GerantTables.jsx`.

### Plat devenu indisponible entre le chargement et la commande

Le menu est chargé une seule fois au montage de `CommandeQR`. Si un plat est mis hors disponibilité entre le chargement du menu et la soumission, le backend rejette avec `404 "Plat {id} introuvable."` car il filtre `Plat.disponible == True` :

```python
plat = db.query(Plat).filter(Plat.id == l.plat_id, Plat.disponible == True).first()
if not plat:
    raise HTTPException(404, f"Plat {l.plat_id} introuvable.")
```

### Gain roue utilisé entre loadPrizes et soumission

Le gain est marqué `utilise` seulement au moment de la création de commande (`creer_commande_qr`). Si deux sessions client tentent d'utiliser le même gain simultanément, la deuxième ne trouvera plus le gain avec `statut = non_utilise` et la réduction ne sera pas appliquée (sans erreur, le total reste non réduit).

### Stripe non configuré

Si `settings.STRIPE_SECRET_KEY` est vide ou invalide, la route `create-payment-intent` lèvera une exception Stripe. Côté frontend, `stripePromise` sera `null` si `stripe_publishable_key` n'est pas retourné par le backend, et le bouton « Payer par carte » affichera le message d'indisponibilité.

### Polling sans fin (commande espèces)

Pour les commandes espèces, la commande reste en `en_cours` jusqu'à ce que le serveur l'envoie en cuisine. Le polling s'arrête uniquement sur `prete` ou `cloturee`. Si le serveur ne traite jamais la commande, le polling tourne indéfiniment. En pratique, le composant se démontera quand le client fermera l'onglet, ce qui arrête le `setInterval` via la fonction de cleanup du `useEffect`.

### Clé localStorage `sky07_lang`

La langue est lue depuis `localStorage` par les deux composants (`QRLanding` et `CommandeQR`), mais n'est modifiable que depuis `QRLanding`. Si un client change de langue sur `QRLanding` puis clique « Commander », `CommandeQR` lira la nouvelle langue depuis `localStorage`.

### Code unique de commande — collision

Le code unique est généré avec 4 chiffres aléatoires + la date :

```python
suffix = ''.join(random.choices(string.digits, k=4))
return f"CMD-{today}-{suffix}"
```

La probabilité de collision est faible (1/10000 par jour) mais non nulle. En cas de collision, la contrainte `unique=True` sur `code_unique` en base provoquera une `IntegrityError`. Il n'y a pas de retry automatique — cela générerait une erreur 500. En production avec un volume élevé, il faudrait augmenter le nombre de chiffres ou ajouter une logique de retry.

### Tombola — seuil 200 Dh

La réponse de `confirmer_paiement` et `payer_especes` inclut le champ `peut_participer_tombola` calculé côté backend :

```python
"peut_participer_tombola": commande.montant_total >= 200,
```

Ce champ est retourné mais **pas utilisé actuellement** côté frontend de `CommandeQR`. Il est prévu pour une intégration future avec la tombola.

### Devise EUR vs MAD

Le PaymentIntent Stripe est créé en EUR (centimes) car Stripe test ne supporte pas le MAD. Le montant affiché côté client est en Dh (MAD). Il y a donc une incohérence devise en mode test. En production, il faudra soit intégrer un prestataire supportant le MAD, soit faire une conversion EUR/MAD.

---

*Documentation générée le 2026-06-21 — MangerManger / SKY07*
