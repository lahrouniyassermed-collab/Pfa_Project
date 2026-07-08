# Flow Gérant — Documentation exhaustive MangerManger

> Rédigé à partir du code source réel. Couvre toutes les pages, routes API, modèles de données et logiques métier du rôle **gérant**.

---

## Table des matières

1. [Vue d'ensemble du rôle gérant](#1-vue-densemble-du-rôle-gérant)
2. [Routeur React (App.jsx)](#2-routeur-react-appjsx)
3. [Authentification & sécurité](#3-authentification--sécurité)
4. [Page : Tableau de bord (GerantDashboard)](#4-page--tableau-de-bord-gerantdashboard)
5. [Page : Menu & Plats (GerantMenu)](#5-page--menu--plats-gerantmenu)
6. [Page : Stocks & Ingrédients (GerantIngredients)](#6-page--stocks--ingrédients-gerantingredients)
7. [Page : Tables (GerantTables)](#7-page--tables-geranttables)
8. [Page : Réservations (GerantReservations)](#8-page--réservations-gerantreservations)
9. [Page : Personnel (GerantPersonnel)](#9-page--personnel-gerantpersonnel)
10. [Page : Tombola & Fidélité (GerantTombola)](#10-page--tombola--fidélité-geranttombola)
11. [Page : Revenus (GerantRevenues)](#11-page--revenus-gerantrevenues)
12. [Page : Spins anti-fraude (GerantSpins)](#12-page--spins-anti-fraude-gerantspins)
13. [Page : Avis clients (GerantAvis)](#13-page--avis-clients-gerantavis)
14. [Page : Paramètres (GerantSettings)](#14-page--paramètres-gerantsettings)
15. [Fidélité gérant (gerant_fidelite.py)](#15-fidélité-gérant-gerant_fidelitepy)
16. [Table complète des routes API](#16-table-complète-des-routes-api)
17. [Modèles de données SQLAlchemy](#17-modèles-de-données-sqlalchemy)
18. [Tous les Enums](#18-tous-les-enums)
19. [Couche service API (api.js)](#19-couche-service-api-apijs)
20. [Conventions et patterns récurrents](#20-conventions-et-patterns-récurrents)

---

## 1. Vue d'ensemble du rôle gérant

Le gérant est le super-administrateur du système. Il a accès à la totalité des fonctionnalités :

- Gestion du menu (CRUD plats, validation propositions cuisiniers)
- Gestion des stocks et ingrédients avec valeurs nutritionnelles automatiques
- Supervision des tables en temps réel
- Gestion des réservations (standard + salle privée + paiement Stripe)
- Gestion du personnel (créer, activer/désactiver, réinitialiser mot de passe)
- Tombola publique avec IA (GPT-4o vision + HuggingFace sentiment)
- Statistiques de revenus avec graphiques Recharts
- Historique anti-fraude des spins de la roue de la fortune
- Modération des avis clients
- Paramètres du restaurant (informations, salles privées, recrutement, sécurité OTP)
- Configuration du programme de fidélité (points, coût spin, bonus)

**Route de base** : `/gerant` (protégée par `ProtectedRoute roles={['gerant']}`)

Toutes les routes backend gérant utilisent `require_role("gerant")` qui vérifie que le token JWT appartient bien à un employé avec `role = "gerant"`.

---

## 2. Routeur React (App.jsx)

Le fichier `frontend/src/App.jsx` définit la structure de navigation. Le bloc gérant :

```
/gerant                  → GerantDashboard   (index)
/gerant/menu             → GerantMenu
/gerant/stocks           → GerantIngredients
/gerant/tables           → GerantTables
/gerant/reservations     → GerantReservations
/gerant/personnel        → GerantPersonnel
/gerant/tombola          → GerantTombola
/gerant/settings         → GerantSettings
/gerant/revenues         → GerantRevenues
/gerant/spins            → GerantSpins
```

Toutes ces routes sont enveloppées par `ProtectedRoute roles={['gerant']}` puis `Layout role="gerant"`.

Le gérant a également accès aux routes serveur (`/serveur`) — `ProtectedRoute roles={['serveur', 'gerant']}`.

Routes publiques sans auth : `/`, `/setup`, `/login`, `/commande`, `/commande/menu`, `/reservation`.

---

## 3. Authentification & sécurité

### Backend — security.py

```python
hash_password(password: str) -> str          # bcrypt via passlib, encode UTF-8 d'abord
verify_password(plain: str, hashed: str) -> bool
create_access_token(data: dict) -> str       # JWT, expiry depuis ACCESS_TOKEN_EXPIRE_MINUTES
get_current_user(token, db) -> Employe       # décod JWT → sub=identifiant → query Employe, vérifie actif=True
get_current_client(token, db) -> ClientFidelite
require_role(*roles)                         # factory Depends, lève 403 si rôle non autorisé
```

Le token JWT contient `sub = identifiant` (ex: `GER001`).

### Frontend — intercepteur Axios (api.js)

```javascript
// Request : ajoute Authorization: Bearer {token} depuis localStorage
api.interceptors.request.use(config => {
  const token = _storageGet('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response : 401 → supprime token+user → redirige /login ou /client/login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      _storageRemove('token'); _storageRemove('user')
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

Timeout global Axios : **30 secondes**.

---

## 4. Page : Tableau de bord (GerantDashboard)

**Fichier** : `frontend/src/pages/GerantDashboard.jsx`
**Route** : `/gerant` (index)
**API** : `GET /api/dashboard/`

### Chargement

Un seul appel `getDashboard()` au montage via `useEffect([], [])` — pas de polling.
État de chargement : spinner amber `border-4 border-amber-500 border-t-transparent animate-spin`.

### 4 cartes KPI (StatCard)

| KPI | Champ | Couleur valeur | Cliquable |
|-----|-------|----------------|-----------|
| CA aujourd'hui | `ca_aujourd_hui` | amber-600 | Non |
| Commandes actives | `commandes_actives` | blue-600 (si > 0) | Non |
| Tables libres | `tables_libres` | green-600 | Oui → `/gerant/tables` |
| Alertes stock | `ingredients_alerte` | red-600 (si > 0) | Oui → `/gerant/stocks` |

La carte "Tables libres" affiche en sous-titre le nombre de tables occupées et réservées.
Les cartes cliquables reçoivent `cursor-pointer hover:border-amber-300`.

### Badges de notification

Apparaissent sous les KPIs si les valeurs sont > 0 :

```jsx
// Propositions cuisinier en attente → /gerant/menu (badge amber)
{data.propositions_cuisinier_en_attente > 0 && (
  <button onClick={() => navigate('/gerant/menu')}>
    <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full">
      {data.propositions_cuisinier_en_attente}
    </span>
    proposition(s) cuisinier en attente
  </button>
)}

// Avis tombola à valider → /gerant/tombola (badge purple)
{data.avis_en_attente > 0 && (
  <button onClick={() => navigate('/gerant/tombola')}>
    <span className="w-5 h-5 bg-purple-500">
      {data.avis_en_attente}
    </span>
    participation(s) tombola à valider
  </button>
)}
```

### Graphique 1 — Top 5 plats (BarChart horizontal)

```jsx
<BarChart data={data.top_plats} layout="vertical">
  <XAxis type="number" />
  <YAxis dataKey="nom" type="category" width={120} />
  <Tooltip formatter={(v) => [`${v} cmd`, '']} />
  <Bar dataKey="total_commandes" fill="#f59e0b" radius={[0, 4, 4, 0]} />
</BarChart>
```

Données : `[{ nom: "Tajine poulet", total_commandes: 42 }]`

### Graphique 2 — Sentiments tombola (PieChart)

```javascript
const SENTIMENT_COLORS = { positif: '#22c55e', neutre: '#94a3b8', negatif: '#ef4444' }

const sentimentData = [
  { name: 'Positif', value: data.sentiments.positif },
  { name: 'Neutre',  value: data.sentiments.neutre },
  { name: 'Négatif', value: data.sentiments.negatif },
].filter(s => s.value > 0)  // filtre les zéros
```

PieChart avec label `"{name} {percent}%"`, légende, tooltip.

### Structure réponse API `/api/dashboard/`

```json
{
  "ca_aujourd_hui": 1250.00,
  "commandes_actives": 3,
  "tables_libres": 8,
  "tables_occupees": 4,
  "tables_reservees": 2,
  "ingredients_alerte": 2,
  "propositions_cuisinier_en_attente": 1,
  "avis_en_attente": 5,
  "top_plats": [{ "nom": "Tajine poulet", "total_commandes": 42 }],
  "sentiments": { "positif": 15, "neutre": 3, "negatif": 2 }
}
```

---

## 5. Page : Menu & Plats (GerantMenu)

**Fichier** : `frontend/src/pages/GerantMenu.jsx`
**Route** : `/gerant/menu`
**APIs** : `getTousPlats`, `getPropositions`, `getCategories`, `getIngredients`, `creerPlatGerant`, `modifierPlat`, `supprimerPlat`, `validerProposition`, `creerCategorie`, `supprimerCategorie`, `getNutrition`, `setNutrition`, `calculerNutrition`

Chargement parallèle au montage :
```javascript
await Promise.all([getTousPlats(), getPropositions(), getCategories(), getIngredients()])
```

### 3 onglets

```javascript
const TABS = ['Plats', 'Propositions cuisinier', 'Catégories']
```

L'onglet "Propositions cuisinier" affiche un badge amber avec le nombre de propositions en attente.

### Onglet 0 — Plats

Tableau colonnes : Plat / Catégorie / Prix / Statut / Dispo / Actions.

**Badges statut** :
```javascript
const STATUT_BADGE = {
  valide:     'bg-green-100 text-green-700',
  en_attente: 'bg-amber-100 text-amber-700',
  refuse:     'bg-red-100 text-red-700',
}
```

**Actions par ligne** :
- "Modifier" → modale d'édition pré-remplie
- "Nutrition" → modale nutritionnelle (appelle `getNutrition(plat.id)`)
- "Supprimer" → modale de confirmation

#### Modale créer / modifier un plat

Champs de base :
```javascript
{ nom, description, prix, categorie_id, disponible }
```

En création uniquement : lignes d'ingrédients `[{ ingredient_id, quantite }]`.
Le bouton "+ Ajouter" pousse une nouvelle ligne. Chaque ligne = `<select>` ingrédient + `<input>` quantité.

Payload création :
```javascript
{
  nom, description, prix: parseFloat(prix),
  categorie_id: parseInt(categorie_id),
  disponible,
  ingredients: ingLines
    .map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantite: parseFloat(l.quantite) }))
    .filter(l => l.ingredient_id && l.quantite)
}
```

Si aucune catégorie n'existe, avertissement à la place du select.

#### Modale Nutrition

Ouverte par `openNutrition(plat)` → appelle `getNutrition(plat.id)`.

Champs (grille 2 colonnes) :
- Portion (g), Calories (kcal), Protéines (g), Glucides (g)
- Lipides (g), Fibres (g), Sucres (g), Sodium (mg)

Bouton "Calculer automatiquement depuis les ingrédients" → `POST /api/nutrition/{platId}/calculer`.
Le backend somme les valeurs par 100g × (quantite_ingredient / 100) pour chaque `PlatIngredient`.
Résultat pré-remplit le formulaire. Signalement si des ingrédients manquent de données.

Bouton "Enregistrer" → `PUT /api/nutrition/{platId}`.

### Onglet 1 — Propositions cuisinier

Cartes avec : nom, description, prix, proposé par.
Bouton "Traiter" → modale avec :
- `<textarea>` motif de refus (optionnel)
- Bouton "Valider" (`statut = 'valide'`) / "Refuser" (`statut = 'refuse'`)

Route backend : `PUT /api/plats/admin/{id}/valider`
```python
if statut == "valide":   plat.statut = valide; plat.motif_refus = None
elif statut == "refuse": plat.statut = refuse; plat.motif_refus = motif_refus
```

### Onglet 2 — Catégories

Tableau : Nom / Ordre / Nb plats (calculé localement) / Actions.
- Créer : `{ nom, ordre }` → `POST /api/categories/`
- Supprimer : `DELETE /api/categories/{id}` — échoue si plats liés

### Toast notifications

```javascript
const notify = (msg, type = 'success') => {
  setToast({ msg, type })
  setTimeout(() => setToast(null), 3000)
}
// Toast fixe en bas à droite, bg-green-500 (succès) ou bg-red-500 (erreur)
```

---

## 6. Page : Stocks & Ingrédients (GerantIngredients)

**Fichier** : `frontend/src/pages/GerantIngredients.jsx`
**Route** : `/gerant/stocks`
**APIs** : `getIngredients`, `creerIngredient`, `modifierIngredient`, `supprimerIngredient`

### Détection d'alerte

```javascript
const alerte = (ing) => ing.seuil_alerte > 0 && ing.quantite_stock <= ing.seuil_alerte
```

Compteur d'alertes affiché sous le titre.

### Filtre Tous / Alertes

```javascript
const filtered = filter === 'alertes' ? ingredients.filter(alerte) : ingredients
```

Bouton "Alertes (N)" avec compteur si > 0.

### Composant StockBar

```javascript
// Rouge  : current <= seuil
// Amber  : current <= seuil * 1.5
// Vert   : current > seuil * 1.5
// Largeur barre = min(current/seuil*100, 100)%
// Ratio interne stocké jusqu'à 200%
```

Affiché sous la valeur de stock, uniquement si `seuil_alerte > 0`.

### Formatage des quantités

```javascript
const UNITES_PIECES = ['unites', 'bouteilles', 'pieces', 'pièces', 'unités']
// → entier si unité pièce, sinon 2 décimales
```

### Tableau

Les lignes en alerte : fond `bg-red-50/50`, point rouge, valeur stock en `text-red-600`.

### Formulaire CRUD

```javascript
{ nom, quantite_stock, seuil_alerte, unite }
```

Création → `POST /api/ingredients/` → déclenche auto-fetch **Open Food Facts** (backend) :

```python
# world.openfoodfacts.org, timeout=5s, silencieux en cas d'échec
# Stocke : calories_par_100g, proteines_par_100g, glucides_par_100g, lipides_par_100g, fibres_par_100g
```

Modification → `PUT /api/ingredients/{id}` — ne relance pas l'auto-fetch.

---

## 7. Page : Tables (GerantTables)

**Fichier** : `frontend/src/pages/GerantTables.jsx`
**Route** : `/gerant/tables`
**APIs** : `getTables`, `creerTable`, `supprimerTable`, `changerStatutTable`

### Actualisation temps réel

```javascript
useEffect(() => {
  load()
  const id = setInterval(load, 10000)  // toutes les 10 secondes
  return () => clearInterval(id)
}, [])
```

### Code couleur statuts

```javascript
const STATUT_CONFIG = {
  libre:    { label: 'Libre',    color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500'  },
  occupee:  { label: 'Occupée', color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500'    },
  reservee: { label: 'Réservée',color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500'  },
}
```

### En-tête

Compteurs : X libres (vert) / X occupées (rouge) / X réservées (amber).

### Filtre emplacement

Boutons : Tous / Intérieur / Terrasse / Mezzanine

### Grille responsive

2 → 3 → 4 → 5 colonnes selon la largeur d'écran.
Chaque carte : numéro T{n}, point coloré, capacité, emplacement.
Carte sélectionnée : `ring-2 ring-amber-400`.
Cliquer une carte la sélectionne ou la désélectionne.

### Panneau d'actions

Apparaît sous la grille quand une table est sélectionnée.
Boutons de transition vers chaque statut différent du statut actuel.
Bouton rouge "Supprimer" → modale de confirmation.

### Création de table

Champs : Numéro (int), Capacité (int), Emplacement (select).
Route : `POST /api/tables/` → génère QR code base64 stocké dans `qr_code_url`.

---

## 8. Page : Réservations (GerantReservations)

**Fichier** : `frontend/src/pages/GerantReservations.jsx`
**Route** : `/gerant/reservations`
**APIs** : `getReservations`, `confirmerReservation`, `annulerReservation`, `verifierCodeAcces`

### Vérificateur de code (toujours visible en haut)

```javascript
verifierCodeAcces(code.toUpperCase())  // GET /api/reservations/verifier-code/{code}
```

Succès → carte verte avec nom client, nb personnes, date.
Échec → `e.response?.data?.detail || 'Code invalide'` sur fond rouge.

Placeholder de l'input : `"LOCAL-2026-XXXX"` en `font-mono`.

### Filtres par statut

```javascript
const [filter, setFilter] = useState('tous')
// Boutons: Toutes / En attente / Confirmées / Annulées
```

Badge "En attente" exclut les réservations local privé + en_ligne (auto-confirmées) :
```javascript
reservations.filter(r =>
  r.statut === 'en_attente' &&
  !(r.type === 'local_prive' && r.mode_paiement_local === 'en_ligne')
).length
```

### Tableau

Colonnes : Client (nom + tél + message en italique) / Date & heure / Pers. / Zone+Type / Statut / Code accès / Actions.

**Mapping zones** :
```javascript
{ salle: '🍽 Salle principale', t1: '🌬 Terrasse 1', t2: '🌿 Terrasse 2', priv: '🔒 Salle privée' }
```

**Badges type** :
- `local_prive` → `bg-purple-100 text-purple-700`
- `standard` → `bg-gray-100 text-gray-600`

Code accès affiché en `font-mono` si présent, sinon `—`.

### Logique d'actions

```jsx
{r.type === 'local_prive' && r.mode_paiement_local === 'en_ligne'
  ? /* Auto-confirmée Stripe → badge "💳 Payé Stripe" + seulement Annuler */
  : /* Standard / paiement sur place */
    r.statut === 'en_attente' ? /* Confirmer + Annuler */
    r.statut === 'confirmee' ? /* Annuler seulement */
    null
}
```

### Confirmation avec code

```javascript
const r = await confirmerReservation(id)
notify(r.data.code_acces
  ? `Confirmée · Code : ${r.data.code_acces}`
  : 'Réservation confirmée')
```

Le code est généré par le backend lors de la confirmation pour les paiements sur place.
Pour Stripe en ligne : le code est généré à la création (auto-confirmé).

### Format de date

```javascript
new Date(dt).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
})
```

### Stripe (backend) — salle privée en ligne

```python
# POST /api/reservations/{id}/paiement-intent
montant = int((resa.montant_acompte or 500) * 100)  # centimes
intent = stripe.PaymentIntent.create(amount=montant, currency="eur", ...)

# POST /api/reservations/{id}/confirmer-paiement
# Vérifie intent.status == "succeeded" → confirme + génère code
```

### Génération du code d'accès (backend)

```python
def generer_code_acces(db):
    year = datetime.now().year
    for _ in range(20):
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"LOCAL-{year}-{suffix}"
        if not db.query(Reservation).filter_by(code_acces=code).first():
            return code
    return f"LOCAL-{year}-{uuid.uuid4().hex[:8].upper()}"  # fallback
```

---

## 9. Page : Personnel (GerantPersonnel)

**Fichier** : `frontend/src/pages/GerantPersonnel.jsx`
**Route** : `/gerant/personnel`
**APIs** : `getEmployes`, `creerEmploye`, `toggleActifEmploye`, `modifierEmploye`

### Tableau

Colonnes : Employé (prénom nom) / Identifiant (font-mono) / Rôle / Téléphone / Date embauche / Actif / Modifier.

**Badges de rôle** :
```javascript
const ROLE_CONFIG = {
  gerant:    { label: 'Gérant',    color: 'bg-purple-100 text-purple-700' },
  serveur:   { label: 'Serveur',   color: 'bg-blue-100 text-blue-700' },
  cuisinier: { label: 'Cuisinier', color: 'bg-amber-100 text-amber-700' },
}
```

Lignes inactives : `opacity-50`.

### Filtre

Tous / Gérants / Serveurs / Cuisiniers

### Toggle actif (interrupteur CSS)

```jsx
<button
  onClick={() => toggleActifEmploye(e.id, !e.actif)}
  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
    ${e.actif ? 'bg-green-500' : 'bg-gray-200'}`}
>
  <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform
    ${e.actif ? 'translate-x-4' : 'translate-x-1'}`} />
</button>
```

Route : `PUT /api/employes/{id}/actif?actif={bool}`

### Créer un employé

```javascript
{ prenom*, nom*, identifiant*, code_passe*, role: 'serveur', telephone }
// Rôles: serveur | cuisinier | gerant
```

Route : `POST /api/employes/` — mot de passe haché bcrypt côté backend.

### Modifier un employé

Modale avec :
- `telephone` (libre)
- `nouveau_mdp` (optionnel)
- `confirmer_mdp` (visible uniquement si `nouveau_mdp` non vide, bordure rouge si mismatch)

Route : `PUT /api/employes/{id}` avec `{ telephone, nouveau_mdp? }`

---

## 10. Page : Tombola & Fidélité (GerantTombola)

**Fichier** : `frontend/src/pages/GerantTombola.jsx`
**Route** : `/gerant/tombola`
**APIs** : `getTombolas`, `creerTombola`, `getParticipations`, `validerAvis`, `rejeterAvis`, `tirageAuSort`, `getGerantSpins`

### Deux sous-onglets

```javascript
const [activeTab, setActiveTab] = useState('tombola') // 'tombola' | 'spins'
```

### Onglet Tombolas

Layout : colonne gauche (liste tombolas) + 2/3 droite (participations).

#### Liste tombolas

Cartes : titre, lot (🎁), badge Active/Inactive (vert/gris), `nb_participations`, `nb_valides`.
Carte sélectionnée → `border-amber-400`.

#### Participations

Chargées via `getParticipations(tombola.id)` → `GET /api/tombola/participations?tombola_id={id}`.

Filtre : Toutes / En attente / Validées / Rejetées

Chaque carte :
- Nom, email, `code_commande` (font-mono), badge statut
- Section IA :

```javascript
const SENTIMENT_EMOJI = { positif: '😊', neutre: '😐', negatif: '😞' }

// Couleur score IA :
score >= 0.7 ? 'text-green-600' : score >= 0.4 ? 'text-amber-600' : 'text-red-600'
```

- Badge `validee_par_ia` : vert "IA : valide" ou rouge "IA : suspect"
- Boutons Valider / Rejeter (uniquement si `statut === 'en_attente'`)

#### Tirage au sort

```javascript
const r = await tirageAuSort(selected.id)  // POST /api/tombola/{id}/tirage
```

Modale résultat :
```jsx
<div className="text-6xl">🏆</div>
<h3>{gagnant.gagnant}</h3>
<p>{gagnant.email}</p>
<p className="font-mono">Commande : {gagnant.code_commande}</p>
```

Backend : sélection aléatoire parmi `statut === 'valide'`.

#### Créer une tombola

```javascript
{
  titre: '',
  lot: '',
  date_debut: new Date().toISOString().slice(0, 16),          // maintenant
  date_fin: new Date(Date.now() + 7*86400000).toISOString().slice(0, 16)  // +7 jours
}
```

### Onglet Spins (historique)

Tableau : Client / Prix gagné / Date / Points (avant → après) / Statut.

```javascript
const STATUT_CONFIG = {
  non_utilise: { label: 'Dispo',    color: 'bg-orange-50 text-orange-600 border-orange-200' },
  utilise:     { label: 'Utilisé',  color: 'bg-gray-100 text-gray-500' },
}
```

---

## 11. Page : Revenus (GerantRevenues)

**Fichier** : `frontend/src/pages/GerantRevenues.jsx`
**Route** : `/gerant/revenues`
**API** : `getRevenues(annee?)` → `GET /api/commandes/revenues?annee={annee}`

### Filtre par année

Boutons dynamiques depuis `data.annees_disponibles` + bouton "Tout" (annee = null).

### 4 KPIs

| Label | Champ | Badge |
|-------|-------|-------|
| CA total | `total_ca` | 💰 |
| Commandes | `nb_commandes` | 📋 |
| Ticket moyen | `ticket_moyen` | 🎯 |
| Meilleur mois | `meilleur_mois.ca` | 🏆 |

### Graphiques Recharts

**BarChart CA mensuel** (2/3 largeur) :
- Barres noires `fill="#111827"`, `radius={[6,6,0,0]}`, `maxBarSize={44}`
- Axe X : labels mois, Axe Y : CA en Dh
- `CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"`

**PieChart modes de paiement** (1/3 largeur) — donut `innerRadius={40} outerRadius={68}` :

```javascript
const MODE_COLORS = {
  carte: '#f59e0b', especes: '#10b981', google_pay: '#3b82f6',
  apple_pay: '#8b5cf6', en_ligne: '#ec4899'
}
```

Légende manuelle sous le graphique avec montants exacts.

**LineChart tendance** (visible si `mensuel.length > 1`) :
- Trait noir, `strokeWidth={2.5}`, points `r={4}`, activeDot `r={6}`

### Tableau détaillé mensuel

Ordre chronologique inversé. Colonnes : Mois / CA (Dh) / % du total / Rang.
- Meilleur mois : fond `bg-amber-50` + badge "Meilleur"
- Barre de progression inline pour "% du total"
- Rang calculé : `[...mensuel].sort((a,b)=>b.ca-a.ca).findIndex(r=>r.mois===row.mois)+1`

### Conversion label mois

```javascript
const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const labelMois = (key) => {
  const [y, m] = key.split('-')
  return `${MOIS_FR[parseInt(m)-1]} ${y}`  // "2026-06" → "Jun 2026"
}
```

### Structure réponse API

```json
{
  "total_ca": 45230.50,
  "nb_commandes": 342,
  "ticket_moyen": 132.25,
  "ca_mensuel": [{ "mois": "2026-01", "ca": 3200.00 }],
  "ca_by_mode": { "carte": 28000.00, "especes": 12000.00 },
  "meilleur_mois": { "mois": "2026-04", "ca": 6500.00 },
  "annees_disponibles": [2026, 2025]
}
```

---

## 12. Page : Spins anti-fraude (GerantSpins)

**Fichier** : `frontend/src/pages/GerantSpins.jsx`
**Route** : `/gerant/spins`
**APIs** : `getGerantSpins`, `marquerGainUtilise`

### Design typographique

Palette et polices distinctives (inline styles, pas Tailwind) :

```javascript
const INK   = '#1A1410'   // noir encre
const CREAM = '#F5F0E8'   // crème
const PAPER = '#FAF7F0'   // papier
const MUTED = '#8A7E76'
const GOLD  = '#B8963E'
const RED   = '#C8312A'
// Polices : Space Mono (mono) + DM Serif Display (serif)
```

Label anti-fraude : `"VÉRIFICATION ANTI-FRAUDE — TOUS LES GAINS CLIENTS"`

### KPIs

3 cartes : Total spins / Prix disponibles (GOLD) / Prix utilisés (MUTED).

### Recherche et filtres

```javascript
const [search, setSearch] = useState('')
const [filtre, setFiltre] = useState('tous')  // 'tous' | 'non_utilise' | 'utilise'

const affiches = spins.filter(s => {
  const matchSearch = !search ||
    s.client_nom?.toLowerCase().includes(search.toLowerCase()) ||
    s.prix_nom?.toLowerCase().includes(search.toLowerCase())
  const matchFiltre = filtre === 'tous' || s.statut === filtre
  return matchSearch && matchFiltre
})
```

### Tableau

Colonnes : Client / Prix gagné / Date / Statut / Points avant→après / Action.

**Affichage points** :
```jsx
<span style={{ color: INK }}>{s.points_avant ?? '—'}</span>
{' → '}
<span style={{ color: (s.points_apres ?? 0) > (s.points_avant ?? 0) ? GOLD : RED }}>
  {s.points_apres ?? '—'}
</span>
```

**Action "Encaissé"** (seulement pour `non_utilise`) :
```javascript
await marquerGainUtilise(s.id)
// Mise à jour optimiste — pas de re-fetch
setSpins(prev => prev.map(x => x.id === s.id ? { ...x, statut: 'utilise' } : x))
```

Route : `PUT /api/gerant/spins/{id}/utiliser`

---

## 13. Page : Avis clients (GerantAvis)

**Fichier** : `frontend/src/pages/GerantAvis.jsx`
**APIs** : `getAvisAdmin`, `validerAvisClient`, `rejeterAvisClient`

### Stats (sur avis validés uniquement)

```javascript
const valides = avis.filter(a => a.statut === 'valide')
const noteMoyenne = valides.length
  ? (valides.reduce((s, a) => s + a.note, 0) / valides.length).toFixed(1)
  : '—'
const stats = {
  positif: valides.filter(a => a.sentiment === 'positif').length,
  neutre:  valides.filter(a => a.sentiment === 'neutre').length,
  negatif: valides.filter(a => a.sentiment === 'negatif').length,
}
```

4 cartes stat : Note moyenne / Positifs / Neutres / Négatifs.

### Filtre

Démarre sur `'en_attente'`. Boutons pill avec compteur : En attente / Validés / Rejetés / Tous.

### Composant Etoiles

5 SVG étoiles amber-400 (remplies) / gray-200 (vides).

### Badges sentiment

```javascript
const SENTIMENT_CONFIG = {
  positif: { label: 'Positif', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  neutre:  { label: 'Neutre',  bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400'  },
  negatif: { label: 'Négatif', bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500'   },
}
```

Si `sentiment` null → badge gris "IA : non analysé".

### Carte d'avis

```
[Nom + Etoiles + Date]
[Commentaire en italique entre guillemets]
[Badge statut] [Badge sentiment IA]
[Valider] [Rejeter]  ← seulement si en_attente
```

### Flux IA sentiment

Lors du dépôt d'un avis client, le backend analyse le commentaire avec `cardiffnlp/twitter-xlm-roberta-base-sentiment` (HuggingFace). Les avis négatifs restent en `en_attente` pour modération manuelle.

---

## 14. Page : Paramètres (GerantSettings)

**Fichier** : `frontend/src/pages/GerantSettings.jsx`
**Route** : `/gerant/settings`
**APIs** : `getRestaurantInfo`, `updateRestaurantInfo`, `getSalles`, `creerSalle`, `modifierSalle`, `supprimerSalle`, `getOffres`, `creerOffre`, `modifierOffre`, `supprimerOffre`, `getCandidatures`, `marquerCandidatureLue`, `getAvisAdmin`, `validerAvisClient`, `rejeterAvisClient`, `getMe`, `updateMyEmail`, `demanderCodeMdp`, `changerMdp`

### 4 onglets

```javascript
const TABS = ['Informations', 'Salles privées', 'Recrutement', 'Avis clients']
```

### Onglet 0 — Informations restaurant

Grille 2 colonnes, 8 champs texte + 1 textarea :

| Champ | Clé |
|-------|-----|
| Nom du restaurant | `nom` |
| Slogan | `slogan` |
| Adresse | `adresse` |
| Téléphone | `telephone` |
| Email contact | `email_contact` |
| Horaires | `horaires` |
| Instagram | `instagram_url` |
| Facebook | `facebook_url` |
| Description | `description` (textarea) |

Route : `PUT /api/restaurant/`. Feedback "✓ Enregistré !" pendant 2,5s.

#### Section Sécurité (dans onglet 0)

**Email de récupération** : `PUT /api/auth/me/email` via `updateMyEmail(email)`.

**Réinitialisation mot de passe (OTP)** :

Étape 1 — bouton désactivé si pas d'email :
```javascript
await demanderCodeMdp()  // POST /api/auth/demander-code-mdp → envoie OTP par email
setCodeDemande(true)
```

Étape 2 — formulaire OTP :
```jsx
<input value={otpCode} maxLength={6}
  className="font-mono tracking-widest text-center text-lg" />
<input type="password" value={nouveauMdp} placeholder="Minimum 4 caractères" />
<input type="password" value={confirmMdp} />
```

```javascript
if (nouveauMdp !== confirmMdp) return setError('...')
await changerMdp(otpCode, nouveauMdp)  // POST /api/auth/changer-mdp
```

Code OTP valide **10 minutes** (géré backend).

### Onglet 1 — Salles privées

Liste avec : photo, nom, description tronquée, capacité, prix, badge disponible.
Boutons : "Désactiver/Activer" (toggle `disponible`) + "Supprimer".

Formulaire création :
```javascript
{ nom, description, capacite, prix_location, photo_url }
// Route: POST /api/salles/
```

### Onglet 2 — Recrutement

**Colonne gauche — Offres** :
- Badge type de contrat bleu (CDI/CDD/Stage/Temps partiel)
- Actions : Archiver/Réactiver (toggle `active`) + Supprimer
- Formulaire : `{ titre, description, type_contrat: 'CDI' }` → `POST /api/emplois/`

**Colonne droite — Candidatures** (max 272px) :
- Badge rouge si candidatures non lues
- Fond `bg-blue-50 border-blue-200` si non lue
- Lien CV → `http://localhost:8000{c.cv_url}` si présent
- Bouton "Marquer lue" → `PUT /api/emplois/candidatures/{id}/lue`

### Onglet 3 — Avis clients

Même interface que `GerantAvis.jsx` (inline dans Settings).
Étoiles affichées en caractères :
```jsx
<span className="text-amber-400">{'★'.repeat(a.note)}{'☆'.repeat(5-a.note)}</span>
```

---

## 15. Fidélité gérant (gerant_fidelite.py)

**Fichier** : `backend/app/api/routes/gerant_fidelite.py`
**Préfixe** : `/api/gerant`

### GET /api/gerant/clients

Retourne tous les `ClientFidelite` avec : prenom, nom, email, telephone, telephone_valide, points_solde, date_inscription, code_parrainage, nb_parrainages.

### GET /api/gerant/spins

Retourne historique des spins avec jointures client + prix :
```python
{
  "id": s.id, "client_nom": f"{client.prenom} {client.nom}",
  "prix_nom": prix.nom, "date": s.date_gain,
  "statut": s.statut, "points_avant": s.points_avant, "points_apres": s.points_apres
}
# Trié par date_gain décroissant
```

### GET + PUT /api/gerant/config-fidelite

```python
class ConfigFidelite(Base):
    seuil_minimum_mad   = Column(Float, default=80)    # montant min commande pour points
    points_par_tranche  = Column(Integer, default=5)   # points gagnés par tranche
    tranche_mad         = Column(Integer, default=20)  # valeur d'une tranche en MAD
    cout_spin_points    = Column(Integer, default=100) # coût d'un spin en points
    points_avis_google  = Column(Integer, default=50)  # bonus avis Google
```

Exemple : commande 100 MAD → `(100/20)*5 = 25 points`.

### PUT /api/gerant/spins/{id}/utiliser

Marque le gain comme `utilise`. Retourne 400 si déjà utilisé.

### PUT /api/gerant/clients/{id}/valider-telephone

Valide manuellement le téléphone du client + crédite `points_avis_google` points.

---

## 16. Table complète des routes API

### Auth

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/login` | Public | Form login → JWT |
| GET | `/api/auth/me` | Connecté | Profil employé courant |
| PUT | `/api/auth/me/email` | Connecté | Mettre à jour email |
| POST | `/api/auth/demander-code-mdp` | Connecté | Envoyer OTP par email |
| POST | `/api/auth/changer-mdp` | Connecté | Changer mdp avec OTP |

### Plats

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/plats/` | Public | Menu validés + disponibles |
| GET | `/api/plats/categories` | Public | Menu groupé par catégorie |
| GET | `/api/plats/tendances` | Public | Tendances de commandes |
| GET | `/api/plats/admin/tous` | Gérant | Tous plats (tous statuts) |
| GET | `/api/plats/admin/propositions` | Gérant | Propositions en attente |
| POST | `/api/plats/admin/creer` | Gérant | Créer plat (statut=valide) |
| DELETE | `/api/plats/admin/tout` | Gérant | Supprimer tous les plats |
| PUT | `/api/plats/admin/{id}/valider` | Gérant | Valider ou refuser proposition |
| PUT | `/api/plats/admin/{id}` | Gérant | Modifier un plat |
| DELETE | `/api/plats/admin/{id}` | Gérant | Supprimer un plat |
| POST | `/api/plats/proposer` | Cuisinier | Proposer un plat (statut=en_attente) |
| GET | `/api/plats/mes-propositions` | Cuisinier | Voir ses propositions |
| POST | `/api/plats/{id}/image` | Connecté | Upload image (multipart → uploads/plats/) |

### Catégories

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/categories/` | Public | Liste ordonnée |
| POST | `/api/categories/` | Gérant | Créer |
| PUT | `/api/categories/{id}` | Gérant | Modifier |
| DELETE | `/api/categories/{id}` | Gérant | Supprimer |

### Ingrédients

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/ingredients/alertes` | Gérant | Sous seuil_alerte |
| GET | `/api/ingredients/` | Gérant / Cuisinier | Liste complète |
| POST | `/api/ingredients/` | Gérant | Créer + auto Open Food Facts |
| PUT | `/api/ingredients/{id}` | Gérant | Modifier |
| DELETE | `/api/ingredients/{id}` | Gérant | Supprimer |

### Nutrition

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/nutrition/{platId}` | Connecté | Lire valeurs d'un plat |
| PUT | `/api/nutrition/{platId}` | Gérant | Enregistrer manuellement |
| POST | `/api/nutrition/{platId}/calculer` | Gérant | Calculer depuis ingrédients |

### Commandes

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/commandes/` | Serveur / Gérant | Créer commande (table → occupee) |
| GET | `/api/commandes/` | Serveur / Gérant | 50 dernières |
| GET | `/api/commandes/cuisine` | Cuisinier / Gérant | En attente cuisine |
| GET | `/api/commandes/revenues` | Gérant | CA mensuel + KPIs |
| GET | `/api/commandes/client-prizes` | Serveur / Gérant | Réductions disponibles |
| GET | `/api/commandes/notifications/non-lues` | Gérant | Notifs non lues |
| PUT | `/api/commandes/notifications/{id}/lue` | Gérant | Marquer lue |
| PUT | `/api/commandes/notifications/tout-lire` | Gérant | Tout marquer lu |
| GET | `/api/commandes/{id}` | Connecté | Détail commande |
| GET | `/api/commandes/{id}/suivi` | Serveur / Gérant | Suivi temps réel |
| POST | `/api/commandes/{id}/envoyer-cuisine` | Serveur / Gérant | → envoyee |
| POST | `/api/commandes/{id}/cloturer` | Serveur / Gérant | → cloturee + libère table + crédite points |
| POST | `/api/commandes/{id}/annuler` | Serveur / Gérant | Annuler + table libre |
| PUT | `/api/commandes/{id}/modifier` | Serveur / Gérant | Modifier lignes (en_cours seulement) |
| POST | `/api/commandes/{id}/ajouter-plat` | Serveur / Gérant | Ajouter un plat |
| POST | `/api/commandes/{id}/appliquer-reduction` | Serveur / Gérant | Réduction fidélité |
| PUT | `/api/commandes/{id}/statut` | Cuisinier / Gérant | Changer statut (assigne cuisinier_id) |
| PUT | `/api/commandes/{id}/ligne/{lid}/quantite` | Serveur / Gérant | Modifier quantité |
| DELETE | `/api/commandes/{id}/ligne/{lid}` | Serveur / Gérant | Supprimer ligne |
| PUT | `/api/commandes/ligne/{id}/statut` | Cuisinier / Gérant | Marquer ligne prête (déduit stock) |

### KDS — Modifications post-validation

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/modifications/commandes/{id}/annuler` | Serveur / Gérant | Annuler commande |
| POST | `/api/modifications/commandes/{id}/lignes/{lid}/annuler` | Serveur / Gérant | Annuler ligne |
| POST | `/api/modifications/commandes/{id}/lignes/ajouter` | Serveur / Gérant | Ajouter ligne |
| PUT | `/api/modifications/commandes/{id}/lignes/{lid}/note` | Serveur / Gérant | Modifier note |
| POST | `/api/modifications/commandes/{id}/lignes/{lid}/remplacer` | Serveur / Gérant | Remplacer plat |
| PUT | `/api/modifications/lignes/{lid}/annuler_prete` | Cuisinier / Gérant | Annuler plat prêt |
| PUT | `/api/modifications/lignes/{lid}/rupture` | Cuisinier / Gérant | Signaler rupture |
| GET | `/api/modifications/commandes/{id}/historique` | Connecté | Historique KDS |
| GET | `/api/modifications/kds/alertes` | Cuisinier / Gérant | Alertes non acquittées |
| PUT | `/api/modifications/kds/alertes/{id}/acquitter` | Cuisinier / Gérant | Acquitter alerte |

### Tables

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/tables/` | Public | Liste |
| POST | `/api/tables/` | Gérant | Créer + QR code base64 |
| PUT | `/api/tables/{id}/statut` | Serveur / Gérant | Changer statut |
| DELETE | `/api/tables/{id}` | Gérant | Supprimer |

### Réservations

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/reservations/` | Public | Créer |
| GET | `/api/reservations/` | Gérant | Liste complète |
| PUT | `/api/reservations/{id}/confirmer` | Gérant | Confirmer + code local privé |
| PUT | `/api/reservations/{id}/annuler` | Gérant | Annuler |
| POST | `/api/reservations/{id}/paiement-intent` | Public | Stripe PaymentIntent |
| POST | `/api/reservations/{id}/confirmer-paiement` | Public | Vérifier Stripe + confirmer |
| GET | `/api/reservations/verifier-code/{code}` | Gérant | Vérifier code d'accès |

### Tombola

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/tombola/` | Gérant | Liste tombolas |
| POST | `/api/tombola/creer` | Gérant | Créer tombola |
| GET | `/api/tombola/participations` | Gérant | Participations (filtre tombola_id) |
| PUT | `/api/tombola/avis/{id}/valider` | Gérant | Valider participation |
| PUT | `/api/tombola/avis/{id}/rejeter` | Gérant | Rejeter participation |
| POST | `/api/tombola/{id}/tirage` | Gérant | Tirage au sort (parmi validées) |
| POST | `/api/tombola/participer` | Public | Participer + upload screenshot IA |

### Dashboard

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/dashboard/` | Gérant | KPIs + top plats + sentiments |

### Employés

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/employes/` | Gérant | Liste |
| POST | `/api/employes/` | Gérant | Créer (bcrypt mdp) |
| PUT | `/api/employes/{id}/actif` | Gérant | Activer / Désactiver |
| PUT | `/api/employes/{id}` | Gérant | Modifier téléphone + mdp |
| PUT | `/api/employes/{id}/landing` | Gérant | Afficher sur landing page |

### Restaurant & SaaS

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/restaurant/` | Public | Informations restaurant |
| PUT | `/api/restaurant/` | Gérant | Mettre à jour |
| GET | `/api/setup/status` | Public | Statut d'initialisation |
| POST | `/api/setup/` | Public | Premier setup |
| GET | `/api/landing/` | Public | Données landing complètes |

### Salles privées

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/salles/` | Public | Disponibles |
| POST | `/api/salles/` | Gérant | Créer |
| PUT | `/api/salles/{id}` | Gérant | Modifier / toggle disponible |
| DELETE | `/api/salles/{id}` | Gérant | Supprimer |

### Offres & Candidatures

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/emplois/` | Public | Offres actives |
| POST | `/api/emplois/` | Gérant | Créer offre |
| PUT | `/api/emplois/{id}` | Gérant | Modifier / archiver |
| DELETE | `/api/emplois/{id}` | Gérant | Supprimer |
| POST | `/api/emplois/{id}/postuler` | Public | Postuler + upload CV |
| GET | `/api/emplois/candidatures` | Gérant | Toutes candidatures |
| PUT | `/api/emplois/candidatures/{id}/lue` | Gérant | Marquer lue |

### Avis clients

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/avis-clients/` | Public | Avis validés (landing) |
| POST | `/api/avis-clients/` | Public | Déposer avis (analyse IA) |
| GET | `/api/avis-clients/admin` | Gérant | Tous avis (modération) |
| PUT | `/api/avis-clients/{id}/valider` | Gérant | Valider |
| PUT | `/api/avis-clients/{id}/rejeter` | Gérant | Rejeter |

### Fidélité gérant

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/gerant/clients` | Gérant | Tous les clients fidélité |
| GET | `/api/gerant/spins` | Gérant | Historique spins |
| GET | `/api/gerant/config-fidelite` | Gérant | Config points |
| PUT | `/api/gerant/config-fidelite` | Gérant | Mettre à jour config |
| PUT | `/api/gerant/spins/{id}/utiliser` | Gérant | Marquer gain encaissé |
| PUT | `/api/gerant/clients/{id}/valider-telephone` | Gérant | Valider téléphone client |

### QR Commande (public)

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/api/qr/table/{tableId}` | Public | Info table pour QR |
| POST | `/api/qr/commande` | Public | Créer commande via QR |
| POST | `/api/qr/create-payment-intent/{id}` | Public | Stripe intent |
| POST | `/api/qr/confirmer-paiement/{id}` | Public | Confirmer paiement |
| POST | `/api/qr/paiement-especes/{id}` | Public | Payer en espèces |
| GET | `/api/qr/commande/{id}` | Public | Suivi commande |
| GET | `/api/qr/client-prizes/{clientId}` | Public | Réductions disponibles |

---

## 17. Modèles de données SQLAlchemy

Tous dans `backend/app/models/models.py`. Base SQLAlchemy créée automatiquement au démarrage (`Base.metadata.create_all`).

### Employe

```python
id, nom, prenom, identifiant (unique, ex: GER001), code_passe (bcrypt hash),
telephone, role (RoleEnum), date_embauche, actif (default True),
afficher_landing (default False), photo_url, email (pour OTP reset)
```

### Categorie

```python
id, nom, ordre (default 0)
```

### Ingredient

```python
id, nom, quantite_stock (Float), seuil_alerte (Float), unite (kg/L/pièces...)
# Nutritionnel par 100g (auto Open Food Facts) :
calories_par_100g, proteines_par_100g, glucides_par_100g, lipides_par_100g, fibres_par_100g
```

### Plat

```python
id, nom, description, prix, image, disponible (default True),
statut (StatutPlatEnum, default valide), propose_par_id (FK employes, nullable),
motif_refus (Text, nullable), vegetarien, sans_gluten, allergenes (ex: "gluten,lactose"),
categorie_id (FK categories)
```

### PlatIngredient (liaison Plat ↔ Ingredient)

```python
id, plat_id (FK), ingredient_id (FK), quantite (Float)
# quantite = quantité nécessaire pour ce plat (dans l'unité de l'ingrédient)
```

### NutritionFact

```python
id, plat_id (FK, unique — 1:1), taille_portion (default 100g),
calories, proteines, glucides, lipides, fibres, sucre, sodium,
calcul_auto (Boolean — True si calculé depuis ingrédients)
```

### Table

```python
id, numero (unique), capacite, emplacement (EmplacementEnum),
statut (StatutTableEnum, default libre), qr_code_url (base64)
```

### Commande

```python
id, code_unique (CMD-YYYYMMDD-XXXX), date_heure,
origine (OrigineCommandeEnum), statut (StatutCommandeEnum),
montant_total, employe_id (FK), table_id (FK),
cuisinier_id (FK employes, nullable), client_fidelite_id (FK, nullable)
```

### LigneCommande

```python
id, quantite (default 1), prix_unitaire (copie prix moment commande),
note (ex: "sans oignon"), statut (StatutCommandeEnum),
commande_id (FK), plat_id (FK)
```

### Paiement

```python
id, montant, date_heure, mode (ModePaiementEnum),
statut (StatutPaiementEnum), reference_transaction (Stripe intent_id),
commande_id (FK, unique — 1:1)
```

### Reservation

```python
id, nom_client, telephone, date_heure, nb_personnes,
statut (StatutReservationEnum), type (TypeReservationEnum),
code_acces (nullable, format LOCAL-YYYY-XXXXXX),
montant_acompte (Float), mode_paiement_local (ModePaiementEnum),
table_id (FK, nullable)
# zone et message ajoutés via try/except pour compatibilité migrations
```

### Tombola

```python
id, titre, lot, date_debut, date_fin, active (default True)
```

### Avis (participation tombola)

```python
id, nom, prenom, email, screenshot (chemin fichier),
code_commande, statut (StatutAvisEnum),
date_depot, score_ia (Float 0-1), sentiment (SentimentEnum),
validee_par_ia (Boolean nullable), tombola_id (FK)
```

### RestaurantInfo

```python
id, nom, slogan, description, adresse, telephone, email_contact,
horaires, logo_url, theme (default "elegant"),
couleur_principale (default "#111827"),
section_menu, section_reservations, section_tombola,
section_recrutement, section_avis (toggles booléens),
instagram_url, facebook_url
```

### SallePrivee

```python
id, nom, description, capacite, prix_location, photo_url,
disponible (default True), restaurant_id (FK)
```

### OffreEmploi

```python
id, titre, description, type_contrat (CDI/CDD/Stage/Temps partiel),
date_publication, active (default True), restaurant_id (FK)
```

### Candidature

```python
id, nom, prenom, email, telephone, message, date_depot,
cv_url, lue (default False), offre_id (FK)
```

### ClientFidelite

```python
id, prenom, nom, email (unique), mot_de_passe (bcrypt),
telephone, telephone_valide (default False), photo_url,
# Parrainage :
code_parrainage (unique), nb_parrainages, parrain_id (FK self, nullable),
# Points :
points_solde (default 0), date_inscription, derniere_activite,
# Spin :
spin_count_mois (default 0), derniere_date_spin,
# Avis Google :
avis_google_mois (Boolean), avis_screenshot, avis_score_ia,
avis_sentiment, avis_statut (StatutAvisEnum),
# Auth :
email_confirme (default False),
reset_code (6 chars), reset_code_expiry,
qr_token (unique)
```

### PrixRoue

```python
id, nom, description, validite_jours (default 30),
type (TypePrixEnum), valeur (Float), actif (default True)
# TypePrixEnum : reduction | gratuit | points | rejouer
```

### GainSpin

```python
id, client_id (FK), prix_id (FK), date_gain,
statut (StatutGainEnum: non_utilise | utilise),
points_avant, points_apres, nb_gains_ce_prix
```

### ConfigFidelite

```python
id, seuil_minimum_mad (80), points_par_tranche (5),
tranche_mad (20), cout_spin_points (100), points_avis_google (50)
```

### Notification

```python
id, message, type (info | alerte | annulation), lu (default False), date_heure
```

### ModificationCommande (historique KDS)

```python
id, commande_id (FK), ligne_id (FK nullable),
type (ajout|suppression|note|remplacement|rupture|annulation),
effectue_par (client|serveur|gerant|cuisinier),
description, montant_delta, stripe_action, created_at
```

### KDSAlerte

```python
id, commande_id (FK nullable), ligne_id (FK nullable),
type (rupture|annulation|note_modifiee|mauvaise_table|ajout),
message, acquittee (default False), created_at
```

### AvisClient

```python
id, nom, note (1-5), commentaire, statut (StatutAvisEnum),
sentiment (SentimentEnum nullable), date_depot, restaurant_id (FK)
```

### OTPVerification

```python
id, client_id (FK), code (6 chars), expire_at, utilise (default False), tentatives
```

### TokenConfirmationEmail

```python
id, token (unique), client_id (FK), expire_at, utilise (default False)
```

---

## 18. Tous les Enums

```python
class RoleEnum(str, enum.Enum):
    gerant = "gerant" | serveur = "serveur" | cuisinier = "cuisinier"

class StatutPlatEnum(str, enum.Enum):
    valide = "valide" | en_attente = "en_attente" | refuse = "refuse"

class StatutCommandeEnum(str, enum.Enum):
    en_cours | envoyee | en_preparation | prete | cloturee
    annulee | annulee_partielle       # statuts de commande
    rupture | remplacee               # statuts de ligne uniquement

class OrigineCommandeEnum(str, enum.Enum):
    serveur = "serveur" | qr_table = "qr_table"

class StatutTableEnum(str, enum.Enum):
    libre = "libre" | occupee = "occupee" | reservee = "reservee"

class EmplacementEnum(str, enum.Enum):
    interieur = "interieur" | terrasse = "terrasse" | mezzanine = "mezzanine"

class TypeReservationEnum(str, enum.Enum):
    standard = "standard" | local_prive = "local_prive"

class StatutReservationEnum(str, enum.Enum):
    en_attente = "en_attente" | confirmee = "confirmee" | annulee = "annulee"

class ModePaiementEnum(str, enum.Enum):
    especes | carte | google_pay | apple_pay | en_ligne

class StatutPaiementEnum(str, enum.Enum):
    en_attente | valide | rembourse | rembourse_partiel | impaye

class StatutAvisEnum(str, enum.Enum):
    en_attente = "en_attente" | valide = "valide" | rejete = "rejete"

class SentimentEnum(str, enum.Enum):
    positif = "positif" | neutre = "neutre" | negatif = "negatif"

class TypePrixEnum(str, enum.Enum):
    reduction = "reduction"   # % de réduction sur commande
    gratuit   = "gratuit"     # plat offert
    points    = "points"      # bonus de points
    rejouer   = "rejouer"     # spin gratuit

class StatutGainEnum(str, enum.Enum):
    utilise = "utilise" | non_utilise = "non_utilise"
```

---

## 19. Couche service API (api.js)

Instance Axios : `baseURL=''` (requêtes relatives), timeout=30000ms.

### Toutes les fonctions gérant

```javascript
// Auth
login(identifiant, code_passe)       // POST form-data /api/auth/login
getMe()                              // GET /api/auth/me
updateMyEmail(email)                 // PUT /api/auth/me/email
demanderCodeMdp()                    // POST /api/auth/demander-code-mdp
changerMdp(code, nouveau_mdp)        // POST /api/auth/changer-mdp

// Plats
getTousPlats()                       // GET /api/plats/admin/tous
getPropositions()                    // GET /api/plats/admin/propositions
creerPlatGerant(data)                // POST /api/plats/admin/creer
validerProposition(id, data)         // PUT /api/plats/admin/{id}/valider
modifierPlat(id, data)               // PUT /api/plats/admin/{id}
supprimerPlat(id)                    // DELETE /api/plats/admin/{id}
uploadImagePlat(platId, file)        // POST /api/plats/{id}/image (FormData)

// Nutrition
getNutrition(platId)                 // GET /api/nutrition/{platId}
setNutrition(platId, data)           // PUT /api/nutrition/{platId}
calculerNutrition(platId)            // POST /api/nutrition/{platId}/calculer

// Catégories
getCategories()                      // GET /api/categories/
creerCategorie(data)                 // POST /api/categories/
modifierCategorie(id, data)          // PUT /api/categories/{id}
supprimerCategorie(id)               // DELETE /api/categories/{id}

// Ingrédients
getIngredients()                     // GET /api/ingredients/
getAlertes()                         // GET /api/ingredients/alertes
creerIngredient(data)                // POST /api/ingredients/
modifierIngredient(id, data)         // PUT /api/ingredients/{id}
supprimerIngredient(id)              // DELETE /api/ingredients/{id}

// Commandes
toutesCommandes()                    // GET /api/commandes/
getRevenues(annee?)                  // GET /api/commandes/revenues
getNotifs()                          // GET /api/commandes/notifications/non-lues
marquerNotifLue(id)                  // PUT /api/commandes/notifications/{id}/lue
toutLireNotifs()                     // PUT /api/commandes/notifications/tout-lire

// Tables
getTables()                          // GET /api/tables/
creerTable(data)                     // POST /api/tables/
changerStatutTable(id, statut)       // PUT /api/tables/{id}/statut?statut={s}
supprimerTable(id)                   // DELETE /api/tables/{id}

// Réservations
getReservations()                    // GET /api/reservations/
confirmerReservation(id)             // PUT /api/reservations/{id}/confirmer
annulerReservation(id)               // PUT /api/reservations/{id}/annuler
verifierCodeAcces(code)              // GET /api/reservations/verifier-code/{code}

// Tombola
getTombolas()                        // GET /api/tombola/
creerTombola(data)                   // POST /api/tombola/creer
getParticipations(tombola_id?)       // GET /api/tombola/participations
validerAvis(id)                      // PUT /api/tombola/avis/{id}/valider
rejeterAvis(id)                      // PUT /api/tombola/avis/{id}/rejeter
tirageAuSort(tombolaId)              // POST /api/tombola/{id}/tirage

// Dashboard
getDashboard()                       // GET /api/dashboard/

// Employés
getEmployes()                        // GET /api/employes/
creerEmploye(data)                   // POST /api/employes/
toggleActifEmploye(id, actif)        // PUT /api/employes/{id}/actif?actif={bool}
modifierEmploye(id, data)            // PUT /api/employes/{id}

// Restaurant
getRestaurantInfo()                  // GET /api/restaurant/
updateRestaurantInfo(data)           // PUT /api/restaurant/

// Salles privées
getSalles()                          // GET /api/salles/
creerSalle(data)                     // POST /api/salles/
modifierSalle(id, data)              // PUT /api/salles/{id}
supprimerSalle(id)                   // DELETE /api/salles/{id}

// Offres & Candidatures
getOffres()                          // GET /api/emplois/
creerOffre(data)                     // POST /api/emplois/
modifierOffre(id, data)              // PUT /api/emplois/{id}
supprimerOffre(id)                   // DELETE /api/emplois/{id}
getCandidatures()                    // GET /api/emplois/candidatures
marquerCandidatureLue(id)            // PUT /api/emplois/candidatures/{id}/lue

// Avis clients
getAvisAdmin()                       // GET /api/avis-clients/admin
validerAvisClient(id)                // PUT /api/avis-clients/{id}/valider
rejeterAvisClient(id)                // PUT /api/avis-clients/{id}/rejeter

// Fidélité gérant
getGerantClients()                   // GET /api/gerant/clients
getGerantSpins()                     // GET /api/gerant/spins
marquerGainUtilise(id)               // PUT /api/gerant/spins/{id}/utiliser
getFideliteConfig()                  // GET /api/gerant/config-fidelite
updateFideliteConfig(data)           // PUT /api/gerant/config-fidelite
validerTelephoneClient(id)           // PUT /api/gerant/clients/{id}/valider-telephone
```

---

## 20. Conventions et patterns récurrents

### Pattern de chargement standard

```javascript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

async function load() {
  try {
    const r = await getXxx()
    setData(r.data)
  } catch { notify('Erreur', 'error') }
  finally { setLoading(false) }
}

useEffect(() => { load() }, [])
```

Spinner pendant chargement : `border-4 border-amber-500 border-t-transparent rounded-full animate-spin w-8 h-8`.

### Pattern modale (redéfini localement dans chaque page)

```jsx
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
```

### Pattern filtre pill-button (répété dans 5+ pages)

```jsx
<div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
  {options.map(([value, label]) => (
    <button key={value} onClick={() => setFilter(value)}
      className={filter === value
        ? 'px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-900 shadow-sm'
        : 'px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700'}>
      {label}
    </button>
  ))}
</div>
```

### Palette de couleurs cohérente

| Couleur | Usage |
|---------|-------|
| Amber (`#f59e0b`) | Couleur principale, boutons primaires, badges propositions |
| Green | Succès, validé, libre, actif |
| Red | Danger, suppression, refusé, occupé |
| Purple | Tombola, local privé, salle privée, gérant |
| Blue | Info, serveurs |
| Gray | Neutres, inactifs, annulés |

### Formatage montants

Tous les montants sont en **Dirhams (Dh)** :
```javascript
`${value.toFixed(2)} Dh`
// ou pour grands montants :
value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Dh'
```

### Clôture commande + fidélité + notifications

Lors de `POST /api/commandes/{id}/cloturer` :
1. `commande.statut = cloturee`
2. `table.statut = libre`
3. Recherche client par email/téléphone dans `clients_fidelite`
4. Calcul points : `(montant // tranche_mad) * points_par_tranche` (si montant >= seuil)
5. `client.points_solde += points`
6. Webhook n8n `http://localhost:5678/webhook/points-fidelite` en thread background (silencieux si échec)

### Déduction stock automatique (cuisinier)

Quand `PUT /api/commandes/ligne/{id}/statut` avec `statut = prete` :
```python
# Pour chaque ingrédient lié au plat :
ingredient.quantite_stock = max(0, ingredient.quantite_stock - lien.quantite * ligne.quantite)
# Si toutes les lignes sont prêtes → commande.statut = prete
```

### Génération code commande

```python
def generer_code_unique():
    today = datetime.now().strftime("%Y%m%d")
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"CMD-{today}-{suffix}"
# Ex: CMD-20260621-0042
```

---

*Documentation générée depuis le code source — 21 fichiers lus : pages Gerant*.jsx, api.js, App.jsx, security.py, models.py, et routes backend (plats, commandes, reservations, gerant_fidelite, ingredients_categories).*
