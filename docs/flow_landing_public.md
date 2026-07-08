# Documentation — Pages Publiques et Landing Page (SKY07)

> Projet : MangerManger — Restaurant SKY07, Casablanca  
> Stack : React 18 + Vite + Tailwind CSS (frontend) / FastAPI + SQLAlchemy + SQLite (backend)  
> Date de rédaction : 2026-06-21

---

## Sommaire

1. [Vue d'ensemble des routes publiques](#1-vue-densemble-des-routes-publiques)
2. [Branding et design tokens](#2-branding-et-design-tokens)
3. [LandingPage — structure générale](#3-landingpage--structure-générale)
4. [Section Hero](#4-section-hero)
5. [Bande d'informations (Stats Strip)](#5-bande-dinformations-stats-strip)
6. [Section À propos](#6-section-à-propos)
7. [Section Réservations CTA](#7-section-réservations-cta)
8. [Section Avis Clients](#8-section-avis-clients)
9. [Footer](#9-footer)
10. [Vue Menu — affichage par catégorie](#10-vue-menu--affichage-par-catégorie)
11. [Logique d'image des plats](#11-logique-dimage-des-plats)
12. [Modal Nutrition (NutritionModal)](#12-modal-nutrition-nutritionmodal)
13. [Modal Réservation rapide (in-page)](#13-modal-réservation-rapide-in-page)
14. [MenuSection — composant héritage](#14-menusection--composant-héritage)
15. [ReservationClient — flux complet 5 écrans](#15-reservationclient--flux-complet-5-écrans)
    - [Écran 0 — Accueil ticket](#151-écran-0--accueil-ticket)
    - [Écran 1 — Configuration](#152-écran-1--configuration)
    - [Écran 2 — Ticket de synthèse](#153-écran-2--ticket-de-synthèse)
    - [Écran 3 — Paiement Stripe](#154-écran-3--paiement-stripe)
    - [Écran 4 — Succès & téléchargement PDF](#155-écran-4--succès--téléchargement-pdf)
16. [Zones disponibles (ZONES)](#16-zones-disponibles-zones)
17. [Sélecteur de date personnalisé](#17-sélecteur-de-date-personnalisé)
18. [Composant Barcode SVG](#18-composant-barcode-svg)
19. [Composant Perforation (PerfoRow)](#19-composant-perforation-perforow)
20. [Intégration Stripe — salle privée](#20-intégration-stripe--salle-privée)
21. [Téléchargement ticket PDF](#21-téléchargement-ticket-pdf)
22. [QRLanding — page d'accueil QR code](#22-qrlanding--page-daccueil-qr-code)
23. [Internationalisation (i18n) dans QRLanding](#23-internationalisation-i18n-dans-qrlanding)
24. [Route /commande/menu — CommandeQR](#24-route-commandemenu--commandeqr)
25. [API publiques utilisées (sans authentification)](#25-api-publiques-utilisées-sans-authentification)
26. [Routes backend — Plats](#26-routes-backend--plats)
27. [Routes backend — Réservations](#27-routes-backend--réservations)
28. [Routes backend — Avis Clients](#28-routes-backend--avis-clients)
29. [Routes backend — QR Commande](#29-routes-backend--qr-commande)
30. [Modèles de données SQLAlchemy](#30-modèles-de-données-sqlalchemy)
    - [Plat](#301-plat)
    - [Categorie](#302-categorie)
    - [NutritionFact](#303-nutritionfact)
    - [Reservation](#304-reservation)
    - [AvisClient](#305-avisclient)
    - [Table](#306-table)
31. [Enums pertinents](#31-enums-pertinents)
32. [Routing React (App.jsx)](#32-routing-react-appjsx)
33. [Intercepteur Axios — api.js](#33-intercepteur-axios--apijs)
34. [Fonctions API publiques exportées](#34-fonctions-api-publiques-exportées)
35. [Composants partagés utilisés](#35-composants-partagés-utilisés)
36. [Animations et transitions CSS](#36-animations-et-transitions-css)
37. [Choix de conception et UX](#37-choix-de-conception-et-ux)
38. [Flux de données complet — résumé](#38-flux-de-données-complet--résumé)

---

## 1. Vue d'ensemble des routes publiques

L'application expose plusieurs routes accessibles sans authentification, destinées aux clients du restaurant.

| Route React | Composant | Description |
|---|---|---|
| `/` | `LandingPage` | Page principale du restaurant SKY07 |
| `/reservation` | `ReservationClient` | Formulaire de réservation en 5 écrans |
| `/commande` | `QRLanding` | Page d'accueil après scan d'un QR code de table |
| `/commande/menu` | `CommandeQR` | Menu interactif pour commander depuis la table |
| `/setup` | `SetupPage` | Configuration initiale du restaurant (SaaS) |
| `/login` | `LoginPage` | Connexion des employés (gérant, serveur, cuisinier) |
| `/client/login` | `ClientLogin` | Connexion / inscription du programme de fidélité |

Les routes protégées (`/gerant/*`, `/serveur/*`, `/cuisinier/*`, `/client/*`) nécessitent un JWT valide et un rôle correspondant.

---

## 2. Branding et design tokens

### Identité visuelle

Le restaurant s'appelle **SKY07**, situé à Casablanca, Maroc. La LandingPage utilise une palette "restaurant haut de gamme" sombre appelée **container-restaurant palette**, définie directement dans le composant via l'objet `C` :

```javascript
// LandingPage.jsx — Design tokens
const C = {
  ink:    '#0E0E0E',   // fond le plus sombre (fond global)
  carbon: '#1A1A1A',   // fond de sections
  steel:  '#2C2C2C',   // bordures
  iron:   '#4A4A4A',   // texte discret
  smoke:  '#8A8A8A',   // texte secondaire / labels
  fog:    '#BDBDBD',   // texte de corps
  ash:    '#EFEFEF',   // fond clair
  canvas: '#F7F4EF',   // fond crème
  white:  '#FFFFFF',
  cedar:  '#A0714F',   // couleur d'accentuation principale (brun-doré)
  timber: '#C8966A',   // variante hover de cedar
  bark:   '#5C3D24',   // brun foncé
  moss:   '#5A6B47',   // vert sentiment positif
  leaf:   '#7A8F5F',   // vert secondaire
}
```

### Typographies (Google Fonts)

| Variable | Valeur | Usage |
|---|---|---|
| `display` | `'Cormorant Garamond', serif` | Titres de section, grands affichages |
| `body` | `'DM Sans', sans-serif` | Corps de texte, navigation, boutons |
| `mono` | `'JetBrains Mono', monospace` | Prix, codes, données techniques |

La police `'Bebas Neue', sans-serif` est utilisée pour le logo SKY07 dans le header et le footer.

### Palette ReservationClient

La page `ReservationClient.jsx` utilise une palette distincte, inspirée des tickets de restaurant :

```javascript
const INK    = '#1A1410'   // fond sombre chaud
const CREAM  = '#F5F0E8'   // blanc crème
const PAPER  = '#FAF7F0'   // blanc papier (fond écran 1)
const MUTED  = '#8A7E76'   // gris taupe
const RED    = '#C8312A'   // rouge accent (CTA, salle privée)
const GOLD   = '#B8963E'   // or (dates, accents)
const GREEN  = '#2D7D5A'   // vert (terrasse)

const serif  = "'DM Serif Display', serif"
const mono   = "'Space Mono', monospace"
const bebas  = "'Bebas Neue', sans-serif"
```

---

## 3. LandingPage — structure générale

**Fichier** : `frontend/src/pages/LandingPage.jsx`

La LandingPage fonctionne avec un système de **vues** contrôlé par l'état `view` :

```javascript
const [view, setView] = useState('home')  // 'home' | 'menu'
```

Quand `view === 'home'` : toutes les sections de la landing s'affichent (Hero, Stats, About, Reservation CTA, Avis Clients, Footer).

Quand `view === 'menu'` : la vue bascule vers la liste du menu par catégories, avec les mêmes header et footer.

Cette approche évite une navigation entre pages et maintient une expérience SPA fluide avec `window.scrollTo(0,0)` à chaque changement de vue.

### États globaux du composant

```javascript
const [view, setView]           = useState('home')     // vue active
const [menuOpen, setMenuOpen]   = useState(false)      // modal réservation rapide
const [scrolled, setScrolled]   = useState(false)      // header transparent/opaque

// Données menu
const [categories, setCategories] = useState([])
const [activeTab, setActiveTab]   = useState(null)

// Modal nutrition
const [nutritionPlat,    setNutritionPlat]    = useState(null)
const [nutritionLoading, setNutritionLoading] = useState(false)
const [nutritionAbsent,  setNutritionAbsent]  = useState(false)

// Formulaire réservation rapide (modal)
const [resaForm, setResaForm] = useState({ nom, telephone, date, heure, personnes, message })
const [resaLoading, setResaLoading] = useState(false)
const [resaError, setResaError]     = useState('')
const [resaCode, setResaCode]       = useState(null)

// Avis clients
const [avis, setAvis]           = useState([])
const [avisForm, setAvisForm]   = useState({ nom, note: 5, commentaire })
const [avisLoading, setAvisLoading] = useState(false)
const [avisSent, setAvisSent]       = useState(false)
const [avisError, setAvisError]     = useState('')
```

### Chargement initial des données

Deux `useEffect` se déclenchent au montage du composant :

```javascript
// 1. Chargement du menu
useEffect(() => {
  getMenu().then(r => {
    const cats = r.data.filter(c => c.plats.length > 0)
    setCategories(cats)
    if (cats.length > 0) setActiveTab(cats[0].id)
  }).catch(() => {})
}, [])

// 2. Chargement des avis publics validés
useEffect(() => {
  getAvisPublics().then(r => setAvis(r.data)).catch(() => {})
}, [])
```

---

## 4. Section Hero

La section Hero occupe **100vh** (viewport complet) avec un fond photographique et un dégradé de bas en haut.

### Image de fond

```javascript
backgroundImage: "url('/hero.webp')"
// Paramètres :
backgroundSize: 'cover'
backgroundPosition: 'center 30%'
filter: 'brightness(0.48) saturate(0.8)'  // assombri et désaturé
```

L'image `/hero.webp` est servie depuis la racine du dossier `public/` de Vite. En cas d'absence, un fond noir s'affiche (l'overlay de dégradé suffit).

### Dégradé de protection du texte

```javascript
background: 'linear-gradient(to top, rgba(14,14,14,0.92) 0%, rgba(14,14,14,0.04) 55%)'
```

Ce dégradé assure la lisibilité du texte blanc placé en bas de l'image.

### Contenu du Hero

- **Surtitre** : `"Casablanca · Ouvert tous les jours"` — texte uppercase, couleur cedar, tracking 0.2em
- **Logo** : `"SKY07"` — police Bebas Neue, couleur cedar
- **H1** : `"Bonne cuisine. Bonne table."` — police Cormorant Garamond, taille `clamp(52px,8vw,90px)`, poids 300
  - La partie italique `"Bonne table."` est colorée en `timber` (#C8966A)
- **Sous-titre** : `"Votre expérience gastronomique au cœur de Casablanca..."` — 18px, couleur fog, max-width 460px
- **Boutons** :
  - Primaire : `"Réserver une table"` → navigue vers `/reservation`
  - Secondaire : `"Voir le menu"` → bascule `view` sur `'menu'`

### Composant `Btn`

Bouton réutilisable avec deux variantes :

```javascript
function Btn({ children, primary, onClick, icon, type, disabled, style }) {
  // primary=true → fond cedar, texte blanc, hover timber
  // primary=false → fond transparent, bordure blanche semi-transparente
}
```

---

## 5. Bande d'informations (Stats Strip)

Grille horizontale de 4 colonnes placée immédiatement sous le Hero, sur fond `carbon` (#1A1A1A) :

| Libellé | Valeur |
|---|---|
| Horaires | 12:00 – 23:00 |
| Adresse | Casablanca, Maroc |
| Capacité | 80 couverts + terrasse |
| Cuisine ferme | 22:00 chaque soir |

Chaque cellule affiche un label en uppercase, 11px, couleur cedar, et une valeur en Cormorant Garamond 22px, blanc. Les cellules sont séparées par des bordures `steel`.

---

## 6. Section À propos

Section en deux colonnes (50/50), padding 96px vertical, 80px horizontal.

**Colonne gauche** (texte) :
- Surtitre uppercase : `"À propos"`
- Titre H2 : `"SKY07 — une expérience à part."` — Cormorant Garamond 52px
- Paragraphe de description du restaurant
- Bouton secondaire : `"Voir le menu →"` → bascule vers la vue menu

**Colonne droite** (photo) :
- Même image `/hero.webp`, recadrée en ratio 4/3
- `objectPosition: 'center 20%'` pour cadrer sur le haut de la scène
- `filter: 'brightness(0.7) saturate(0.85)'`

---

## 7. Section Réservations CTA

Section centrée avec :
- Surtitre : `"Réservations"`
- Titre : `"Prêt à nous rejoindre ?"` — max-width 560px, Cormorant Garamond 52px
- Texte informatif sur les disponibilités (mention terrasse)
- Bouton primaire : `"Réserver une table"` → navigue vers `/reservation`

---

## 8. Section Avis Clients

Grille deux colonnes : formulaire à gauche, liste des avis à droite.

### Formulaire de dépôt d'avis

Champs :
- **Votre nom** : champ texte, requis, max 60 caractères
- **Note** : 5 étoiles cliquables (`★`), couleur cedar si actif, steel sinon
- **Commentaire** : textarea, requis, max 500 caractères, 4 lignes

Soumission :
```javascript
await deposerAvis(avisForm)
// POST /api/avis-clients/
// Body : { nom, note, commentaire }
```

Après envoi réussi, un message de confirmation s'affiche : `"Merci pour votre avis ! Votre avis est en cours de modération et sera publié sous peu."` Avec un lien pour laisser un autre avis.

En cas d'erreur, le message d'erreur backend s'affiche en rouge.

### Affichage de la liste des avis

Les avis sont chargés depuis `GET /api/avis-clients/` (uniquement les avis avec `statut = "valide"`). Les 5 premiers avis sont affichés.

Chaque carte d'avis contient :
- Nom du client (Cormorant Garamond 18px)
- Étoiles de notation (1 à 5, `★` cedar / `☆` gris)
- Badge sentiment (si présent) :
  - `positif` → fond vert semi-transparent, texte `#7A8F5F`
  - `negatif` → fond rouge semi-transparent, texte `#E57373`
  - `neutre` → fond gris semi-transparent
- Date au format `JJ MMM` (ex: `21 Juin`)
- Texte du commentaire (14px, fog)

Le badge sentiment est généré par l'IA HuggingFace `cardiffnlp/twitter-xlm-roberta-base-sentiment` lors de la validation par le gérant.

---

## 9. Footer

```javascript
function Footer({ onMenu, onResa }) { ... }
```

Footer horizontal avec :
- Logo SKY07 en Bebas Neue 26px à gauche
- Liens de navigation au centre : `menu`, `réservation`, `instagram`
- Copyright `"© 2026 SKY07"` à droite

---

## 10. Vue Menu — affichage par catégorie

Accessible via le bouton `"Voir le menu"` ou le lien de navigation `menu` dans le header.

### Appel API de chargement

```javascript
getMenu()
// GET /api/plats/categories
// Réponse : [{ id, nom, plats: [...] }, ...]
// Filtre : uniquement catégories ayant au moins 1 plat
```

La réponse inclut pour chaque plat : `id`, `nom`, `description`, `prix`, `image`, `disponible`, `vegetarien`, `sans_gluten`, `allergenes`, `nutrition`.

### Onglets de catégories

```javascript
<div style={{ display: 'flex', gap: 0, marginBottom: 48, borderBottom: `1px solid ${C.steel}` }}>
  {categories.map(cat => (
    <button
      key={cat.id}
      onClick={() => setActiveTab(cat.id)}
      style={{
        // Onglet actif : couleur blanche, bordure basse cedar
        // Onglet inactif : couleur smoke
      }}
    >
      {cat.nom}
    </button>
  ))}
</div>
```

### Grille de plats

Grille CSS 3 colonnes (`repeat(3, 1fr)`), gap 16px.

Chaque carte de plat :

```javascript
<div
  onClick={() => ouvrirNutrition(plat)}   // Ouvre le modal nutrition
  onMouseEnter={...}  // translateY(-3px) + borderColor cedar
  onMouseLeave={...}  // retour à normal
>
  {/* Zone image — ratio 4/3 */}
  <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
    <img src={imgSrc} ... onError={e => e.target.src = IMG_PLAT} />
    {/* Badges : Végé (vert) / SG = Sans Gluten (brun) */}
    {/* Prix en overlay bas-droite : "XX Dh" — fond noir semi-transparent, JetBrains Mono */}
  </div>

  {/* Zone infos */}
  <div style={{ padding: '16px 18px' }}>
    <div>{plat.nom}</div>          {/* Cormorant Garamond 20px */}
    <div>{plat.description}</div>  {/* Clamp 2 lignes */}
    <div>Voir nutrition →</div>    {/* Lien discret cedar */}
  </div>
</div>
```

### État vide / chargement

Si `categories.length === 0`, un message s'affiche :
> "Menu en cours de chargement… Si rien n'apparaît, vérifiez que le serveur backend est démarré sur le port 8000."

---

## 11. Logique d'image des plats

La fonction `getPlatImage(plat, catNom)` implémente un système de fallback intelligent :

```javascript
function getPlatImage(plat, catNom) {
  // 1. Image uploadée par le gérant (chemin relatif ou URL complète)
  if (plat.image) {
    return plat.image.startsWith('http')
      ? plat.image
      : `${BACKEND}${plat.image}`  // BACKEND = 'http://localhost:8000'
  }

  // 2. Fallback par mots-clés dans le nom du plat
  const n = plat.nom.toLowerCase()
  const c = (catNom || '').toLowerCase()

  if (n.includes('salade') || n.includes('nicoise'))  return IMG_SALADE  // Unsplash
  if (n.includes('tajine') || n.includes('tagine'))   return IMG_TAJINE
  if (n.includes('moelleux') || c.includes('dessert')) return IMG_DESSERT
  if (c.includes('boisson') || n.includes('jus'))     return IMG_BOISSON
  if (c.includes('entrée') || c.includes('soupe'))    return IMG_ENTREE
  return IMG_PLAT  // image générique de plat
}
```

Images Unsplash utilisées comme fallback :

| Constante | URL (résumée) | Usage |
|---|---|---|
| `IMG_SALADE` | `photo-1512621776951-a57141f2eefd` | Salades, nicoise |
| `IMG_DESSERT` | `photo-1563805042-7684c019e1cb` | Desserts, gâteaux |
| `IMG_TAJINE` | `photo-1585937421612-70a008356fbe` | Tajines marocains |
| `IMG_ENTREE` | `photo-1541014741259-de529411b96a` | Entrées, soupes |
| `IMG_PLAT` | `photo-1414235077428-338989a2e8c0` | Plat générique |
| `IMG_BOISSON` | `photo-1544145945-f90425340c7e` | Boissons |

---

## 12. Modal Nutrition (NutritionModal)

Déclenché par clic sur une carte de plat dans la vue menu.

### Logique d'ouverture

```javascript
async function ouvrirNutrition(plat) {
  setNutritionAbsent(false)

  // Cache : si nutrition déjà présente sur l'objet (incluse dans la réponse /categories)
  if (plat.nutrition) {
    setNutritionPlat(plat)
    return
  }

  // Sinon : appel API dédié
  setNutritionLoading(true)
  setNutritionPlat({ ...plat, nutrition: null })  // ouvre le modal en état "loading"
  try {
    const r = await getNutrition(plat.id)
    // GET /api/nutrition/{platId}
    setNutritionPlat({ ...plat, nutrition: r.data })
  } catch {
    setNutritionAbsent(true)   // 404 → affiche message "données non disponibles"
  } finally {
    setNutritionLoading(false)
  }
}
```

### États du modal

**État 1 — Chargement** : Spinner animé (animation CSS `spin`), fond semi-transparent, clic en dehors ferme le modal.

**État 2 — Données absentes (404)** :
- Émoji 🥗
- Nom du plat
- Message : "Les informations nutritionnelles ne sont pas encore disponibles pour ce plat."
- Bouton "Fermer"

**État 3 — Données disponibles** : Le composant `<NutritionModal plat={nutritionPlat} onClose={() => setNutritionPlat(null)} />` est rendu (défini dans `src/components/shared/NutritionModal.jsx`).

Les données nutritionnelles possibles incluent : `calories`, `proteines`, `glucides`, `lipides`, `fibres`, `sucre`, `sodium`, `taille_portion`.

---

## 13. Modal Réservation rapide (in-page)

La LandingPage dispose d'un modal de réservation simplifié (distinct de la page `/reservation` complète). Il est déclenché par `openModal()` mais **n'est pas directement accessible depuis la navigation** — le bouton "Réserver" dans le header redirige vers `/reservation`. Ce modal reste pour usage interne éventuel.

### Formulaire du modal

Champs :
- Nom complet (requis)
- Téléphone (requis)
- Date (requis, min = aujourd'hui)
- Heure : sélecteur parmi les créneaux `TIME_SLOTS`
- Personnes : select de 1 à 9+

```javascript
const TIME_SLOTS = ['12:00','13:00','14:00','18:00','18:30','19:00','19:30',
                    '20:00','20:30','21:00','21:30','22:00']
```

- Message / demandes particulières (optionnel)

### Soumission

```javascript
await creerReservation({
  nom_complet:  resaForm.nom,
  telephone:    resaForm.telephone,
  date:         resaForm.date,
  heure:        resaForm.heure,
  nb_personnes: parseInt(resaForm.personnes),
  message:      resaForm.message || null,
  zone:         'salle',   // zone fixe dans le modal rapide
})
// POST /api/reservations/
```

En cas de succès, un code de réservation s'affiche avec une icône CheckCircle verte. En cas d'erreur, le message du backend est affiché en rouge.

---

## 14. MenuSection — composant héritage

**Fichier** : `frontend/src/components/landing/MenuSection.jsx`

Ce composant est une version antérieure du menu, utilisée dans une version précédente de la LandingPage. Il utilise des **données mockées** (`../../data/mockData`) plutôt que l'API réelle.

### Différences avec la version actuelle

| Aspect | MenuSection (héritage) | LandingPage vue menu (actuelle) |
|---|---|---|
| Source des données | `mockData.js` statique | API `GET /api/plats/categories` |
| Palette | Vert foncé `#0a1408`, orange `#e8824a` | Noir `#0E0E0E`, brun-doré cedar |
| Typographies | Playfair Display + Inter | Cormorant Garamond + DM Sans |
| Nutrition | Non disponible | Modal avec API |
| Animation | `useScrollFade` hook + `opacity-0 translate-y-8` | Hover translateY(-3px) |

### Design spécifique de MenuSection

```javascript
// Couleur accent
const A = '#e8824a'

// Carte de plat : fond vert très sombre
style={{ background:'#111a0e', border:'1px solid rgba(232,130,74,0.07)' }}

// Pattern de fond décoratif (section entière)
backgroundImage: 'repeating-linear-gradient(45deg,#e8824a 0,#e8824a 1px,transparent 0,transparent 50%)'
backgroundSize: '20px 20px'
opacity: 0.025
```

La carte `PlatCard` affiche :
- Image avec `loading="lazy"` et `group-hover:scale-110 transition-transform duration-700`
- Badge catégorie (haut gauche) avec fond noir semi-transparent et backdropFilter blur
- Badge prix (haut droite) avec dégradé `linear-gradient(135deg,${A},#c9673a)`
- Nom du plat en Playfair Display
- Description en 2 lignes clampées
- Ligne dorée décorative en bas, animée au hover (`scaleX(0)` → `scaleX(1)`)

---

## 15. ReservationClient — flux complet 5 écrans

**Fichier** : `frontend/src/pages/ReservationClient.jsx`  
**Route** : `/reservation` (publique) et `/client/reservation` (espace fidélité)

La page est conçue comme un **ticket de restaurant physique numérique**. Elle guide l'utilisateur en 5 écrans successifs, gérés par un état `screen` (0 à 4).

```javascript
const [screen, setScreen] = useState(0)
function goTo(n) { setError(''); setScreen(n) }
```

### 15.1 Écran 0 — Accueil ticket

Fond noir `INK`, centré verticalement. Design minimaliste inspiré des distributeurs de tickets.

**Structure** :
- En-tête : `"SKY07"` en DM Serif Display doré + date/heure actuelle en mono discret
- Centre : texte `"Prêt pour le service"` en DM Serif Display 42px crème
- **Ticket CTA rouge** (bouton principal) :
  - Fond `RED` (#C8312A) avec hachures diagonales décoratives
  - Perforations en haut et en bas (`PerfoRow`)
  - Texte : `"Effectuer une réservation"` en Bebas Neue 28px
  - Sous-texte : `"Appuyer pour commencer"` en mono 8px
  - Ombre portée : `0 8px 32px rgba(200,49,42,0.45)`
  - Hover : `translateY(-2px)` + ombre intensifiée
- Pied de page : Barcode SVG à opacité 0.18 + horodatage

### 15.2 Écran 1 — Configuration

Fond `PAPER` (#FAF7F0) clair. Formulaire complet sur une seule vue avec défilement.

**En-tête** :
- Libellé étape : `"Étape 1/2 · Configuration"` (rouge, mono)
- Titre : `"Nouvelle réservation"` (DM Serif Display 26px, INK)
- Séparateur pointillé bas

**Section : Nombre de couverts**

Compteur avec boutons `−` et `+` (limite : 1–20) :
```javascript
<button onClick={() => setCouverts(c => Math.max(1, c - 1))}>−</button>
<div style={{ fontFamily: bebas, fontSize: 68 }}>{couverts}</div>
<button onClick={() => setCouverts(c => Math.min(20, c + 1))}>+</button>
```

Raccourcis rapides : `[2, 3, 4, 6, 8, 10]` — boutons pills qui définissent directement la valeur.

**Section : Date & Heure**

- Calendrier personnalisé `<DatePicker />` (voir section 17)
- Grille d'heures : 13 créneaux en `repeat(4,1fr)`, de 12:00 à 22:00

```javascript
const TIME_SLOTS = ['12:00','12:30','13:00','13:30','18:00','18:30',
                    '19:00','19:30','20:00','20:30','21:00','21:30','22:00']
```

Créneau sélectionné : fond INK, texte crème. Créneau non sélectionné : fond blanc, texte INK.

**Section : Emplacement (optionnel)**

Grille `2 colonnes` de `ZoneCard` (voir section 16). Une option `null` ("Attribution automatique") est possible.

**Section : Vos coordonnées**

- Nom complet (requis, placeholder "Mohammed Alami")
- Téléphone (requis, type="tel", placeholder "+212 6 00 00 00 00")
- Message (optionnel, textarea 2 lignes, placeholder "Occasion spéciale, allergies…")

**Boutons de navigation** :
- `"Suivant →"` (Bebas Neue, fond INK, PerfoRow décorative) → goTo(2)
- `"← Retour"` (lien texte) → goTo(0)

### 15.3 Écran 2 — Ticket de synthèse

Fond sombre `#2A2420`. Le ticket physique est rendu visuellement au centre.

**Ticket physique** :
- Fond `CREAM` avec perforations gauche et droite (9 cercles de 14px chacun, fond `#2A2420`)
- Header du ticket :
  - `"SKY07"` en DM Serif Display 18px
  - Sous-titre : `"Ticket de réservation · Service en salle"` en mono
  - Tampon rotatif (`transform: rotate(-12deg)`) : cercle rouge avec `"EN ATTENTE"` et numéro de référence
- Contenu en grille 2 colonnes :
  - N° réservation (`SKY-XXXXX`)
  - Date (JJ/MM/AAAA)
  - Heure
  - Couverts (Bebas Neue 36px)
  - Zone / Emplacement (avec point coloré)
  - Client (nom + téléphone)
  - Acompte 500 DH (si salle privée, affiché en rouge)
- Ligne de découpe avec ciseaux `✂`
- Barcode SVG bas de ticket + numéro de série

**Mode paiement (seulement si salle privée)** :
```javascript
// 2 options :
{ id: 'carte',   label: 'Carte bancaire en ligne',  icon: '💳' }
{ id: 'especes', label: 'Espèces sur place',         icon: '💵' }
```

Les options s'affichent sous le ticket avec bordure rouge si sélectionné.

**Bouton de confirmation** :
- `"✓ CONFIRMER LA RÉSERVATION"` — Bebas Neue 22px, fond rouge, PerfoRow, ombre rouge
- Déclenche `handleSubmit()`

### Logique `handleSubmit()`

```javascript
async function handleSubmit() {
  // Validation : nom, téléphone, date obligatoires
  const r = await creerReservation({
    nom_complet:    nom,
    telephone:      telephone,
    date:           date,
    heure:          heure,
    nb_personnes:   couverts,
    zone:           zone || 'salle',
    message:        message || null,
    mode_paiement:  isPrivee ? modePaiement : null,
    montant_acompte: isPrivee ? 500 : null,
  })

  setResaId(r.data.id)
  setCode(r.data.code_acces)
  setResaNum(`SKY-${String(r.data.id).padStart(5, '0')}`)  // ex: SKY-00042

  if (isPrivee && modePaiement === 'carte') {
    // Créer PaymentIntent Stripe
    const r2 = await creerPaiementReservation(r.data.id)
    setClientSecret(r2.data.client_secret)
    setStripe(loadStripe(r2.data.stripe_publishable_key))
    goTo(3)  // → écran paiement Stripe
  } else {
    goTo(4)  // → écran succès directement
  }
}
```

### 15.4 Écran 3 — Paiement Stripe

Uniquement affiché pour la **Salle Privée avec paiement en ligne**.

**Affichage** :
- Libellé : `"Paiement en ligne"` (rouge, mono)
- Titre : `"Salle Privée"` (DM Serif Display, crème)
- Montant : `"500 DH"` (Bebas Neue 40px, rouge)
- Résumé de la réservation (client, date, heure, couverts)

**Formulaire Stripe** (`<StripeForm />`) :
```javascript
function StripeForm({ clientSecret, resaId, onSuccess, onError }) {
  const stripe   = useStripe()
  const elements = useElements()

  async function handlePay(e) {
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    })
    if (paymentIntent.status === 'succeeded') {
      const r = await confirmerPaiementReservation(resaId, { payment_intent_id: paymentIntent.id })
      onSuccess(r.data.code_acces)
    }
  }
  // ...
}
```

`<CardElement>` est stylisé pour correspondre à la palette sombre :
```javascript
style: {
  base: { fontSize: '14px', color: CREAM, fontFamily: mono }
}
```

Note de test : `4242 4242 4242 4242 · 12/26 · 123` affichée sous le formulaire en mono 8px.

Le bouton de paiement utilise `PerfoRow` en haut pour l'effet ticket, et Bebas Neue pour le texte.

### 15.5 Écran 4 — Succès & téléchargement PDF

**Cercle de succès** : cercle avec bordure rouge, checkmark intégré en CSS pur (sans SVG externe).

**Contenu** :
- Libellé : `"Réservation confirmée"` (rouge, mono)
- Titre : `"À bientôt chez SKY07"` (DM Serif Display 36px, crème)
- **Code d'accès salle privée** (si applicable) : affiché dans un encadré rouge avec fond translucide
  - Format : `LOCAL-2026-XXXXXX`
  - Message : "Présentez ce code à l'entrée pour accéder à votre salle"
- Récapitulatif (grille 2 colonnes) : Client, Couverts, Date, Heure, Zone, Réf.
- Message : "Nous vous contacterons pour confirmer. Une confirmation par SMS sera envoyée."
- **Bouton télécharger ticket PDF** (rouge, PerfoRow, Bebas Neue)
- Bouton "Nouvelle réservation" (transparent, bord blanc) → `reset()`

---

## 16. Zones disponibles (ZONES)

Le tableau `ZONES` définit les 4 emplacements disponibles à la réservation :

```javascript
const ZONES = [
  {
    id: 'salle',
    name: 'Salle Principale',
    icon: '🍽',
    color: GOLD,            // #B8963E
    bg: 'rgba(184,150,62,0.1)',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 8 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 't1',
    name: 'Terrasse',
    icon: '☀',
    color: GREEN,           // #2D7D5A
    bg: 'rgba(45,125,90,0.1)',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 6 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 't2',
    name: 'Terrasse Jardin',
    icon: '🌿',
    color: '#4A7C59',
    bg: 'rgba(74,124,89,0.1)',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 6 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 'priv',
    name: 'Salle Privée',
    icon: '♦',
    color: RED,             // #C8312A
    bg: 'rgba(200,49,42,0.08)',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 20 personnes · exclusif",
    acompte: 500,           // acompte en DH
    premium: true,          // badge PREMIUM affiché
  },
]
```

### Composant ZoneCard

```javascript
function ZoneCard({ zone, selected, onSelect }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  // ...
}
```

Chaque carte de zone affiche :
- **Carrousel de photos** : 3 photos Unsplash avec transition `opacity` entre elles. Des points de navigation permettent de changer la photo active.
- **Badge PREMIUM** (haut droite) pour la salle privée : fond rouge, texte blanc mono 7px
- **Checkmark** (haut gauche) quand sélectionné : cercle coloré avec check CSS
- **Barre de couleur** en bas de l'image (visible si sélectionné)
- Informations : icône + nom (mono uppercase) + capacité + acompte si applicable

Style de la carte sélectionnée :
```javascript
border: `1.5px solid ${zone.color}`,
background: zone.bg,
transform: 'translateY(-2px)',
boxShadow: `0 4px 16px ${zone.color}22`,
```

### Mapping zones vers types SQL

```javascript
// Dans reservations.py
zone_to_type = {"priv": "local_prive"}
type_resa = zone_to_type.get(data.zone or "", "standard")
// Les zones 'salle', 't1', 't2' → TypeReservationEnum.standard
// La zone 'priv' → TypeReservationEnum.local_prive
```

---

## 17. Sélecteur de date personnalisé

```javascript
function DatePicker({ value, onChange }) { ... }
```

Calendrier entièrement personnalisé, sans dépendance externe.

### Caractéristiques

- Navigation mois par mois avec boutons `‹` et `›`
- Semaine commence le **lundi** (offset calculé : `(rawFirst + 6) % 7`)
- Jours passés : désactivés (couleur grisée, curseur `not-allowed`)
- Aujourd'hui : fond `rgba(184,150,62,0.14)` (or doux) + point doré sous le chiffre
- Jour sélectionné : fond INK, texte CREAM, bordure INK
- Navigation limitée à l'année courante (pas de navigation future > 31 décembre)

```javascript
const MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAY_HEADS = ['L','M','M','J','V','S','D']  // Lundi en premier
```

La valeur retournée est au format ISO `"YYYY-MM-DD"`.

---

## 18. Composant Barcode SVG

```javascript
function Barcode({ width = 220, height = 32, opacity = 1 }) {
  const bars = []
  let x = 0
  const ws = [2,1,3,1,2,2,1,3,2,1,2,1,3,1,2,3,1,2,1,2,3,1,2,2,1,3,2,1,2,1,3,2,1,2,3,1,2,1,2,3,1,2,2,1,3]
  for (let i = 0; i < ws.length; i++) {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={ws[i] * (width / 80)} height={height} fill={INK} />)
    x += ws[i] * (width / 80)
  }
  return <svg width={width} height={height} style={{ opacity, display: 'block' }}>{bars}</svg>
}
```

Le barcode est un SVG généré en JavaScript avec des barres de largeurs variables (tableau `ws`). Les barres paires sont remplies en INK, les impaires sont des espaces. L'échelle est calculée proportionnellement à la largeur demandée.

Dans la LandingPage, le barcode est utilisé à opacité 0.18 pour un effet décoratif discret. Dans le ticket PDF, il est rendu en opacité pleine.

---

## 19. Composant Perforation (PerfoRow)

```javascript
function PerfoRow({ bg = 'rgba(0,0,0,0.15)', dotBg = PAPER }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', height: 12, background: bg }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg }} />
      <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.18)', margin: '0 3px' }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg }} />
      {/* ... */}
    </div>
  )
}
```

Simule la perforation physique des tickets de cinéma/restaurant. Utilisée en haut et en bas des boutons principaux pour renforcer l'identité visuelle de "ticket".

---

## 20. Intégration Stripe — salle privée

### Frontend

```javascript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
```

Le `stripePromise` est initialisé dynamiquement avec la clé publique renvoyée par le backend :

```javascript
const r2 = await creerPaiementReservation(r.data.id)
// POST /api/reservations/{id}/paiement-intent
// Réponse : { client_secret, stripe_publishable_key, montant }

setStripe(loadStripe(r2.data.stripe_publishable_key))
setClientSecret(r2.data.client_secret)
```

Cela permet d'utiliser la clé Stripe du backend sans la stocker dans le code frontend.

### Backend (reservations.py)

```python
# Création du PaymentIntent
intent = stripe.PaymentIntent.create(
    amount=montant,    # en centimes : 500 DH × 100 = 50000
    currency="eur",
    metadata={"reservation_id": str(resa_id), "nom_client": resa.nom_client},
    automatic_payment_methods={"enabled": True},
)
```

Note : la devise est `"eur"` (euros) car Stripe ne supporte pas le dirham marocain (MAD) nativement en test.

### Confirmation du paiement

```python
# POST /api/reservations/{id}/confirmer-paiement
intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)
if intent.status != "succeeded":
    raise HTTPException(400, ...)

resa.statut = StatutReservationEnum.confirmee
if not resa.code_acces:
    resa.code_acces = generer_code_acces(db)   # LOCAL-2026-XXXXXX
```

La salle privée payée par carte est automatiquement confirmée côté backend (sans intervention du gérant), et un code d'accès unique est immédiatement généré.

---

## 21. Téléchargement ticket PDF

La fonction `downloadTicketPDF()` génère un fichier HTML complet en mémoire (Blob) et l'ouvre dans un nouvel onglet avec `window.open()`. L'impression automatique est déclenchée après 900ms via `window.onload`.

### Structure du HTML généré

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>SKY07 - Réservation ${resaNum}</title>
  <!-- Google Fonts : DM Serif Display, Space Mono, Bebas Neue -->
  <style>
    /* Styles inline pour autonomie du fichier */
    /* @media print : taille A5, marges 8mm, pas de box-shadow */
  </style>
</head>
<body>
  <div class="tkt">
    <!-- Header avec logo SKY07 + tampon "EN ATTENTE" rotatif -->
    <!-- Perforation décorative (repeating-linear-gradient) -->
    <!-- Champs : N° réservation, Date, Heure, Couverts, Zone, Client -->
    <!-- Section acompte 500 DH (si salle privée) -->
    <!-- Code d'accès (si disponible) dans encadré rouge -->
    <!-- Séparateur pointillé -->
    <!-- Barcode SVG inline -->
    <!-- Numéro de série -->
  </div>
  <button onclick="window.print()">⬇ Imprimer / Enregistrer PDF</button>
  <script>
    window.onload = function() { setTimeout(function() { window.print() }, 900) }
  </script>
</body>
</html>
```

Le barcode SVG est regeneré inline pour le PDF (même algorithme que le composant React `Barcode`).

### Libération de l'URL mémoire

```javascript
const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
const url  = URL.createObjectURL(blob)
const win  = window.open(url, '_blank')
if (win) setTimeout(() => URL.revokeObjectURL(url), 8000)
```

L'URL est révoquée après 8 secondes pour libérer la mémoire.

---

## 22. QRLanding — page d'accueil QR code

**Fichier** : `frontend/src/pages/QRLanding.jsx`  
**Route** : `/commande` (publique)

Cette page s'affiche quand un client scanne le QR code imprimé sur une table du restaurant. Elle détecte automatiquement la table et propose les actions disponibles.

### Détection de la table

```javascript
const [params] = useSearchParams()
const tableId = params.get('table_id') || params.get('table')
// Accepte les deux paramètres pour compatibilité

useEffect(() => {
  if (!tableId) { setTimeout(() => setVisible(true), 50); return }
  getTableQR(tableId)
    // GET /api/qr/table/{tableId}
    .then(r => setTable(r.data.table))
    .catch(() => {})
    .finally(() => setTimeout(() => setVisible(true), 50))
}, [tableId])
```

Si `tableId` est absent ou invalide, la page s'affiche quand même sans badge de table.

### Animation d'apparition

La page entière commence à `opacity: 0` et passe à `opacity: 1` via une transition CSS (`transition: 'opacity 0.5s ease'`) après 50ms de délai (pour éviter un flash blanc).

### Éléments visuels

**Glow blob** : cercle de 480px avec dégradé radial orange semi-transparent, centré en haut de page, décalé vers le haut (-80px), effet "halo" de marque.

**Ornement** : ligne décorative avec 3 points circulaires, inspiré de l'artisanat marocain.

**Logo SKY07** :
```javascript
fontSize: 'clamp(56px,14vw,80px)'
fontWeight: 800
color: ACCENT  // #e8824a
textShadow: '0 0 40px rgba(232,130,74,0.45)'  // mode sombre
```

**Badge de table** (si table détectée) :
```javascript
// Ex: "Table 7 · Terrasse" (traduit selon la langue active)
<MapPin size={13} color={ACCENT} />
<span>{tableLabel}</span>
```

### Boutons d'action

1. **"Voir le menu & Commander"** — Bouton primaire orange, hauteur 58px, border-radius 16, ombre portée, icône `UtensilsCrossed`
   ```javascript
   onClick={() => navigate(`/commande/menu?table=${tableId}`)}
   ```

2. **"Mon espace fidélité"** — Bouton transparent avec bordure orange, `href="/client/login"`, icône `Star`

3. **Séparateur "ou"**

4. **Instagram** `@sky07restaurant` — Lien externe `https://www.instagram.com/sky07restaurant`, icône `Camera`

5. **WhatsApp** — Lien `https://wa.me/212530450523`, fond vert `#25D366`, ombre verte, icône `MessageCircle`

---

## 23. Internationalisation (i18n) dans QRLanding

Le composant QRLanding est le seul à implémenter une i18n complète, en 3 langues :

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
  en: {
    tagline: 'Moroccan Restaurant & Lounge',
    bienvenue: 'Welcome',
    commander: 'View Menu & Order',
    fidelite: 'My Loyalty Space',
    ou: 'or',
    whatsapp: 'Contact on WhatsApp',
    footer: '© 2026 SKY07 — All rights reserved',
    table: (n, e) => `Table ${n} · ${e}`,
    dir: 'ltr',
    emplacements: { interieur: 'Indoor', terrasse: 'Terrace', mezzanine: 'Mezzanine' },
  },
  ar: {
    tagline: 'مطعم وصالون مغربي',
    bienvenue: 'أهلاً وسهلاً',
    commander: 'عرض القائمة والطلب',
    fidelite: 'برنامج الولاء',
    ou: 'أو',
    whatsapp: 'تواصل عبر واتساب',
    footer: '© 2026 SKY07 — جميع الحقوق محفوظة',
    table: (n, e) => `طاولة ${n} · ${e}`,
    dir: 'rtl',   // IMPORTANT : direction droite-à-gauche
    emplacements: { interieur: 'داخلي', terrasse: 'تراس', mezzanine: 'ميزانين' },
  },
}
```

### Sélecteur de langue

Persisté dans `localStorage` :
```javascript
const [lang, setLang] = useState(() => localStorage.getItem('sky07_lang') || 'fr')
// Changement :
onClick={() => { setLang(l); localStorage.setItem('sky07_lang', l) }}
```

### Mode RTL pour l'arabe

```javascript
<div dir={t.dir} ...>
  {/* dir="rtl" pour l'arabe — affecte toute la mise en page */}
```

La police change également en mode arabe :
```javascript
fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : "'Playfair Display', serif"
```

### Mode clair / sombre

Bouton toggle dans le coin supérieur gauche (ou droit en RTL) :
```javascript
const [dark, setDark] = useState(true)   // sombre par défaut

const BG     = dark ? '#0a1408'            : '#faf7f2'
const TEXT   = dark ? 'rgba(245,240,232,0.9)'  : '#1a1208'
const MUTED  = dark ? 'rgba(245,240,232,0.35)' : 'rgba(26,18,8,0.45)'
const MUTED2 = dark ? 'rgba(245,240,232,0.12)' : 'rgba(26,18,8,0.1)'
const BORDER = dark ? 'rgba(232,130,74,0.25)'  : 'rgba(232,130,74,0.35)'
```

L'icône bascule entre `<Sun size={13} />` (mode sombre → clair) et `<Moon size={13} />` (mode clair → sombre).

---

## 24. Route /commande/menu — CommandeQR

**Route** : `/commande/menu?table={tableId}`  
**Composant** : `frontend/src/pages/CommandeQR.jsx`

Cette page n'a pas été lue en détail dans ce document mais est accessible depuis `QRLanding`. Elle utilise :
- `getTableQR(tableId)` pour récupérer les infos de la table
- `creerCommandeQR(data)` pour créer une commande QR
- `createPaymentIntent(commandeId)` et `confirmerPaiement(commandeId, data)` pour le paiement
- `payerEspeces(commandeId)` pour le paiement en espèces

Les API QR sont toutes publiques (sans JWT) pour permettre la commande depuis la table sans inscription.

---

## 25. API publiques utilisées (sans authentification)

Ces routes backend ne requièrent aucun token JWT et sont accessibles directement par les pages publiques :

| Méthode | URL | Usage |
|---|---|---|
| `GET` | `/api/plats/` | Menu public (plats validés et disponibles) |
| `GET` | `/api/plats/categories` | Menu groupé par catégorie + nutrition |
| `GET` | `/api/nutrition/{platId}` | Données nutritionnelles d'un plat |
| `POST` | `/api/reservations/` | Créer une réservation |
| `POST` | `/api/reservations/{id}/paiement-intent` | Créer un PaymentIntent Stripe |
| `POST` | `/api/reservations/{id}/confirmer-paiement` | Confirmer le paiement Stripe |
| `GET` | `/api/avis-clients/` | Liste des avis publics validés |
| `POST` | `/api/avis-clients/` | Déposer un avis |
| `GET` | `/api/qr/table/{tableId}` | Infos d'une table par QR code |
| `POST` | `/api/qr/commande` | Créer une commande depuis QR code |
| `POST` | `/api/qr/create-payment-intent/{commandeId}` | Paiement commande QR |
| `POST` | `/api/qr/confirmer-paiement/{commandeId}` | Confirmer paiement commande QR |
| `POST` | `/api/qr/paiement-especes/{commandeId}` | Paiement espèces commande QR |
| `GET` | `/api/qr/commande/{commandeId}` | Statut d'une commande QR |
| `GET` | `/api/tables/` | Liste des tables (public) |
| `GET` | `/api/landing/` | Données dynamiques de la landing (SaaS) |
| `GET` | `/api/setup/status` | Statut de configuration initiale |
| `POST` | `/api/setup/` | Configuration initiale (SaaS) |

---

## 26. Routes backend — Plats

**Fichier** : `backend/app/api/routes/plats.py`  
**Préfixe** : `/api/plats`

### GET /api/plats/ — menu public

```python
@router.get("/")
def get_menu_public(db: Session = Depends(get_db)):
    plats = db.query(Plat).filter(
        Plat.statut == StatutPlatEnum.valide,
        Plat.disponible == True
    ).all()
    return plats
```

Filtre : uniquement `statut = "valide"` ET `disponible = True`. Pas d'authentification.

### GET /api/plats/categories — menu par catégorie

```python
@router.get("/categories")
def get_menu_par_categorie(db: Session = Depends(get_db)):
    categories = db.query(Categorie).order_by(Categorie.ordre).all()
    result = []
    for cat in categories:
        plats = db.query(Plat).filter(
            Plat.categorie_id == cat.id,
            Plat.statut == StatutPlatEnum.valide,
            Plat.disponible == True,
        ).all()
        plats_data = []
        for p in plats:
            n = db.query(NutritionFact).filter(NutritionFact.plat_id == p.id).first()
            plats_data.append({
                "id": p.id, "nom": p.nom, "description": p.description,
                "prix": p.prix, "image": p.image, "disponible": p.disponible,
                "vegetarien": bool(p.vegetarien), "sans_gluten": bool(p.sans_gluten),
                "allergenes": p.allergenes or "",
                "nutrition": { ... } if n else None,
            })
        result.append({"id": cat.id, "nom": cat.nom, "plats": plats_data})
    return result
```

Les catégories sont triées par la colonne `ordre`. Les données nutritionnelles sont incluses si disponibles (sinon `null`).

### Calcul automatique des valeurs nutritionnelles

La fonction privée `_auto_nutrition(plat_id, db)` est appelée lors de la création d'un plat (route admin) :

```python
def _auto_nutrition(plat_id, db):
    liaisons = db.query(PlatIngredient).filter(PlatIngredient.plat_id == plat_id).all()
    for l in liaisons:
        ing = db.query(Ingredient).filter(Ingredient.id == l.ingredient_id).first()
        if ing and ing.calories_par_100g is not None:
            ratio = l.quantite / 100.0
            cal  += (ing.calories_par_100g  or 0) * ratio
            prot += (ing.proteines_par_100g or 0) * ratio
            # etc.
    # Sauvegarde dans NutritionFact
```

Le calcul est basé sur le ratio : `quantite_ingredient / 100g × valeur_par_100g`.

### Routes admin (authentification requise)

| Route | Rôle | Action |
|---|---|---|
| `GET /admin/tous` | gerant | Tous les plats (tous statuts) |
| `GET /admin/propositions` | gerant | Propositions en attente |
| `POST /admin/creer` | gerant | Créer un plat (statut=valide direct) |
| `DELETE /admin/tout` | gerant | Supprimer tous les plats |
| `PUT /admin/{id}/valider` | gerant | Valider ou refuser une proposition |
| `PUT /admin/{id}` | gerant | Modifier un plat existant |
| `DELETE /admin/{id}` | gerant | Supprimer un plat |
| `POST /proposer` | cuisinier | Proposer un nouveau plat (statut=en_attente) |
| `GET /mes-propositions` | cuisinier | Voir ses propres propositions |
| `POST /{id}/image` | tout employé | Uploader une image |

### Upload d'image

```python
UPLOAD_DIR = "uploads/plats"

@router.post("/{plat_id}/image")
async def upload_image(plat_id, file: UploadFile, db, _=Depends(get_current_user)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{UPLOAD_DIR}/{filename}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    plat.image = path   # chemin relatif ex: "uploads/plats/uuid.jpg"
    db.commit()
    return {"image_url": path}
```

L'image est stockée dans `backend/uploads/plats/` et servie statiquement. Le frontend préfixe avec `http://localhost:8000` pour construire l'URL complète.

---

## 27. Routes backend — Réservations

**Fichier** : `backend/app/api/routes/reservations.py`  
**Préfixe** : `/api/reservations`

### Schéma de création (Pydantic)

```python
class ReservationCreate(BaseModel):
    nom_complet: Optional[str] = None      # frontend ReservationClient.jsx
    nom_client:  Optional[str] = None      # compat backend direct
    telephone: str                          # REQUIS
    date: Optional[str] = None             # "2026-05-10"
    heure: Optional[str] = None            # "19:00"
    date_heure: Optional[datetime] = None  # compat ISO datetime
    nb_personnes: int                       # REQUIS
    zone: Optional[str] = None             # "salle" | "t1" | "t2" | "priv"
    table_id: Optional[int] = None
    message: Optional[str] = None
    mode_paiement: Optional[str] = None    # "carte" | "especes"
    mode_paiement_local: Optional[str] = None
    montant_acompte: Optional[float] = None
```

### POST /api/reservations/ — logique complète

```python
# Normalisation nom
nom = data.nom_complet or data.nom_client or "Client"

# Normalisation date_heure
if data.date and data.heure:
    dh = datetime.strptime(f"{data.date} {data.heure}", "%Y-%m-%d %H:%M")

# Normalisation type depuis zone
zone_to_type = {"priv": "local_prive"}
type_resa = zone_to_type.get(data.zone or "", "standard")

# Cas spécial : salle privée + paiement en ligne
if type_resa == "local_prive" and mode_paiement == "en_ligne":
    resa.code_acces = generer_code_acces(db)   # LOCAL-2026-XXXXXX (garanti unique)
    resa.statut = StatutReservationEnum.confirmee  # auto-confirmée
```

### Génération du code d'accès

```python
def generer_code_acces(db):
    year = datetime.now().year
    for _ in range(20):  # jusqu'à 20 tentatives pour garantir unicité
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"LOCAL-{year}-{suffix}"  # ex: LOCAL-2026-A3F7X2
        if not db.query(Reservation).filter(Reservation.code_acces == code).first():
            return code
    return f"LOCAL-{year}-{uuid.uuid4().hex[:8].upper()}"  # fallback ultra-unique
```

### Logique de confirmation manuelle (gérant)

```python
@router.put("/{resa_id}/confirmer")
def confirmer(resa_id, db, _=Depends(require_role("gerant"))):
    resa.statut = StatutReservationEnum.confirmee
    # Si salle privée avec paiement sur place → générer le code maintenant
    if resa.type == TypeReservationEnum.local_prive and not resa.code_acces:
        resa.code_acces = generer_code_acces(db)
    db.commit()
    return {"message": "...", "code_acces": resa.code_acces}
```

### Vérification du code (gérant à l'entrée)

```python
@router.get("/verifier-code/{code}")
def verifier_code_acces(code, db, _=Depends(require_role("gerant"))):
    resa = db.query(Reservation).filter(
        Reservation.code_acces == code,
        Reservation.statut == StatutReservationEnum.confirmee
    ).first()
    if not resa:
        raise HTTPException(404, "Code invalide ou réservation non confirmée")
    return {"valide": True, "client": resa.nom_client, "date": resa.date_heure, "nb_personnes": resa.nb_personnes}
```

---

## 28. Routes backend — Avis Clients

Les routes avis clients sont déclarées dans un router séparé (`/api/avis-clients`).

```javascript
// api.js
export const getAvisPublics   = () => api.get('/api/avis-clients/')          // public
export const deposerAvis      = (data) => api.post('/api/avis-clients/', data) // public
export const getAvisAdmin     = () => api.get('/api/avis-clients/admin')      // gérant
export const validerAvisClient = (id) => api.put(`/api/avis-clients/${id}/valider`)  // gérant
export const rejeterAvisClient = (id) => api.put(`/api/avis-clients/${id}/rejeter`)  // gérant
```

Le modèle `AvisClient` stocke :
- `nom` : nom du client
- `note` : 1 à 5
- `commentaire` : texte libre
- `statut` : `en_attente | valide | rejete`
- `sentiment` : `positif | neutre | negatif` (calculé par IA HuggingFace lors de la validation)
- `date_depot` : horodatage automatique

L'endpoint public `GET /api/avis-clients/` ne retourne que les avis avec `statut = "valide"`.

---

## 29. Routes backend — QR Commande

```javascript
// api.js — routes publiques QR
export const getTableQR          = (tableId)    => api.get(`/api/qr/table/${tableId}`)
export const creerCommandeQR     = (data)        => api.post('/api/qr/commande', data)
export const createPaymentIntent = (commandeId)  => api.post(`/api/qr/create-payment-intent/${commandeId}`)
export const confirmerPaiement   = (commandeId, data) => api.post(`/api/qr/confirmer-paiement/${commandeId}`, data)
export const payerEspeces        = (commandeId)  => api.post(`/api/qr/paiement-especes/${commandeId}`)
export const statutCommandeQR    = (commandeId)  => api.get(`/api/qr/commande/${commandeId}`)
```

Ces routes sont déclarées dans `backend/app/api/routes/qr_commande.py` et ont `origine = OrigineCommandeEnum.qr_table` pour distinguer les commandes QR des commandes serveur.

La commande QR permet au client de :
1. Voir le menu et choisir ses plats
2. Créer une commande liée à sa table
3. Payer en ligne (Stripe) ou en espèces
4. Suivre l'état de sa commande en temps réel

---

## 30. Modèles de données SQLAlchemy

**Fichier** : `backend/app/models/models.py`

### 30.1 Plat

```python
class Plat(Base):
    __tablename__ = "plats"

    id           = Column(Integer, primary_key=True)
    nom          = Column(String(200), nullable=False)
    description  = Column(Text)
    prix         = Column(Float, nullable=False)
    image        = Column(String(500))              # chemin relatif ou URL
    disponible   = Column(Boolean, default=True)
    statut       = Column(Enum(StatutPlatEnum), default=StatutPlatEnum.valide)
    propose_par_id = Column(Integer, ForeignKey("employes.id"), nullable=True)
    motif_refus  = Column(Text, nullable=True)

    # Filtres nutritionnels
    vegetarien   = Column(Boolean, default=False)
    sans_gluten  = Column(Boolean, default=False)
    allergenes   = Column(String(300), nullable=True)  # ex: "gluten,lactose,noix"

    categorie_id = Column(Integer, ForeignKey("categories.id"))

    # Relations
    categorie    = relationship("Categorie", back_populates="plats")
    propose_par  = relationship("Employe", back_populates="plats_proposes")
    ingredients  = relationship("PlatIngredient", back_populates="plat")
    lignes       = relationship("LigneCommande", back_populates="plat")
    nutrition    = relationship("NutritionFact", back_populates="plat", uselist=False)
```

### 30.2 Categorie

```python
class Categorie(Base):
    __tablename__ = "categories"

    id    = Column(Integer, primary_key=True)
    nom   = Column(String(100), nullable=False)
    ordre = Column(Integer, default=0)       # tri des onglets dans le menu

    plats = relationship("Plat", back_populates="categorie")
```

### 30.3 NutritionFact

```python
class NutritionFact(Base):
    __tablename__ = "nutrition_facts"

    id             = Column(Integer, primary_key=True)
    plat_id        = Column(Integer, ForeignKey("plats.id"), unique=True)
    taille_portion = Column(Float, default=100)   # en grammes
    calories       = Column(Float, default=0)
    proteines      = Column(Float, default=0)
    glucides       = Column(Float, default=0)
    lipides        = Column(Float, default=0)
    fibres         = Column(Float, default=0)
    sucre          = Column(Float, default=0)
    sodium         = Column(Float, default=0)
    calcul_auto    = Column(Boolean, default=False)  # True = calculé depuis ingrédients

    plat = relationship("Plat", back_populates="nutrition")
```

### 30.4 Reservation

```python
class Reservation(Base):
    __tablename__ = "reservations"

    id               = Column(Integer, primary_key=True)
    nom_client       = Column(String(100), nullable=False)
    telephone        = Column(String(20), nullable=False)
    date_heure       = Column(DateTime, nullable=False)
    nb_personnes     = Column(Integer, nullable=False)
    statut           = Column(Enum(StatutReservationEnum), default=StatutReservationEnum.en_attente)
    type             = Column(Enum(TypeReservationEnum), default=TypeReservationEnum.standard)
    code_acces       = Column(String(20), nullable=True)        # LOCAL-2026-XXXXXX
    montant_acompte  = Column(Float, nullable=True)             # 500.0 pour salle privée
    mode_paiement_local = Column(Enum(ModePaiementEnum), nullable=True)

    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    table    = relationship("Table", back_populates="reservations")
```

Note : les colonnes `zone` et `message` sont stockées dynamiquement avec `try/except` pour compatibilité de migration.

### 30.5 AvisClient

```python
class AvisClient(Base):
    __tablename__ = "avis_clients"

    id          = Column(Integer, primary_key=True)
    nom         = Column(String(100), nullable=False)
    note        = Column(Integer, nullable=False)     # 1 à 5
    commentaire = Column(Text, default="")
    statut      = Column(Enum(StatutAvisEnum), default=StatutAvisEnum.en_attente)
    sentiment   = Column(Enum(SentimentEnum), nullable=True)   # calculé par IA
    date_depot  = Column(DateTime, server_default=func.now())

    restaurant_id = Column(Integer, ForeignKey("restaurant_info.id"))
    restaurant    = relationship("RestaurantInfo", back_populates="avis_clients")
```

### 30.6 Table

```python
class Table(Base):
    __tablename__ = "tables"

    id          = Column(Integer, primary_key=True)
    numero      = Column(Integer, unique=True, nullable=False)
    capacite    = Column(Integer, nullable=False)
    emplacement = Column(Enum(EmplacementEnum), default=EmplacementEnum.interieur)
    statut      = Column(Enum(StatutTableEnum), default=StatutTableEnum.libre)
    qr_code_url = Column(String(500))    # base64 ou URL de l'image QR

    commandes    = relationship("Commande", back_populates="table")
    reservations = relationship("Reservation", back_populates="table")
```

---

## 31. Enums pertinents

Tous définis dans `backend/app/models/models.py` :

```python
class TypeReservationEnum(str, enum.Enum):
    standard    = "standard"      # réservation normale
    local_prive = "local_prive"   # salle privée avec acompte

class StatutReservationEnum(str, enum.Enum):
    en_attente = "en_attente"  # créée, attend confirmation gérant
    confirmee  = "confirmee"   # confirmée (manuelle ou auto via Stripe)
    annulee    = "annulee"     # annulée par le gérant

class StatutPlatEnum(str, enum.Enum):
    valide     = "valide"      # visible dans le menu public
    en_attente = "en_attente"  # proposition cuisinier non encore validée
    refuse     = "refuse"      # proposition refusée par le gérant

class EmplacementEnum(str, enum.Enum):
    interieur = "interieur"
    terrasse  = "terrasse"
    mezzanine = "mezzanine"

class StatutAvisEnum(str, enum.Enum):
    en_attente = "en_attente"  # soumis, en attente de modération
    valide     = "valide"      # approuvé et visible publiquement
    rejete     = "rejete"      # rejeté par le gérant

class SentimentEnum(str, enum.Enum):
    positif = "positif"
    neutre  = "neutre"
    negatif = "negatif"

class ModePaiementEnum(str, enum.Enum):
    especes   = "especes"
    carte     = "carte"
    google_pay = "google_pay"
    apple_pay  = "apple_pay"
    en_ligne   = "en_ligne"   # Stripe

class OrigineCommandeEnum(str, enum.Enum):
    serveur  = "serveur"    # commande créée par un serveur
    qr_table = "qr_table"  # commande créée via QR code de table
```

---

## 32. Routing React (App.jsx)

**Fichier** : `frontend/src/App.jsx`

```javascript
function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/"              element={<LandingPage />} />
          <Route path="/setup"         element={<SetupPage />} />
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/commande"      element={<QRLanding />} />
          <Route path="/commande/menu" element={<CommandeQR />} />
          <Route path="/reservation"   element={<ReservationClient />} />  {/* publique */}

          {/* Client fidélité */}
          <Route path="/client"        element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/login"  element={<ClientLogin />} />
          <Route path="/client" element={
            <ProtectedRoute roles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard"    element={<ClientDashboard />} />
            <Route path="roue"         element={<SpinWheel />} />
            <Route path="verification" element={<PhoneVerification />} />
            <Route path="parrainage"   element={<ParrainagePage />} />
            <Route path="reservation"  element={<ReservationClient />} />  {/* aussi dans espace client */}
            <Route path="avis-google"  element={<GoogleAvisPage />} />
          </Route>

          {/* Routes protégées : gérant, serveur, cuisinier */}
          {/* ... */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

**Points importants** :
- `/reservation` est une route **publique** accessible directement par URL
- La même page `ReservationClient` est montée deux fois : publiquement sur `/reservation` et dans l'espace client sur `/client/reservation`
- Le paramètre `future` active les fonctionnalités React Router v7 futures (transitions, chemins relatifs)
- Le catch-all `path="*"` redirige vers la landing page

---

## 33. Intercepteur Axios — api.js

```javascript
const api = axios.create({
  baseURL: '',      // URL relative — même hôte que le frontend (Vite proxy)
  timeout: 30000,   // 30 secondes
})

// Intercepteur de requête : ajout du JWT
api.interceptors.request.use((config) => {
  const token = _storageGet('token')  // localStorage via utilitaire storage.js
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Intercepteur de réponse : gestion du 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const raw  = _storageGet('user')
      const user = raw ? JSON.parse(raw) : {}
      const isClient = user.role === 'client' || window.location.pathname.startsWith('/client')

      _storageRemove('token')
      _storageRemove('user')

      // Redirection selon le type d'utilisateur
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

Les API publiques (menu, réservations, avis, QR) fonctionnent sans token. L'intercepteur ajoute le Bearer token uniquement si présent, sans bloquer les appels anonymes.

---

## 34. Fonctions API publiques exportées

Extrait des fonctions utilisées par les pages publiques :

```javascript
// Menu et plats (public)
export const getMenu          = ()        => api.get('/api/plats/categories')
export const getNutrition     = (platId)  => api.get(`/api/nutrition/${platId}`)

// Réservations (public)
export const creerReservation          = (data) => api.post('/api/reservations/', data)
export const creerPaiementReservation  = (id)   => api.post(`/api/reservations/${id}/paiement-intent`)
export const confirmerPaiementReservation = (id, data) => api.post(`/api/reservations/${id}/confirmer-paiement`, data)

// Avis clients (public)
export const getAvisPublics = () => api.get('/api/avis-clients/')
export const deposerAvis    = (data) => api.post('/api/avis-clients/', data)

// QR Commande (public)
export const getTableQR          = (tableId)    => api.get(`/api/qr/table/${tableId}`)
export const creerCommandeQR     = (data)        => api.post('/api/qr/commande', data)
export const createPaymentIntent = (commandeId)  => api.post(`/api/qr/create-payment-intent/${commandeId}`)
export const confirmerPaiement   = (commandeId, data) => api.post(`/api/qr/confirmer-paiement/${commandeId}`, data)
export const payerEspeces        = (commandeId)  => api.post(`/api/qr/paiement-especes/${commandeId}`)
export const statutCommandeQR    = (commandeId)  => api.get(`/api/qr/commande/${commandeId}`)

// Tables (public)
export const getTables = () => api.get('/api/tables/')

// Landing SaaS (public)
export const getLanding = () => api.get('/api/landing/')

// Setup SaaS (public, première installation uniquement)
export const getSetupStatus  = () => api.get('/api/setup/status')
export const setupRestaurant = (data) => api.post('/api/setup/', data)

// Fidélité — inscription publique
export const clientRegister = (data) => api.post('/api/client/register', data)
export const clientLogin    = (data) => api.post('/api/client/login', data)
```

---

## 35. Composants partagés utilisés

### NutritionModal

**Import** : `import NutritionModal from '../components/shared/NutritionModal'`

Utilisé dans la LandingPage vue menu. Reçoit les props `plat` (avec `plat.nutrition`) et `onClose`.

### ClientLayout

**Import** : `import ClientLayout from './components/shared/ClientLayout'`

Layout parent pour toutes les routes `/client/*` protégées. Enveloppe les pages client dans une mise en page commune.

### ProtectedRoute

Composant de garde de route. Accepte un tableau `roles`. Si l'utilisateur n'est pas connecté ou n'a pas le bon rôle, redirige vers la page de login appropriée.

### Layout

Layout principal pour gérant, serveur et cuisinier. Accepte `role` en prop pour personnaliser la navigation.

---

## 36. Animations et transitions CSS

### LandingPage

```css
/* Spin loader nutrition */
@keyframes spin { to { transform: rotate(360deg); } }

/* Transition header */
transition: background 200ms ease

/* Hover carte de plat */
transition: transform 200ms, border-color 200ms
/* translateY(-3px) + borderColor cedar au hover */

/* Hover image de plat */
transition: transform 300ms
/* scale(1.04) au hover */

/* Transitions nav buttons */
transition: color 200ms
```

### ReservationClient

```css
/* Animation d'entrée des écrans */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.resa-slide { animation: slideUp 0.4s cubic-bezier(0.34,1.1,0.64,1) both; }

/* Animation du ticket physique */
@keyframes ticketIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.resa-ticket { animation: ticketIn 0.45s cubic-bezier(0.34,1.1,0.64,1) both; }

/* Fondu simple */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.resa-fade { animation: fadeIn 0.35s ease both; }
```

La constante `cubic-bezier(0.34,1.1,0.64,1)` est un ease-out légèrement rebondissant (spring effect).

### QRLanding

```css
/* Apparition de la page */
opacity: visible ? 1 : 0
transition: 'opacity 0.5s ease, background 0.3s ease'
```

Le mode clair/sombre bascule avec une transition de `background` sur 300ms.

---

## 37. Choix de conception et UX

### Identité SKY07

- Le nom du restaurant est **SKY07** (visible dans le code comme branding), pas "MangerManger" qui est le nom du système de gestion
- Police **Bebas Neue** pour le logo (condensée, impact maximal)
- Police **Cormorant Garamond** pour les titres (élégance, raffinement)
- Palette sombre (fond `#0E0E0E`) pour une ambiance haut de gamme nocturne
- Couleur d'accent **cedar** (#A0714F) : brun-doré associé au bois et au cuir, évoque la chaleur et le luxe accessible

### Design "ticket de restaurant"

La page `ReservationClient.jsx` est conçue comme un ticket physique :
- Perforations circulaires latérales (9 trous de chaque côté)
- Tampon circulaire rotatif "EN ATTENTE" (rappelle les tampons humides)
- Police Space Mono pour les données (codes, références)
- Police Bebas Neue pour les grands affichages numériques
- Barcode SVG fonctionnel (décoratif, pas scannable)
- Ligne de découpe `✂` avec trait pointillé
- Hachures diagonales décoratives sur les boutons rouges

### Navigation sans rechargement

La LandingPage n'utilise pas de routes pour basculer entre home et menu. Le changement de vue est géré en React state, ce qui :
- Préserve le défilement et les états locaux
- Évite un rechargement des données API
- Permet des transitions instantanées

### Responsive

- Header fixe avec `backdropFilter: blur(12px)` pour rester lisible sur tous les contenus
- Tailles de police fluides : `clamp(52px,8vw,90px)` pour le H1 hero
- La grille de plats en `repeat(3, 1fr)` n'est pas responsive (manque de media queries)
- La grille de zones en `repeat(2, 1fr)` a une media query pour petits écrans

### Gestion des images

Double stratégie : image réelle du backend en priorité, fallback Unsplash par mots-clés sémantiques. L'`onError` sur les `<img>` remplace les images cassées par l'image générique de plat.

---

## 38. Flux de données complet — résumé

### Flux 1 : Visite de la landing page

```
Navigateur → GET / → React Router → LandingPage.jsx
  └─ useEffect → GET /api/plats/categories → categories[] → useState
  └─ useEffect → GET /api/avis-clients/ → avis[] → useState
  └─ Rendu : Hero + Stats + About + Resa CTA + Avis + Footer
```

### Flux 2 : Consultation du menu

```
Clic "Voir le menu" → setView('menu')
  └─ Rendu : vue menu avec onglets de catégories
  └─ Clic onglet → setActiveTab(cat.id) → filtrage plats
  └─ Clic carte → ouvrirNutrition(plat)
       ├─ Si plat.nutrition présent (inclus dans /categories) → ouvre directement
       └─ Sinon → GET /api/nutrition/{platId} → NutritionModal ou message 404
```

### Flux 3 : Réservation standard

```
Clic "Réserver une table" → navigate('/reservation') → ReservationClient
  └─ Écran 0 : accueil ticket → Clic → Écran 1
  └─ Écran 1 : remplir couverts / date / zone / contact → Suivant → Écran 2
  └─ Écran 2 : afficher ticket synthèse → Confirmer →
       POST /api/reservations/ {nom, tel, date, heure, couverts, zone="salle|t1|t2"}
       └─ Réponse : { id, message, code_acces: null }
       └─ goTo(4) → Écran succès
```

### Flux 4 : Réservation salle privée avec paiement en ligne

```
Sélection zone "priv" → Écran 2 → Choix "Carte bancaire" → Confirmer →
  POST /api/reservations/ { ..., zone="priv", mode_paiement="carte", montant_acompte=500 }
  └─ Réponse : { id: 42, code_acces: null } (statut en_attente)
  └─ POST /api/reservations/42/paiement-intent
       └─ Réponse : { client_secret, stripe_publishable_key, montant: 500 }
       └─ loadStripe(key) → setStripe / setClientSecret → goTo(3)
  └─ Écran 3 : formulaire Stripe → confirmCardPayment(clientSecret)
       └─ Succès → POST /api/reservations/42/confirmer-paiement { payment_intent_id }
                → Réponse : { code_acces: "LOCAL-2026-A3F7X2" }
                → handleStripeSuccess(code) → goTo(4)
  └─ Écran 4 : afficher code d'accès + bouton PDF
```

### Flux 5 : Scan QR code de table

```
Client scanne QR → URL /commande?table_id=7 → QRLanding
  └─ GET /api/qr/table/7 → { table: { numero: 7, emplacement: "terrasse" } }
  └─ Afficher badge "Table 7 · Terrasse"
  └─ Clic "Voir le menu & Commander" → navigate('/commande/menu?table=7') → CommandeQR
```

### Flux 6 : Dépôt d'avis

```
Formulaire LandingPage → POST /api/avis-clients/ { nom, note, commentaire }
  └─ Backend créé AvisClient avec statut="en_attente"
  └─ Gérant valide depuis GerantAvis → PUT /api/avis-clients/{id}/valider
       └─ Analyse sentiment IA HuggingFace → sentiment mis à jour
       └─ statut → "valide"
  └─ Prochain chargement de la landing → GET /api/avis-clients/ → avis visible
```

---

*Document généré le 2026-06-21. Couvre l'intégralité des fichiers publics du projet MangerManger / SKY07.*
