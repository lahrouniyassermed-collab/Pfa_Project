# Flux Cuisinier — Documentation exhaustive

**Projet :** MangerManger — Système de gestion de restaurant  
**Rôle documenté :** `cuisinier`  
**Pages concernées :** `CuisinierInterface.jsx` (KDS), `CuisinierProposer.jsx`  
**Date de rédaction :** 2026-06-21

---

## Sommaire

1. [Vue d'ensemble du rôle cuisinier](#1-vue-densemble-du-rôle-cuisinier)
2. [Authentification et sécurité](#2-authentification-et-sécurité)
3. [Navigation sidebar cuisinier](#3-navigation-sidebar-cuisinier)
4. [CuisinierInterface — Kitchen Display System (KDS)](#4-cuisinierinterface--kitchen-display-system-kds)
   - 4.1 [Fichier source et imports](#41-fichier-source-et-imports)
   - 4.2 [Header sticky avec compteurs live](#42-header-sticky-avec-compteurs-live)
   - 4.3 [Auto-polling toutes les 5 secondes](#43-auto-polling-toutes-les-5-secondes)
   - 4.4 [Grille responsive de commandes](#44-grille-responsive-de-commandes)
   - 4.5 [Composant CommandeCard](#45-composant-commandecard)
   - 4.6 [Timer d'urgence live](#46-timer-durgence-live)
   - 4.7 [Barre de progression par commande](#47-barre-de-progression-par-commande)
   - 4.8 [Workflow par plat (ligne de commande)](#48-workflow-par-plat-ligne-de-commande)
   - 4.9 [Bouton rupture de stock et remboursement Stripe](#49-bouton-rupture-de-stock-et-remboursement-stripe)
   - 4.10 [Overlay alertes KDS — 5 types](#410-overlay-alertes-kds--5-types)
   - 4.11 [Prise en charge exclusive par cuisinier](#411-prise-en-charge-exclusive-par-cuisinier)
   - 4.12 [Déduction automatique du stock](#412-déduction-automatique-du-stock)
   - 4.13 [États affichés et indicateurs visuels](#413-états-affichés-et-indicateurs-visuels)
   - 4.14 [Toast de retour utilisateur](#414-toast-de-retour-utilisateur)
   - 4.15 [Indicateur de connexion réseau](#415-indicateur-de-connexion-réseau)
5. [CuisinierProposer — Formulaire de proposition de plat](#5-cuisinierproposer--formulaire-de-proposition-de-plat)
   - 5.1 [Fichier source et imports](#51-fichier-source-et-imports)
   - 5.2 [Champs du formulaire](#52-champs-du-formulaire)
   - 5.3 [Gestion dynamique des ingrédients](#53-gestion-dynamique-des-ingrédients)
   - 5.4 [Soumission et validation](#54-soumission-et-validation)
   - 5.5 [Onglet Mes propositions](#55-onglet-mes-propositions)
   - 5.6 [Upload d'image — disponibilité backend vs UI](#56-upload-dimage--disponibilité-backend-vs-ui)
6. [API Routes utilisées par le cuisinier](#6-api-routes-utilisées-par-le-cuisinier)
   - 6.1 [Routes commandes (cuisine)](#61-routes-commandes-cuisine)
   - 6.2 [Routes modifications et KDS alertes](#62-routes-modifications-et-kds-alertes)
   - 6.3 [Routes plats (proposition)](#63-routes-plats-proposition)
   - 6.4 [Fonctions api.js correspondantes](#64-fonctions-apijs-correspondantes)
7. [Modèles de données impliqués](#7-modèles-de-données-impliqués)
   - 7.1 [Modèle Commande](#71-modèle-commande)
   - 7.2 [Modèle LigneCommande](#72-modèle-lignecommande)
   - 7.3 [Modèle Plat](#73-modèle-plat)
   - 7.4 [Modèle KDSAlerte](#74-modèle-kdsalerte)
   - 7.5 [Modèle ModificationCommande](#75-modèle-modificationcommande)
   - 7.6 [Enums pertinents](#76-enums-pertinents)
8. [Cycle de vie complet d'une commande en cuisine](#8-cycle-de-vie-complet-dune-commande-en-cuisine)
9. [Backend — Routes détaillées commandes](#9-backend--routes-détaillées-commandes)
10. [Backend — Routes détaillées modifications et alertes](#10-backend--routes-détaillées-modifications-et-alertes)
11. [Backend — Routes détaillées plats (cuisinier)](#11-backend--routes-détaillées-plats-cuisinier)
12. [Système d'alertes KDS — Architecture complète](#12-système-dalertes-kds--architecture-complète)
13. [IA Vision — Implication dans le flux cuisinier](#13-ia-vision--implication-dans-le-flux-cuisinier)
14. [Routage React et protection d'accès](#14-routage-react-et-protection-daccès)
15. [Récapitulatif des fichiers clés](#15-récapitulatif-des-fichiers-clés)

---

## 1. Vue d'ensemble du rôle cuisinier

Le cuisinier est un des trois rôles d'employé du système (avec `gerant` et `serveur`). Son espace de travail comprend deux pages distinctes accessibles sous le préfixe `/cuisinier` :

| URL | Page | Description |
|-----|------|-------------|
| `/cuisinier` | `CuisinierInterface` | KDS (Kitchen Display System) — vision temps réel des commandes |
| `/cuisinier/proposer` | `CuisinierProposer` | Formulaire de proposition d'un nouveau plat au menu |

Le rôle `cuisinier` est stocké dans la colonne `role` de la table `employes` via l'enum SQLAlchemy `RoleEnum.cuisinier`. Seules les routes protégées par `require_role("cuisinier")` ou `require_role("cuisinier", "gerant")` sont accessibles.

---

## 2. Authentification et sécurité

### Backend — `app/core/security.py`

L'authentification repose sur JWT (python-jose) avec hachage bcrypt (passlib). Le token est créé au login et transmis dans chaque requête via le header `Authorization: Bearer <token>`.

```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password.encode("utf-8")[:72].decode("utf-8", errors="ignore"))

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.encode("utf-8")[:72].decode("utf-8", errors="ignore"), hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

### Décorateur `require_role`

```python
def require_role(*roles):
    def checker(current_user=Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return current_user
    return checker
```

Application sur les routes cuisinier :
- `require_role("cuisinier")` — exclusif cuisinier
- `require_role("cuisinier", "gerant")` — cuisinier ou gérant
- `require_role("cuisinier", "serveur", "gerant")` — tous les employés

### Frontend — Intercepteur Axios

Dans `frontend/src/services/api.js`, un intercepteur gère les erreurs 401 et redirige selon le type d'utilisateur (employé → `/login`, client → `/client/login`) :

```javascript
const api = axios.create({ baseURL: '', timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = _storageGet('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      _storageRemove('token')
      _storageRemove('user')
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

### Frontend — ProtectedRoute

La route `/cuisinier` est enveloppée dans un composant `ProtectedRoute` qui vérifie que `user.role === 'cuisinier'`. Tout accès sans token valide ou avec un rôle incorrect redirige vers `/login`.

```jsx
// App.jsx
<Route
  path="/cuisinier"
  element={
    <ProtectedRoute roles={['cuisinier']}>
      <Layout role="cuisinier" />
    </ProtectedRoute>
  }
>
  <Route index element={<CuisinierInterface />} />
  <Route path="proposer" element={<CuisinierProposer />} />
</Route>
```

---

## 3. Navigation sidebar cuisinier

Le composant `Layout.jsx` (`frontend/src/components/shared/Layout.jsx`) génère une sidebar noire (bg-gray-900, largeur 240px) avec des liens NavLink. Pour le rôle `cuisinier`, la liste de navigation est la suivante :

```javascript
const CUISINIER_NAV = [
  {
    to: '/cuisinier', end: true, label: 'Commandes',
    icon: /* icône liste de tâches SVG */,
  },
  {
    to: '/cuisinier/proposer', label: 'Proposer un plat',
    icon: /* icône croix (plus) SVG */,
  },
]
```

### Caractéristiques de la sidebar cuisinier

- **Fond :** `bg-gray-900`
- **Lien actif :** `bg-amber-500 text-white` (fond ambre, texte blanc)
- **Lien inactif :** `text-gray-400 hover:text-white hover:bg-gray-800`
- **Logo :** "MangerManger" en blanc, sous-titre "cuisinier" en gris
- **Pied de sidebar :** prénom + nom + identifiant du cuisinier connecté + bouton déconnexion
- **Notifications :** le composant `NotifBell` n'est affiché que pour le rôle `gerant` — les cuisiniers ne voient pas cet élément

```jsx
{/* Notifications (gérant seulement) */}
{role === 'gerant' && <NotifBell />}
```

La sidebar est commune aux rôles gérant, serveur et cuisinier. Elle est rendue via le composant `Layout` qui utilise `<Outlet />` pour afficher le contenu de la page active à droite.

---

## 4. CuisinierInterface — Kitchen Display System (KDS)

### 4.1 Fichier source et imports

**Chemin :** `frontend/src/pages/CuisinierInterface.jsx`

```javascript
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getCommandesCuisine,
  majStatutCommande,
  majStatutLigne,
  getKDSAlertes,
  acquitterAlerte,
  ruptureStock
} from '../services/api'
import {
  Wifi, WifiOff, RefreshCw, ChefHat, Clock, AlertTriangle,
  CheckCircle2, Flame, X, BellRing
} from 'lucide-react'
```

La page importe **6 fonctions API** et **11 icônes** de la bibliothèque `lucide-react`.

### 4.2 Header sticky avec compteurs live

Le header est positionné en `sticky top-0 z-30` avec un fond semi-transparent `bg-[#0d1117]/95 backdrop-blur`. Il contient trois zones :

**Zone gauche — Logo KDS :**
- Carré ambré dégradé (`from-amber-400 to-amber-600`) avec icône `ChefHat`
- Texte "MANGERMANGER" en amber-400, sous-titre "Kitchen Display" (caché sur mobile via `hidden sm:block`)

**Zone centrale — Compteurs dynamiques (3 badges) :**

| Badge | Couleur | Contenu | Logique de calcul |
|-------|---------|---------|-------------------|
| Nouvelles | Bleu (`bg-blue-500/10`, point animé) | `N nouvelle(s)` | `commandes.filter(c => c.statut === 'envoyee').length` |
| En prépa | Ambre (`bg-amber-500/10`, icône Flame) | `N en prépa` | `commandes.filter(c => c.statut === 'en_preparation').length` |
| Prêtes | Vert (`bg-emerald-500/10`, icône CheckCircle2) | `N prête(s)` | `commandes.filter(c => c.lignes.every(l => l.statut === 'prete') && c.lignes.length > 0).length` |

Le pluriel est géré dynamiquement : `nouvelle{nbEnAttente > 1 ? 's' : ''}`.

**Zone droite :**
- Compteur d'alertes KDS non acquittées (rouge, icône BellRing animée en bounce) — visible uniquement si `alertes.length > 0`
- Indicateur Wifi : icône `Wifi` verte si connecté, `WifiOff` rouge pulsante si déconnecté
- Horloge live (`LiveClock`) — format `HH:MM:SS` en français, mise à jour chaque seconde
- Bouton rafraîchissement manuel (icône `RefreshCw`)

```jsx
<header className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur border-b border-gray-800 px-5 py-3 flex items-center justify-between gap-4">
  {/* ... contenu ... */}
</header>
```

### 4.3 Auto-polling toutes les 5 secondes

Le KDS se met à jour automatiquement sans rechargement de page grâce à un `setInterval` de 5000 ms :

```javascript
useEffect(() => {
  load()
  const id = setInterval(() => load(true), 5000)
  return () => clearInterval(id)
}, [load])
```

La fonction `load` accepte un paramètre `silent` : si `true`, elle ne déclenche pas l'état de chargement (`setLoading(false)`) — ce qui évite le clignotement de l'interface lors des mises à jour silencieuses en arrière-plan.

Chaque cycle de polling effectue **deux requêtes en parallèle** via `Promise.all` :

```javascript
const load = useCallback(async (silent = false) => {
  if (!silent) setLoading(true)
  try {
    const [rc, ra] = await Promise.all([getCommandesCuisine(), getKDSAlertes()])
    setCommandes(rc.data)
    setAlertes(ra.data)
    setOnline(true)
    setLastSync(new Date())
  } catch {
    setOnline(false)
  } finally {
    setLoading(false)
  }
}, [])
```

En cas d'erreur réseau, `setOnline(false)` est appelé, ce qui déclenche l'affichage du badge WifiOff rouge dans le header. La dernière synchronisation réussie est mémorisée dans `lastSync` et affichée dans l'état vide.

### 4.4 Grille responsive de commandes

Les commandes sont affichées dans une grille CSS adaptative selon la taille d'écran :

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {commandes.map(cmd => (
    <CommandeCard key={cmd.id} cmd={cmd} ... />
  ))}
</div>
```

| Breakpoint | Colonnes |
|-----------|----------|
| Mobile (`< 640px`) | 1 colonne |
| Tablette (`≥ 640px`, `sm:`) | 2 colonnes |
| Grand écran (`≥ 1024px`, `lg:`) | 3 colonnes |
| Très grand écran (`≥ 1280px`, `xl:`) | 4 colonnes |

**États d'affichage alternatifs :**

- **Chargement initial :** spinner ambre centré + texte "Chargement des commandes…"
- **Hors ligne + aucune commande :** icône WifiOff rouge, message "Connexion perdue", lien "Réessayer"
- **Aucune commande :** carré gris avec icône `ChefHat`, texte "Cuisine libre", heure de dernière synchro

### 4.5 Composant CommandeCard

Composant fonctionnel `CommandeCard({ cmd, onStartCommande, onMarkLigne, onRupture, loadingLines })`.

**Structure de la carte (flex-col) :**
1. Header de la commande (couleur selon statut)
2. Corps — liste des lignes (plats)
3. Footer — bouton "Prendre en charge" (si statut `envoyee` seulement)

**Couleurs dynamiques selon statut :**

| Condition | Bordure | Header |
|-----------|---------|--------|
| Tous plats prêts | `border-emerald-500/50` | `bg-emerald-900/40` |
| `en_preparation` | `border-amber-500/40` | `bg-amber-900/30` |
| `envoyee` (nouvelle) | `border-blue-500/40` | `bg-blue-900/30` |

Quand tous les plats sont prêts, un glow vert est ajouté : `shadow-[0_0_20px_rgba(52,211,153,0.15)]`.

Si la commande est urgente (>15 min) et non terminée : `ring-1 ring-red-500/40`.

**En-tête de la carte :**

```jsx
<div className="flex items-start justify-between gap-2">
  {/* Numéro de table en gras (T3, T7...) */}
  <span className="text-white font-black text-2xl leading-none">T{cmd.table.numero}</span>

  {/* Badge emplacement */}
  {empl && (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${empl.cls}`}>
      {empl.label}
    </span>
  )}

  {/* Badge QR si origine qr_table */}
  {cmd.origine === 'qr_table' && (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
      📱 QR
    </span>
  )}

  {/* Timer live */}
  <Timer dateHeure={cmd.date_heure} />
</div>
```

**Badges emplacement (`EMPL`) :**

```javascript
const EMPL = {
  interieur:  { label: 'Intérieur',  cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  terrasse:   { label: 'Terrasse',   cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  mezzanine:  { label: 'Mezzanine',  cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}
```

**Indicateurs de statut sous le timer :**
- Code unique de commande en monospace gris (`CMD-20260621-0042`)
- "Tout prêt" + icône CheckCircle2 verte (si toutes les lignes à `prete`)
- Icône Flame + "En préparation" ambre (si `en_preparation` mais pas tout prêt)
- "Nouvelle" en bleu (si statut `envoyee`)
- Barre de progression

### 4.6 Timer d'urgence live

Composant `Timer({ dateHeure })` — se met à jour toutes les secondes via `setInterval(1000)`.

**Logique de calcul :**

```javascript
function calc() {
  const diff = Math.floor((Date.now() - new Date(dateHeure).getTime()) / 1000)
  setMins(Math.floor(diff / 60))
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}
```

**Seuils de couleur :**

| Durée | Couleur | Icône |
|-------|---------|-------|
| < 8 min | `text-gray-400` | `Clock` |
| 8–14 min | `text-amber-400` | `Clock` |
| ≥ 15 min | `text-red-400` | `AlertTriangle` (pulsant) |

**Label URGENT :** quand `mins >= 15`, le mot "URGENT" apparaît à côté du timer en rouge gras avec animation `animate-pulse` et `tracking-widest`.

```jsx
const color = mins >= 15 ? 'text-red-400' : mins >= 8 ? 'text-amber-400' : 'text-gray-400'
const urgent = mins >= 15

return (
  <div className={`flex items-center gap-1.5 ${color}`}>
    {urgent
      ? <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
      : <Clock className="w-3.5 h-3.5" />
    }
    <span className="text-xs font-bold tabular-nums">{elapsed}</span>
    {urgent && <span className="text-xs font-black tracking-widest animate-pulse">URGENT</span>}
  </div>
)
```

### 4.7 Barre de progression par commande

Composant `ProgressBar({ lignes })` — calcule le pourcentage de plats terminés.

```javascript
function ProgressBar({ lignes }) {
  const total  = lignes.length
  const done   = lignes.filter(l => l.statut === 'prete').length
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0
  const color  = pct === 100 ? 'bg-emerald-400' : pct > 0 ? 'bg-amber-400' : 'bg-gray-600'

  return (
    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`}
           style={{ width: `${pct}%` }} />
    </div>
  )
}
```

| % complété | Couleur barre |
|-----------|--------------|
| 0% | Grise (`bg-gray-600`) |
| 1–99% | Ambre (`bg-amber-400`) |
| 100% | Verte (`bg-emerald-400`) |

La transition CSS `duration-500` assure une animation fluide lors de chaque mise à jour.

### 4.8 Workflow par plat (ligne de commande)

Chaque ligne de commande dans la carte affiche :

1. **Quantité × Nom du plat** — avec badge quantité (fond vert si prêt, gris sinon)
2. **Note de personnalisation** — si présente, affichée sur fond ambre/marron avec emoji 📝
3. **Statut textuel** — "En attente", "En préparation…", "✓ Prêt", "✕ ANNULÉ", "⛔ RUPTURE", "→ REMPLACÉ"
4. **Boutons d'action** — visibles uniquement si le plat n'est pas encore prêt, annulé, en rupture ou remplacé

**Workflow en deux étapes par plat :**

| Étape | Statut actuel | Action | Nouveau statut | Bouton |
|-------|--------------|--------|---------------|--------|
| 1 | `en_cours` | Cliquer ▶ | `en_preparation` | Ambre, ▶ |
| 2 | `en_preparation` | Cliquer ✓ | `prete` | Vert, ✓ |

```jsx
<button
  onClick={() => onMarkLigne(l.id, l.statut)}
  disabled={isLoading}
  className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm
    transition-all active:scale-95 disabled:opacity-50 ${
    isInPrep
      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
      : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)]'
  }`}
>
  {isLoading
    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
    : isInPrep ? '✓' : '▶'
  }
</button>
```

**Protection anti-double-clic :** Un `Set` de `loadingLines` mémorise les IDs des lignes en cours de requête. Le bouton est désactivé (`disabled`) pendant la requête, remplacé par un spinner CSS.

```javascript
const [loadingLines, setLoadingLines] = useState(new Set())

async function handleMarkLigne(id, currentStatut) {
  const next = currentStatut === 'en_cours' ? 'en_preparation' : 'prete'
  setLoadingLines(prev => new Set(prev).add(id))
  try {
    await majStatutLigne(id, next)
    load(true)
  } catch (e) {
    notify(e.response?.data?.detail || 'Erreur', 'error')
  } finally {
    setLoadingLines(prev => { const s = new Set(prev); s.delete(id); return s })
  }
}
```

**Styles des lignes selon statut :**

| Statut | Fond | Bordure | Opacité | Texte nom |
|--------|------|---------|---------|-----------|
| `annulee` ou `rupture` | `bg-red-900/20` | `border-red-700/30` | 60% | Rouge barré |
| `remplacee` | `bg-purple-900/20` | `border-purple-700/30` | 50% | Violet barré |
| `prete` | `bg-emerald-900/20` | `border-emerald-700/30` | 100% | Vert barré |
| `en_preparation` | `bg-amber-900/20` | `border-amber-700/30` | 100% | Blanc |
| `en_cours` | `bg-[#0d1117]` | `border-gray-700/50` | 100% | Blanc |

### 4.9 Bouton rupture de stock et remboursement Stripe

Chaque ligne active (non prête, non annulée, non en rupture, non remplacée) affiche un bouton ⛔ rouge compact en dessous du bouton principal :

```jsx
<button
  onClick={() => onRupture(l.id)}
  title="Rupture de stock"
  className="shrink-0 flex items-center justify-center w-10 h-7 rounded-lg bg-red-900/60 hover:bg-red-700 text-red-300 text-xs font-bold transition-all"
>
  ⛔
</button>
```

**Handler frontend :**

```javascript
async function handleRupture(ligneId) {
  try {
    await ruptureStock(ligneId)
    notify('Rupture signalée — remboursement déclenché')
    load(true)
  } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
}
```

**Appel API :** `PUT /api/modifications/lignes/{ligne_id}/rupture`

**Traitement backend** (dans `modifications_commande.py`) :

```python
@router.put("/lignes/{ligne_id}/rupture")
def rupture_stock(ligne_id: int, db: Session = Depends(get_db),
                  _=Depends(require_role("cuisinier", "serveur", "gerant"))):
    ligne = _get_ligne_or_404(db, ligne_id)
    if ligne.statut == StatutCommandeEnum.prete:
        raise HTTPException(400, "Ce plat est déjà prêt.")

    montant = ligne.prix_unitaire * ligne.quantite
    ligne.statut = StatutCommandeEnum.rupture
    ligne.motif_annulation = "Rupture de stock"
    ligne.commande.flag_urgent = 1

    # Remboursement automatique Stripe
    refund_id = None
    if ligne.commande.paiement:
        refund_id = _remboursement_stripe(ligne.commande.paiement, montant)

    ligne.commande.montant_total = max(0, (ligne.commande.montant_total or 0) - montant)
    _recalc_statut_commande(db, ligne.commande)

    # Alerte KDS générée automatiquement
    _alerte(db, "rupture", f"RUPTURE: {nom}", commande_id=ligne.commande_id, ligne_id=ligne_id)
    ...
```

La fonction `_remboursement_stripe` effectue un remboursement Stripe partiel uniquement si le paiement a été fait par carte et que la référence de transaction existe :

```python
def _remboursement_stripe(paiement: Paiement, montant: float) -> Optional[str]:
    if not paiement or paiement.mode != ModePaiementEnum.carte:
        return None
    if not paiement.reference_transaction or paiement.reference_transaction.startswith("ESPECES"):
        return None
    try:
        pi = stripe.PaymentIntent.retrieve(paiement.reference_transaction)
        if pi.status != "succeeded": return None
        refund = stripe.Refund.create(
            payment_intent=paiement.reference_transaction,
            amount=int(montant * 100),  # en centimes
        )
        # Mise à jour du statut paiement (rembourse ou rembourse_partiel)
        ...
        return refund.id
    except stripe.error.StripeError:
        return None
```

### 4.10 Overlay alertes KDS — 5 types

Les alertes KDS non acquittées sont affichées en **superposition fixe** en haut à droite (`fixed top-20 right-4 z-50`), empilées verticalement, largeur maximale 320px.

**5 types d'alertes et leur configuration :**

```javascript
const cfg = {
  rupture:        { bg: 'bg-red-900 border-red-500',     icon: '⛔', label: 'RUPTURE'  },
  annulation:     { bg: 'bg-red-800 border-red-400',     icon: '✕',  label: 'ANNULÉ'   },
  note_modifiee:  { bg: 'bg-amber-900 border-amber-400', icon: '⚠',  label: 'NOTE'     },
  mauvaise_table: { bg: 'bg-purple-900 border-purple-400',icon: '⚡', label: 'VÉRIFIER' },
  ajout:          { bg: 'bg-blue-900 border-blue-400',   icon: '+',  label: 'AJOUT'    },
}[a.type] || { bg: 'bg-gray-800 border-gray-600', icon: '!', label: 'ALERTE' }
```

| Type | Déclencheur | Couleur | Icône |
|------|------------|---------|-------|
| `rupture` | Cuisinier signale une rupture stock | Rouge foncé | ⛔ |
| `annulation` | Serveur/gérant annule une ligne ou commande | Rouge vif | ✕ |
| `note_modifiee` | Serveur modifie la note d'un plat en cours | Ambre | ⚠ |
| `mauvaise_table` | Un plat prêt est ré-ouvert (annuler_prete) | Violet | ⚡ |
| `ajout` | Serveur ajoute un plat après envoi cuisine | Bleu | + |

Chaque alerte comporte un bouton ✕ pour l'acquitter individuellement. Si plusieurs alertes sont présentes, un bouton "Tout acquitter (N)" apparaît en bas.

```jsx
{alertes.length > 1 && (
  <button
    onClick={() => Promise.all(alertes.map(a => acquitterAlerte(a.id))).then(() => setAlertes([]))}
    className="text-xs text-gray-500 hover:text-white text-center py-1"
  >
    Tout acquitter ({alertes.length})
  </button>
)}
```

**Acquittement :** `PUT /api/modifications/kds/alertes/{id}/acquitter` — passe `alerte.acquittee = True` en base. Les alertes acquittées ne sont plus récupérées au prochain polling.

### 4.11 Prise en charge exclusive par cuisinier

Quand une commande a le statut `envoyee`, un bouton "Prendre en charge" apparaît en bas de la carte :

```jsx
{cmd.statut === 'envoyee' && (
  <div className="px-3 pb-3">
    <button
      onClick={() => onStartCommande(cmd.id)}
      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all text-sm shadow-[0_0_16px_rgba(251,191,36,0.25)]"
    >
      <Flame className="w-4 h-4" />
      Prendre en charge
    </button>
  </div>
)}
```

**Appel API :** `PUT /api/commandes/{id}/statut?statut=en_preparation`

**Backend — mécanisme d'assignation exclusive :**

```python
@router.put("/{commande_id}/statut")
def maj_statut_commande(
    commande_id: int, statut: str,
    db: Session = Depends(get_db), user=Depends(require_role("cuisinier", "gerant"))
):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    ...
    # Quand un cuisinier prend en charge → on l'assigne
    if new_statut == StatutCommandeEnum.en_preparation and commande.cuisinier_id is None:
        commande.cuisinier_id = user.id

    commande.statut = new_statut
    db.commit()
```

**Filtre de visibilité côté cuisine :**

```python
@router.get("/cuisine")
def commandes_cuisine(db: Session = Depends(get_db), user=Depends(require_role("cuisinier", "gerant"))):
    commandes = db.query(Commande).filter(
        # Nouvelles commandes visibles par tous
        (Commande.statut == StatutCommandeEnum.envoyee) |
        # Commandes en préparation uniquement par leur cuisinier assigné
        ((Commande.statut == StatutCommandeEnum.en_preparation) & (Commande.cuisinier_id == user.id))
    ).order_by(Commande.date_heure).all()
```

Cela signifie qu'une commande déjà prise en charge par le cuisinier A n'est **plus visible** par le cuisinier B. La commande appartient exclusivement à celui qui a cliqué "Prendre en charge" en premier.

### 4.12 Déduction automatique du stock

Lorsqu'un cuisinier marque un plat comme prêt (`statut = 'prete'`), le backend déduit automatiquement les ingrédients du stock :

```python
@router.put("/ligne/{ligne_id}/statut")
def maj_statut_ligne(ligne_id: int, statut: str,
                     db: Session = Depends(get_db), _=Depends(require_role("cuisinier", "gerant"))):
    ligne = db.query(LigneCommande).filter(LigneCommande.id == ligne_id).first()
    nouveau_statut = StatutCommandeEnum(statut)

    # Déduire les ingrédients quand le cuisinier marque le plat comme prêt
    if nouveau_statut == StatutCommandeEnum.prete and ligne.statut != StatutCommandeEnum.prete:
        liens = db.query(PlatIngredient).filter(PlatIngredient.plat_id == ligne.plat_id).all()
        for lien in liens:
            ingredient = db.query(Ingredient).filter(Ingredient.id == lien.ingredient_id).first()
            if ingredient:
                # Déduction proportionnelle à la quantité commandée
                ingredient.quantite_stock = max(0, ingredient.quantite_stock - lien.quantite * ligne.quantite)
```

La déduction respecte la règle `max(0, ...)` pour éviter un stock négatif. La quantité déduite est `lien.quantite * ligne.quantite` (quantité requise par portion × nombre de portions commandées).

**Passage automatique en `prete` de la commande entière :**

```python
# Si toutes les lignes sont prêtes → commande passe en "prete"
if nouveau_statut == StatutCommandeEnum.prete:
    commande = db.query(Commande).filter(Commande.id == ligne.commande_id).first()
    if commande:
        toutes_prets = all(
            l.statut == StatutCommandeEnum.prete
            for l in commande.lignes
        )
        if toutes_prets:
            commande.statut = StatutCommandeEnum.prete
```

Quand la commande passe en `prete`, elle disparaît de la vue cuisine au prochain polling (la requête `/cuisine` ne retourne que les statuts `envoyee` et `en_preparation`).

### 4.13 États affichés et indicateurs visuels

**Résumé des couleurs d'interface par statut de commande :**

| Statut commande | Bordure carte | Header | Glow | Description |
|----------------|--------------|--------|------|-------------|
| `envoyee` | Bleu (`border-blue-500/40`) | `bg-blue-900/30` | Non | Nouvelle, personne ne l'a prise |
| `en_preparation` | Ambre (`border-amber-500/40`) | `bg-amber-900/30` | Non | Prise en charge, en cours |
| Tous prêts | Vert (`border-emerald-500/50`) | `bg-emerald-900/40` | Oui, vert | Tous plats marqués prêts |

**Résumé des couleurs d'interface par statut de ligne :**

| Statut ligne | Fond ligne | Texte nom | Boutons |
|-------------|-----------|-----------|---------|
| `en_cours` | Sombre neutre | Blanc | ▶ ambre + ⛔ rouge |
| `en_preparation` | Ambre | Blanc | ✓ vert + ⛔ rouge |
| `prete` | Vert | Vert barré | Aucun |
| `annulee` | Rouge | Rouge barré | Aucun |
| `rupture` | Rouge | Rouge barré | Aucun |
| `remplacee` | Violet | Violet barré | Aucun |

### 4.14 Toast de retour utilisateur

Un système de toast bottom-right fournit un retour visuel instantané après chaque action :

```javascript
const toastRef = useRef(null)

const notify = (msg, type = 'success') => {
  clearTimeout(toastRef.current)
  setToast({ msg, type })
  toastRef.current = setTimeout(() => setToast(null), 2800)  // disparaît après 2,8s
}
```

**Styles des toasts :**

```jsx
{toast && (
  <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
    text-sm font-semibold shadow-2xl backdrop-blur ${
    toast.type === 'error'
      ? 'bg-red-500/90 text-white'    // Rouge pour erreur
      : 'bg-emerald-500/90 text-white' // Vert pour succès
  }`}>
    {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
  </div>
)}
```

Exemples de messages :
- `'Commande prise en charge'` (succès, après handleStartCommande)
- `'Rupture signalée — remboursement déclenché'` (succès, après handleRupture)
- `'Erreur'` ou le message `detail` de l'API (erreur)

### 4.15 Indicateur de connexion réseau

L'état `online` est géré par le catch du polling. L'icône dans le header change en temps réel :

```jsx
{online
  ? <Wifi className="w-4 h-4 text-emerald-400" />
  : <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
}
```

Quand la connexion est perdue et qu'il n'y a aucune commande en mémoire, l'interface affiche un état d'erreur complet avec bouton "Réessayer".

---

## 5. CuisinierProposer — Formulaire de proposition de plat

### 5.1 Fichier source et imports

**Chemin :** `frontend/src/pages/CuisinierProposer.jsx`

```javascript
import { useEffect, useState } from 'react'
import { proposerPlat, mesPropositions, getCategories, getIngredients } from '../services/api'
```

**4 appels API** au chargement : catégories, ingrédients, et propositions existantes du cuisinier.

### 5.2 Champs du formulaire

La page est structurée en deux colonnes sur grand écran (`grid grid-cols-1 lg:grid-cols-2 gap-8`) :
- Colonne gauche : formulaire de création
- Colonne droite : liste "Mes propositions"

**Champs du formulaire (objet `form`) :**

```javascript
const EMPTY = { nom: '', description: '', prix: '', categorie_id: '' }
```

| Champ | Type HTML | Obligatoire | Validation |
|-------|-----------|-------------|------------|
| `nom` | `input[text]` | Oui | Non vide |
| `description` | `textarea` (3 lignes) | Non | Aucune |
| `prix` | `input[number]` step 0.01 min 0 | Oui | Non vide, converti en float |
| `categorie_id` | `select` | Oui | Doit être sélectionné |

**Validation côté frontend :**

```javascript
async function submit(e) {
  e.preventDefault()
  if (!form.nom || !form.prix || !form.categorie_id) {
    return notify('Nom, prix et catégorie sont requis', 'error')
  }
  // ...
}
```

**Cas d'absence de catégories :**

```jsx
{categories.length === 0 ? (
  <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 text-sm text-amber-700">
    Aucune catégorie — demande au gérant d'en créer dans Menu &gt; Catégories
  </div>
) : (
  <select value={form.categorie_id} onChange={...} required>
    <option value="">— Choisir —</option>
    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
  </select>
)}
```

Si aucune catégorie n'existe, un message en ambre guide le cuisinier vers la solution (demander au gérant).

### 5.3 Gestion dynamique des ingrédients

Les ingrédients sont gérés comme un tableau de lignes (`ingLines`), chaque ligne ayant un `ingredient_id` et une `quantite` :

```javascript
const [ingLines, setIngLines] = useState([])
```

**Ajouter une ligne :**

```jsx
<button
  type="button"
  onClick={() => setIngLines([...ingLines, { ingredient_id: '', quantite: '' }])}
>
  + Ajouter
</button>
```

**Chaque ligne de la liste :**

```jsx
{ingLines.map((line, i) => (
  <div key={i} className="flex gap-2 mb-2">
    <select
      value={line.ingredient_id}
      onChange={e => {
        const n = [...ingLines]
        n[i].ingredient_id = e.target.value
        setIngLines(n)
      }}
    >
      <option value="">— Ingrédient —</option>
      {ingredients.map(ing => (
        <option key={ing.id} value={ing.id}>{ing.nom} ({ing.unite || 'u'})</option>
      ))}
    </select>
    <input type="number" step="0.1" min="0" placeholder="Qté" value={line.quantite} ... />
    <button type="button" onClick={() => setIngLines(ingLines.filter((_, j) => j !== i))}>×</button>
  </div>
))}
```

Le select affiche le nom de chaque ingrédient avec son unité entre parenthèses (ex: "Agneau (kg)").

**Sérialisation pour l'API :** les lignes incomplètes (sans `ingredient_id` ou `quantite`) sont filtrées avant envoi :

```javascript
ingredients: ingLines
  .filter(l => l.ingredient_id && l.quantite)
  .map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantite: parseFloat(l.quantite) }))
```

**Cas d'absence d'ingrédients :** le bouton "+ Ajouter" est masqué et un message gris italique informe que le gérant doit créer des ingrédients.

### 5.4 Soumission et validation

```javascript
async function submit(e) {
  e.preventDefault()
  if (!form.nom || !form.prix || !form.categorie_id) {
    return notify('Nom, prix et catégorie sont requis', 'error')
  }
  setSaving(true)
  try {
    await proposerPlat({
      nom: form.nom,
      description: form.description,
      prix: parseFloat(form.prix),
      categorie_id: parseInt(form.categorie_id),
      ingredients: ingLines
        .filter(l => l.ingredient_id && l.quantite)
        .map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantite: parseFloat(l.quantite) })),
    })
    notify('Proposition envoyée au gérant !')
    setForm(EMPTY)    // Réinitialiser le formulaire
    setIngLines([])   // Réinitialiser les ingrédients
    load()            // Rafraîchir la liste des propositions
  } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  finally { setSaving(false) }
}
```

Pendant l'envoi, le bouton affiche "Envoi en cours…" et est désactivé (`disabled={saving}`).

**Réinitialisation :** après un envoi réussi, le formulaire est entièrement réinitialisé et la liste des propositions est rechargée pour afficher immédiatement la nouvelle entrée en statut `en_attente`.

### 5.5 Onglet Mes propositions

La liste "Mes propositions" est affichée dans la colonne droite. Elle montre toutes les propositions du cuisinier connecté, avec :

**Configuration des badges de statut :**

```javascript
const STATUT_CONFIG = {
  en_attente: { label: 'En attente',  color: 'bg-amber-100 text-amber-700' },
  valide:     { label: 'Validé ✓',   color: 'bg-green-100 text-green-700' },
  refuse:     { label: 'Refusé',     color: 'bg-red-100 text-red-700'     },
}
```

**Structure d'une carte de proposition :**

```jsx
<div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
  <div className="flex items-start justify-between">
    <div>
      <p className="font-semibold text-gray-900">{p.nom}</p>
      {p.description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
      )}
      <p className="text-sm font-bold text-amber-600 mt-2">{p.prix?.toFixed(2)} Dh</p>
    </div>
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-2 ${sc.color}`}>
      {sc.label}
    </span>
  </div>
  {/* Motif de refus en bloc rouge */}
  {p.statut === 'refuse' && p.motif_refus && (
    <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      <p className="text-xs text-red-600">
        <span className="font-semibold">Motif : </span>{p.motif_refus}
      </p>
    </div>
  )}
</div>
```

**Motif de refus :** quand le gérant refuse une proposition avec un motif, ce motif est affiché dans un bloc rouge clair sous la carte. Cela permet au cuisinier de comprendre pourquoi sa proposition a été rejetée et de la corriger.

### 5.6 Upload d'image — disponibilité backend vs UI

**Backend :** La route `POST /api/plats/{plat_id}/image` existe et est fonctionnelle. Elle accepte un fichier multipart et stocke l'image dans `uploads/plats/`.

```python
@router.post("/{plat_id}/image")
async def upload_image(plat_id: int, file: UploadFile = File(...),
                       db: Session = Depends(get_db), _=Depends(get_current_user)):
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{UPLOAD_DIR}/{filename}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    plat.image = path
    db.commit()
    return {"image_url": path}
```

**Frontend :** La fonction `uploadImagePlat(platId, file)` existe dans `api.js` mais n'est **pas intégrée** dans `CuisinierProposer.jsx`. Il n'y a pas de champ d'upload d'image dans le formulaire de proposition.

```javascript
// api.js — disponible mais non utilisé dans CuisinierProposer
export const uploadImagePlat = (platId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/api/plats/${platId}/image`, form)
}
```

**Conclusion :** L'upload d'image pour les propositions cuisinier est une **fonctionnalité incomplète**. Le backend est prêt, le helper API existe, mais le formulaire UI ne l'expose pas encore. Une intégration future nécessiterait d'ajouter un `<input type="file">` dans `CuisinierProposer.jsx` et d'appeler `uploadImagePlat` après la création du plat.

---

## 6. API Routes utilisées par le cuisinier

### 6.1 Routes commandes (cuisine)

Toutes sous le préfixe `/api/commandes` — `backend/app/api/routes/commandes.py`.

| Méthode | URL | Rôles autorisés | Description |
|---------|-----|-----------------|-------------|
| `GET` | `/api/commandes/cuisine` | `cuisinier`, `gerant` | Récupère les commandes visibles par ce cuisinier (envoyees + ses en_preparation) |
| `PUT` | `/api/commandes/{id}/statut?statut=en_preparation` | `cuisinier`, `gerant` | Prend en charge la commande, assigne le cuisinier |
| `PUT` | `/api/commandes/ligne/{id}/statut?statut=<s>` | `cuisinier`, `gerant` | Change le statut d'un plat individuel |

**Format de réponse de `/api/commandes/cuisine` :**

```python
return [{
    "id": c.id,
    "code_unique": c.code_unique,
    "date_heure": c.date_heure.isoformat() if c.date_heure else None,
    "statut": c.statut.value,
    "origine": c.origine.value if c.origine else "serveur",
    "cuisinier": f"{c.cuisinier.prenom} {c.cuisinier.nom}" if c.cuisinier else None,
    "table": {"id": c.table.id, "numero": c.table.numero} if c.table else None,
    "lignes": [{
        "id": l.id,
        "quantite": l.quantite,
        "note": l.note,
        "statut": l.statut.value,
        "plat_id": l.plat_id,
        "plat_nom": l.plat.nom if l.plat else "Plat supprimé",
    } for l in c.lignes]
} for c in commandes]
```

Nota : le champ `table` ne contient pas `emplacement` dans cette réponse. Le frontend gère l'absence du champ `emplacement` via le check `cmd.table?.emplacement`. **Limitation connue** : les badges d'emplacement (Intérieur/Terrasse/Mezzanine) ne s'affichent pas car l'emplacement n'est pas inclus dans la réponse de l'endpoint cuisine.

### 6.2 Routes modifications et KDS alertes

Toutes sous le préfixe `/api/modifications` — `backend/app/api/routes/modifications_commande.py`.

| Méthode | URL | Rôles autorisés | Description |
|---------|-----|-----------------|-------------|
| `PUT` | `/api/modifications/lignes/{lid}/rupture` | `cuisinier`, `serveur`, `gerant` | Signale rupture stock + remboursement Stripe auto |
| `PUT` | `/api/modifications/lignes/{lid}/annuler_prete` | `cuisinier`, `serveur`, `gerant` | Annule "prêt" (mauvaise table) |
| `GET` | `/api/modifications/kds/alertes` | `cuisinier`, `serveur`, `gerant` | Liste des alertes non acquittées (max 20) |
| `PUT` | `/api/modifications/kds/alertes/{aid}/acquitter` | `cuisinier`, `serveur`, `gerant` | Acquitte une alerte |

### 6.3 Routes plats (proposition)

Sous le préfixe `/api/plats` — `backend/app/api/routes/plats.py`.

| Méthode | URL | Rôles autorisés | Description |
|---------|-----|-----------------|-------------|
| `POST` | `/api/plats/proposer` | `cuisinier` uniquement | Soumet un plat en statut `en_attente` |
| `GET` | `/api/plats/mes-propositions` | `cuisinier` uniquement | Retourne les plats proposés par ce cuisinier |
| `GET` | `/api/categories/` | Public (tous) | Liste des catégories pour le select |
| `GET` | `/api/ingredients/` | Public (tous) | Liste des ingrédients disponibles |

### 6.4 Fonctions api.js correspondantes

```javascript
// Commandes cuisine
export const getCommandesCuisine = () => api.get('/api/commandes/cuisine')
export const majStatutLigne       = (id, s) => api.put(`/api/commandes/ligne/${id}/statut?statut=${s}`)
export const majStatutCommande    = (id, s) => api.put(`/api/commandes/${id}/statut?statut=${s}`)

// Modifications et alertes KDS
export const ruptureStock    = (lid) => api.put(`/api/modifications/lignes/${lid}/rupture`)
export const annulerPrete    = (lid, note) => api.put(`/api/modifications/lignes/${lid}/annuler_prete`, { note })
export const getKDSAlertes   = ()   => api.get('/api/modifications/kds/alertes')
export const acquitterAlerte = (id) => api.put(`/api/modifications/kds/alertes/${id}/acquitter`)

// Propositions plat
export const proposerPlat    = (data) => api.post('/api/plats/proposer', data)
export const mesPropositions = ()     => api.get('/api/plats/mes-propositions')
export const getCategories   = ()     => api.get('/api/categories/')
export const getIngredients  = ()     => api.get('/api/ingredients/')
export const uploadImagePlat = (platId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/api/plats/${platId}/image`, form)
}
```

---

## 7. Modèles de données impliqués

Tous les modèles sont définis dans `backend/app/models/models.py`.

### 7.1 Modèle Commande

```python
class Commande(Base):
    __tablename__ = "commandes"

    id               = Column(Integer, primary_key=True, index=True)
    code_unique      = Column(String(30), unique=True, index=True)  # ex: CMD-20260621-0042
    date_heure       = Column(DateTime, server_default=func.now())
    origine          = Column(Enum(OrigineCommandeEnum), default=OrigineCommandeEnum.serveur)
    statut           = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)
    montant_total    = Column(Float, default=0)

    employe_id         = Column(Integer, ForeignKey("employes.id"), nullable=True)
    table_id           = Column(Integer, ForeignKey("tables.id"), nullable=True)
    cuisinier_id       = Column(Integer, ForeignKey("employes.id"), nullable=True)  # clé d'assignation
    client_fidelite_id = Column(Integer, ForeignKey("clients_fidelite.id"), nullable=True)

    # Relations
    employe   = relationship("Employe", back_populates="commandes", foreign_keys="Commande.employe_id")
    cuisinier = relationship("Employe", foreign_keys="Commande.cuisinier_id")
    table     = relationship("Table", back_populates="commandes")
    lignes    = relationship("LigneCommande", back_populates="commande")
    paiement  = relationship("Paiement", back_populates="commande", uselist=False)
```

La colonne `cuisinier_id` est centrale pour la prise en charge exclusive. Elle est `NULL` tant que personne n'a cliqué "Prendre en charge".

### 7.2 Modèle LigneCommande

```python
class LigneCommande(Base):
    __tablename__ = "lignes_commande"

    id            = Column(Integer, primary_key=True, index=True)
    quantite      = Column(Integer, nullable=False, default=1)
    prix_unitaire = Column(Float, nullable=False)
    note          = Column(Text)   # note de personnalisation, ex: "sans oignon"
    statut        = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)

    commande_id   = Column(Integer, ForeignKey("commandes.id"))
    plat_id       = Column(Integer, ForeignKey("plats.id"))

    commande      = relationship("Commande", back_populates="lignes")
    plat          = relationship("Plat", back_populates="lignes")
```

Nota importante : la colonne `statut` de `LigneCommande` utilise l'enum `StatutCommandeEnum` (le même que pour les commandes), ce qui inclut tous les états valides pour les lignes : `en_cours`, `en_preparation`, `prete`, `annulee`, `rupture`, `remplacee`.

### 7.3 Modèle Plat

```python
class Plat(Base):
    __tablename__ = "plats"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(200), nullable=False)
    description     = Column(Text)
    prix            = Column(Float, nullable=False)
    image           = Column(String(500))       # chemin vers l'image uploadée
    disponible      = Column(Boolean, default=True)
    statut          = Column(Enum(StatutPlatEnum), default=StatutPlatEnum.valide)
    propose_par_id  = Column(Integer, ForeignKey("employes.id"), nullable=True)
    motif_refus     = Column(Text, nullable=True)  # rempli par le gérant en cas de refus

    vegetarien      = Column(Boolean, default=False)
    sans_gluten     = Column(Boolean, default=False)
    allergenes      = Column(String(300), nullable=True)

    categorie_id    = Column(Integer, ForeignKey("categories.id"))
    # Relations
    categorie       = relationship("Categorie", back_populates="plats")
    propose_par     = relationship("Employe", back_populates="plats_proposes")
    ingredients     = relationship("PlatIngredient", back_populates="plat")
    lignes          = relationship("LigneCommande", back_populates="plat")
    nutrition       = relationship("NutritionFact", back_populates="plat", uselist=False)
```

Le champ `propose_par_id` lie le plat à l'employé (cuisinier) qui l'a proposé. La route `GET /api/plats/mes-propositions` filtre par `Plat.propose_par_id == user.id`.

### 7.4 Modèle KDSAlerte

```python
class KDSAlerte(Base):
    __tablename__ = "kds_alertes"

    id          = Column(Integer, primary_key=True, index=True)
    commande_id = Column(Integer, ForeignKey("commandes.id"), nullable=True)
    ligne_id    = Column(Integer, ForeignKey("lignes_commande.id"), nullable=True)
    type        = Column(String(50), nullable=False)
    # rupture | annulation | note_modifiee | mauvaise_table | ajout
    message     = Column(String(500), nullable=False)
    acquittee   = Column(Boolean, default=False)
    created_at  = Column(DateTime, server_default=func.now())
```

Les alertes sont créées automatiquement par les routes de modification (`_alerte()`) et récupérées par polling dans le KDS.

### 7.5 Modèle ModificationCommande

```python
class ModificationCommande(Base):
    __tablename__ = "modifications_commande"

    id            = Column(Integer, primary_key=True, index=True)
    commande_id   = Column(Integer, ForeignKey("commandes.id"), nullable=False)
    ligne_id      = Column(Integer, ForeignKey("lignes_commande.id"), nullable=True)
    type          = Column(String(50), nullable=False)
    # ajout | suppression | note | remplacement | rupture | mauvaise_table | annulation
    effectue_par  = Column(String(20), nullable=False)   # client | serveur | gerant | cuisinier
    description   = Column(Text)
    montant_delta = Column(Float, default=0)             # négatif = remboursement
    stripe_action = Column(String(200))                  # refund_id ou payment_intent_id
    created_at    = Column(DateTime, server_default=func.now())
```

Chaque modification génère une entrée dans cette table pour l'historique complet des modifications de la commande.

### 7.6 Enums pertinents

**`StatutCommandeEnum`** — utilisé à la fois pour `Commande.statut` et `LigneCommande.statut` :

```python
class StatutCommandeEnum(str, enum.Enum):
    en_cours        = "en_cours"         # Commande créée, pas encore envoyée
    envoyee         = "envoyee"          # Envoyée en cuisine, visible par tous les cuisiniers
    en_preparation  = "en_preparation"   # Prise en charge par un cuisinier
    prete           = "prete"            # Tous les plats prêts
    cloturee        = "cloturee"         # Payée et fermée
    annulee         = "annulee"          # Annulée
    annulee_partielle = "annulee_partielle"  # Partiellement annulée
    # Statuts ligne uniquement :
    rupture         = "rupture"          # Plat en rupture de stock
    remplacee       = "remplacee"        # Plat remplacé par un autre
```

**`StatutPlatEnum`** — pour les propositions de plat :

```python
class StatutPlatEnum(str, enum.Enum):
    valide      = "valide"      # Visible dans le menu
    en_attente  = "en_attente"  # Proposition cuisinier en attente de validation
    refuse      = "refuse"      # Refusée par le gérant (motif_refus rempli)
```

**`OrigineCommandeEnum`** :

```python
class OrigineCommandeEnum(str, enum.Enum):
    serveur  = "serveur"    # Prise par un serveur
    qr_table = "qr_table"  # Passée par le client via QR code de table
```

**`EmplacementEnum`** — pour les badges de table dans le KDS :

```python
class EmplacementEnum(str, enum.Enum):
    interieur  = "interieur"
    terrasse   = "terrasse"
    mezzanine  = "mezzanine"
```

---

## 8. Cycle de vie complet d'une commande en cuisine

```
[Serveur / Client QR]
         │
         ▼
  POST /api/commandes/          statut: en_cours
         │
         ▼ (serveur clique "Envoyer en cuisine")
  POST /api/commandes/{id}/envoyer-cuisine
         │
         ▼
  statut: envoyee  ──────────────────────────────────────────────
         │                                                        │
         │ [Visible par tous les cuisiniers dans GET /cuisine]   │
         │                                                        │
         ▼ (cuisinier clique "Prendre en charge")                │
  PUT /api/commandes/{id}/statut?statut=en_preparation            │
         │                                                        │
         │ cuisinier_id = user.id (assignation exclusive)         │
         │                                                        │
         ▼                                                        │
  statut: en_preparation  [Visible uniquement par ce cuisinier]   │
         │                                                        │
         │ Pour chaque ligne :                                    │
         │   ▼ (cuisinier clique ▶)                              │
         │ PUT /api/commandes/ligne/{id}/statut?statut=en_preparation
         │   │ ligne.statut: en_cours → en_preparation           │
         │   ▼ (cuisinier clique ✓)                              │
         │ PUT /api/commandes/ligne/{id}/statut?statut=prete      │
         │   │ ligne.statut: en_preparation → prete              │
         │   │ → déduction automatique des ingrédients du stock  │
         │   │                                                    │
         │   │ [Si rupture]                                       │
         │   ▼ (cuisinier clique ⛔)                             │
         │ PUT /api/modifications/lignes/{id}/rupture             │
         │   │ ligne.statut: → rupture                           │
         │   │ → remboursement Stripe automatique                │
         │   │ → alerte KDS type "rupture" créée                 │
         │                                                        │
         ▼ (quand TOUS les plats sont prêts)                     │
  commande.statut → prete  [Disparaît de la vue cuisine]         │
         │                                                        │
         ▼ (serveur clique "Clôturer")                           │
  POST /api/commandes/{id}/cloturer                               │
         │                                                        │
         ▼                                                        │
  statut: cloturee  ─────────────────────────────────────────────
  table.statut → libre
```

**Modifications en cours de commande (depuis le serveur) :**

Ces actions génèrent des alertes KDS visibles en temps réel dans l'interface du cuisinier :

| Action serveur | Alerte KDS | Type |
|----------------|-----------|------|
| Annuler une ligne | "[nom plat] annulé — motif" | `annulation` |
| Modifier une note | "NOTE MODIFIÉE: [nom] → nouvelle note" | `note_modifiee` |
| Ajouter un plat | "[AJOUT] Nx [nom plat]" | `ajout` |
| Remplacer un plat | "[REMPLACEMENT] [ancien] → [nouveau]" | `ajout` |

---

## 9. Backend — Routes détaillées commandes

### `GET /api/commandes/cuisine`

**Fichier :** `backend/app/api/routes/commandes.py`  
**Rôle requis :** `cuisinier` ou `gerant`

Filtre les commandes selon deux conditions en OR :
1. Statut `envoyee` — visible par tout le monde
2. Statut `en_preparation` ET `cuisinier_id == user.id` — visible uniquement par le cuisinier assigné

Ordonnées par `date_heure` ASC (FIFO — première arrivée, première servie).

Utilise `joinedload` pour charger en une seule requête les lignes, les plats associés, la table et le cuisinier.

### `PUT /api/commandes/{commande_id}/statut`

**Rôle requis :** `cuisinier` ou `gerant`

Si `new_statut == en_preparation` et que `commande.cuisinier_id is None`, le cuisinier actuel est automatiquement assigné. L'assignation n'a lieu qu'une seule fois (guard `is None`).

### `PUT /api/commandes/ligne/{ligne_id}/statut`

**Rôle requis :** `cuisinier` ou `gerant`

Accepte les statuts `en_preparation` ou `prete`. La déduction de stock n'a lieu que lors du passage à `prete` (vérification `ligne.statut != StatutCommandeEnum.prete` pour éviter la double déduction).

La progression de la commande vers le statut `prete` se fait automatiquement si toutes les lignes sont prêtes.

---

## 10. Backend — Routes détaillées modifications et alertes

### `PUT /api/modifications/lignes/{ligne_id}/rupture`

**Fichier :** `backend/app/api/routes/modifications_commande.py`  
**Rôles :** `cuisinier`, `serveur`, `gerant`

Séquence d'opérations :
1. Vérification : la ligne n'est pas déjà `prete`
2. `ligne.statut = StatutCommandeEnum.rupture`
3. `ligne.motif_annulation = "Rupture de stock"`
4. `ligne.commande.flag_urgent = 1`
5. Remboursement Stripe (si paiement carte avec `reference_transaction` valide)
6. Déduction du montant de la commande : `montant_total = max(0, total - montant_ligne)`
7. Recalcul statut commande (`_recalc_statut_commande`)
8. Création alerte KDS `type="rupture"`
9. Journalisation dans `ModificationCommande`

### `GET /api/modifications/kds/alertes`

**Rôles :** `cuisinier`, `serveur`, `gerant`

Retourne les 20 alertes non acquittées les plus récentes, ordonnées par `created_at` DESC.

```python
alertes = db.query(KDSAlerte).filter(
    KDSAlerte.acquittee == False
).order_by(KDSAlerte.created_at.desc()).limit(20).all()
```

### `PUT /api/modifications/kds/alertes/{alerte_id}/acquitter`

Met `alerte.acquittee = True`. L'alerte disparaît au prochain polling.

### `PUT /api/modifications/lignes/{ligne_id}/annuler_prete`

Remet une ligne `prete` à `en_preparation`. Crée une alerte `mauvaise_table`. Accessible par `cuisinier`, `serveur` et `gerant`.

---

## 11. Backend — Routes détaillées plats (cuisinier)

### `POST /api/plats/proposer`

**Fichier :** `backend/app/api/routes/plats.py`  
**Rôle requis :** `cuisinier` uniquement

```python
@router.post("/proposer")
def proposer_plat(plat_data: PlatCreate, db: Session = Depends(get_db),
                  user=Depends(require_role("cuisinier"))):
    plat = Plat(
        **plat_data.model_dump(exclude={"ingredients"}),
        statut=StatutPlatEnum.en_attente,  # Toujours en attente
        propose_par_id=user.id             # Lié au cuisinier
    )
    db.add(plat)
    db.flush()
    for ing in plat_data.ingredients:
        db.add(PlatIngredient(plat_id=plat.id, ingredient_id=ing.ingredient_id, quantite=ing.quantite))
    db.commit()
    db.refresh(plat)
    return {"message": "Proposition envoyée au gérant", "plat_id": plat.id}
```

**Schema d'entrée `PlatCreate` :**

```python
class IngredientQuantite(BaseModel):
    ingredient_id: int
    quantite: float

class PlatCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    prix: float
    categorie_id: int
    vegetarien: bool = False
    sans_gluten: bool = False
    allergenes: Optional[str] = None
    ingredients: List[IngredientQuantite] = []
```

### `GET /api/plats/mes-propositions`

**Rôle requis :** `cuisinier` uniquement

```python
@router.get("/mes-propositions")
def mes_propositions(db: Session = Depends(get_db), user=Depends(require_role("cuisinier"))):
    return db.query(Plat).filter(Plat.propose_par_id == user.id).all()
```

Retourne **tous** les plats proposés par ce cuisinier, tous statuts confondus (`en_attente`, `valide`, `refuse`).

### Validation par le gérant

```python
@router.put("/admin/{plat_id}/valider")
def valider_proposition(plat_id: int, validation: ValidationPlat,
                        db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if validation.statut == "valide":
        plat.statut = StatutPlatEnum.valide
        plat.motif_refus = None
    elif validation.statut == "refuse":
        plat.statut = StatutPlatEnum.refuse
        plat.motif_refus = validation.motif_refus
```

Après validation, le plat apparaît dans le menu public (si `valide` et `disponible = True`). Le cuisinier voit la mise à jour dans "Mes propositions" au prochain chargement.

---

## 12. Système d'alertes KDS — Architecture complète

```
[Serveur / Gérant]              [Backend]                    [Cuisinier KDS]
       │                             │                              │
       │  Modifie commande           │                              │
       │  (annuler/noter/ajouter)    │                              │
       ├─────────────────────────────►                              │
       │                             │  1. Modifie la base          │
       │                             │  2. Crée KDSAlerte            │
       │                             │     (type, message)          │
       │                             │                              │
       │                             │         ◄────── polling 5s ──┤
       │                             │                              │
       │                             │  GET /kds/alertes            │
       │                             ├──────────────────────────────►
       │                             │                              │
       │                             │  Retourne alertes non        │
       │                             │  acquittées                  │
       │                             │                              │
       │                             │                   Overlay affiché
       │                             │                   (top-right)
       │                             │                              │
       │                             │         ◄── PUT acquitter ───┤
       │                             │                              │
       │                             │  alerte.acquittee = True     │
       │                             │                              │
       │                             │                   Overlay masqué
```

**Fonction de création d'alerte (helper interne) :**

```python
def _alerte(db, type_, message, commande_id=None, ligne_id=None):
    db.add(KDSAlerte(
        commande_id=commande_id,
        ligne_id=ligne_id,
        type=type_,
        message=message,
    ))
```

Cette fonction est appelée automatiquement dans chaque route de modification :

| Route | Type d'alerte créée |
|-------|---------------------|
| `annuler_commande` | `annulation` |
| `annuler_ligne` | `annulation` |
| `ajouter_ligne` | `ajout` |
| `modifier_note` | `note_modifiee` |
| `remplacer_ligne` | `ajout` (avec message "REMPLACEMENT") |
| `annuler_prete` | `mauvaise_table` |
| `rupture_stock` | `rupture` |

---

## 13. IA Vision — Implication dans le flux cuisinier

**Fichier IA :** `backend/app/services/ia_vision.py`

**Conclusion : l'IA Vision n'est PAS utilisée dans le flux cuisinier.**

Le fichier `ia_vision.py` contient la fonction `analyser_screenshot_avis(image_bytes, prenom, nom)` qui utilise un pipeline en trois étapes :

1. **EasyOCR** — extraction de texte d'une capture d'écran (bibliothèque locale, modèles `fr` et `en`)
2. **HuggingFace** — analyse de sentiment via `cardiffnlp/twitter-xlm-roberta-base-sentiment` (RoBERTa)
3. **Fallback mots-clés** — liste statique de mots positifs/négatifs si HuggingFace indisponible

Cette fonction est exclusivement appelée dans le contexte de la **tombola** (vérification des avis Google Maps uploadés par les clients fidélité). Elle ne fait aucune interaction avec les commandes, les plats, ni les cuisiniers.

Le système `OpenAI GPT-4o` mentionné dans le CLAUDE.md a été **remplacé** par une solution 100% locale : EasyOCR + HuggingFace (pas d'appels à l'API OpenAI dans le code actuel).

**Résumé des usages IA par rôle :**

| Rôle | IA utilisée | Contexte |
|------|------------|---------|
| Client fidélité | EasyOCR + HuggingFace | Upload screenshot avis Google |
| Gérant | HuggingFace | Analyse sentiment avis clients |
| Cuisinier | **Aucune** | Non applicable |
| Serveur | **Aucune** | Non applicable |

---

## 14. Routage React et protection d'accès

### App.jsx — Définition des routes cuisinier

```jsx
{/* Cuisinier */}
<Route
  path="/cuisinier"
  element={
    <ProtectedRoute roles={['cuisinier']}>
      <Layout role="cuisinier" />
    </ProtectedRoute>
  }
>
  <Route index element={<CuisinierInterface />} />       {/* /cuisinier */}
  <Route path="proposer" element={<CuisinierProposer />} /> {/* /cuisinier/proposer */}
</Route>
```

### Redirections automatiques

Depuis `LoginPage.jsx` (non documentée ici), la redirection après login selon le rôle est :
- `gerant` → `/gerant`
- `serveur` → `/serveur`
- `cuisinier` → `/cuisinier`

Tout accès à une route inexistante (`path="*"`) redirige vers `/` (landing page).

### Layout partagé

Le composant `Layout` reçoit `role="cuisinier"` et affiche :
- La sidebar avec `CUISINIER_NAV` (2 liens)
- Pas de `NotifBell` (réservé au gérant)
- Le nom du cuisinier connecté en bas de sidebar
- Le bouton de déconnexion

```jsx
export default function Layout({ role }) {
  const { user, logout } = useAuth()
  const nav = role === 'gerant' ? GERANT_NAV : role === 'serveur' ? SERVEUR_NAV : CUISINIER_NAV
  // ...
}
```

### Hook useAuth

Le cuisinier utilise le hook `useAuth` pour accéder à ses informations :

```javascript
const { user, login, logout } = useAuth()
// user = { role: "cuisinier", nom, prenom, identifiant, access_token }
```

---

## 15. Récapitulatif des fichiers clés

| Fichier | Rôle dans le flux cuisinier |
|---------|----------------------------|
| `frontend/src/pages/CuisinierInterface.jsx` | Page KDS principale — polling, gestion commandes |
| `frontend/src/pages/CuisinierProposer.jsx` | Formulaire proposition de plat + liste propositions |
| `frontend/src/components/shared/Layout.jsx` | Sidebar navigation + ProtectedRoute wrapper |
| `frontend/src/services/api.js` | Toutes les fonctions Axios vers le backend |
| `frontend/src/App.jsx` | Définition des routes React cuisinier |
| `backend/app/api/routes/commandes.py` | Routes GET /cuisine, PUT /statut, PUT /ligne/{id}/statut |
| `backend/app/api/routes/modifications_commande.py` | Routes rupture, alertes KDS, acquittement |
| `backend/app/api/routes/plats.py` | Routes proposer, mes-propositions |
| `backend/app/models/models.py` | Modèles Commande, LigneCommande, Plat, KDSAlerte, ModificationCommande |
| `backend/app/core/security.py` | JWT auth, require_role("cuisinier") |
| `backend/app/services/ia_vision.py` | IA Vision (non utilisée par le cuisinier) |

---

*Documentation générée le 2026-06-21 — MangerManger v2, branche `feature/aymane-fidelite-qr`*
