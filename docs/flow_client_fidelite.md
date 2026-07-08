# Documentation Complète — Système de Fidélité Client SKY07

**Projet :** MangerManger  
**Restaurant :** SKY07 (Casablanca, Maroc)  
**Date de rédaction :** Juin 2026  
**Stack :** FastAPI (Python) + React 18 + Vite + Tailwind CSS + SQLAlchemy + SQLite

---

## Table des matières

1. [Vue d'ensemble du programme fidélité](#vue-densemble)
2. [Authentification client — écrans et flux](#authentification-client)
3. [Dashboard client](#dashboard-client)
4. [Roue de la Fortune (SpinWheel)](#roue-de-la-fortune)
5. [Vérification téléphone](#vérification-téléphone)
6. [Programme de parrainage](#programme-de-parrainage)
7. [Réservation depuis l'espace client](#réservation-depuis-lespace-client)
8. [Avis Google Maps — bonus IA](#avis-google-maps--bonus-ia)
9. [Avis restaurant (AvisPage)](#avis-restaurant-avispage)
10. [ClientLayout — navigation et structure](#clientlayout--navigation-et-structure)
11. [Routes protégées avec role='client'](#routes-protégées-avec-roleclient)
12. [Toutes les routes API client](#toutes-les-routes-api-client)
13. [Routes API gérant — fidélité](#routes-api-gérant--fidélité)
14. [Modèles de données fidélité](#modèles-de-données-fidélité)
15. [Hook useAuth et gestion du token](#hook-useauth-et-gestion-du-token)
16. [Fonctions API côté frontend (api.js)](#fonctions-api-côté-frontend-apijs)
17. [Résumé des règles d'acquisition de points](#résumé-des-règles-dacquisition-de-points)

---

## Vue d'ensemble

Le programme de fidélité SKY07 est un système complet permettant aux clients du restaurant d'accumuler des points via plusieurs actions (visites, avis Google, vérification téléphone, parrainage), de les dépenser sur une roue de la fortune, et de bénéficier de récompenses exclusives.

Le programme est accessible via un espace client séparé de l'interface du staff restaurant (gérants, serveurs, cuisiniers). L'espace client utilise une identité visuelle de ticket de restaurant (police Bebas Neue, Space Mono, DM Serif Display, palette encre/crème).

**Points clés :**
- Inscription par email + mot de passe, avec vérification OTP à 6 chiffres valable 15 minutes
- Code de parrainage au format `SKY-PRENOM-XXXX`
- Roue de la fortune coûtant 100 points par défaut (configurable par le gérant)
- Bonus +50 pts pour vérification téléphone (une seule fois par compte)
- Bonus avis Google validé par IA (Gemini Vision / OpenAI GPT-4o)
- Interface ticket physique perforé comme fil conducteur visuel

---

## Authentification client

### Fichier concerné
`frontend/src/pages/ClientLogin.jsx`

### Écrans disponibles

Le composant `ClientLogin` gère 5 écrans dans un seul composant, avec navigation par état `screen` :

| Valeur `screen` | Écran affiché |
|---|---|
| `login` | Connexion email + mot de passe |
| `register` | Création de compte |
| `verify-email` | Saisie du code OTP email (6 chiffres) |
| `forgot` | Demande de réinitialisation mot de passe |
| `reset-code` | Saisie OTP + saisie du nouveau mot de passe |

### Identité visuelle

L'interface est présentée comme un **ticket de restaurant** avec :
- Fond : photo de restaurant avec overlay sombre (`rgba(26,20,16,0.72)`)
- Carte ticket en `#F5F0E8` (crème) avec trous de perforation en haut et bas (8 cercles SVG)
- Police `Bebas Neue` pour le logo SKY07 (40px, letterspacing 0.12em)
- Police `Space Mono` pour les labels et champs
- Lignes de séparation tiretées (composant `PerfoRow`)
- Code-barres SVG généré dynamiquement (composant `Barcode`, 38 barres de largeur variable)
- Footer avec nom du restaurant + localisation + code-barres

### Écran Connexion (`login`)

```jsx
// Champs requis
- email (type="email", requis)
- password (masqué/visible via bouton SHOW/HIDE)

// Actions disponibles
- Soumettre → handleLogin()
- "Pas de compte ? Créer" → goTo('register')
- "Mot de passe oublié ?" → goTo('forgot') avec email pré-rempli
```

**Flux `handleLogin` :**
1. Appel `clientLogin({ email, password })` → `POST /api/client/login`
2. Si succès : stockage du token et des données client dans `localStorage`, mise à jour du contexte `useAuth`, redirection vers `/client/dashboard`
3. Si `detail === 'EMAIL_NOT_VERIFIED'` : stockage de `pendingEmail` et `pendingPassword`, redirection vers écran `verify-email` avec countdown de 60 secondes
4. Sinon : affichage du message d'erreur

```javascript
// Structure de l'objet client stocké dans localStorage
const clientData = {
  ...res.data.client,
  role: 'client',             // Ajouté manuellement pour ProtectedRoute
  access_token: res.data.access_token
}
localStorage.setItem('token', res.data.access_token)
localStorage.setItem('user', JSON.stringify(clientData))
if (setUser) setUser(clientData)
navigate('/client/dashboard')
```

### Écran Inscription (`register`)

**Champs du formulaire :**
- `prenom` (requis)
- `nom` (requis)
- `email` (requis, type email)
- `password` (requis, minimum 6 caractères)
- `code_parrainage` (optionnel, validé en temps réel avec debounce 500ms)
- `accept_emails` (checkbox, optionnel) — consentement emails promotionnels
- `accept_terms` (checkbox, **obligatoire**) — règlement d'utilisation

**Validation du code de parrainage :**

La validation est effectuée en temps réel avec debounce de 500ms lors de la saisie. Le code est converti en majuscules automatiquement.

```javascript
// Regex de validation du format
/^SKY-[A-Z]+-[A-Z0-9]{4}$/.test(clean)
// Exemples valides : SKY-YASSE-4F2A, SKY-ALI-B3C1, SKY-FATI-9D2E

// États possibles du champ code_parrainage
codeStatus = null        // champ vide
codeStatus = 'checking'  // validation en cours (affiche "…")
codeStatus = 'valid'     // code valide (bordure dorée + "✓")
codeStatus = 'invalid'   // code invalide (bordure rouge + "✗")
```

Si le code est valide, un message s'affiche sous le champ : `Parrain: {prenom} — +{points_filleul} pts`

**Conditions de blocage à la soumission :**
- `accept_terms` doit être coché (sinon : "Vous devez accepter le règlement pour continuer")
- Mot de passe >= 6 caractères (sinon : "Mot de passe : 6 caractères minimum")
- Si un code parrainage est saisi, il doit être valide (`codeStatus === 'valid'`) (sinon : "Code de parrainage invalide")

**Flux `handleRegister` :**
1. Validations locales (termes, longueur mot de passe, code parrainage)
2. Appel `clientRegister({prenom, nom, email, password, accept_emails, code_parrainage})` → `POST /api/client/register`
3. La réponse contient `requires_email_verification: true`
4. Stockage de `pendingEmail` et `pendingPassword` dans le state local
5. Navigation vers écran `verify-email` avec countdown 60s et `canResend = false`

**Pré-remplissage depuis URL :**

Si l'URL contient un paramètre `?code=SKY-PRENOM-XXXX`, l'écran s'ouvre directement sur `register` avec le code pré-rempli et déclenche la vérification automatiquement :

```javascript
useEffect(() => {
  const codeUrl = searchParams.get('code')
  if (codeUrl) {
    setScreen('register')
    setForm(f => ({ ...f, code_parrainage: codeUrl.toUpperCase() }))
    verifierCode(codeUrl.toUpperCase())  // Lance la vérification immédiatement
  }
}, [])
```

### Modal Conditions d'utilisation

Accessible via clic sur "règlement d'utilisation" dans l'écran register. Modale plein écran avec fond sombre (`rgba(26,20,16,0.85)`), scroll interne, scrollable. Clic en dehors ferme la modale.

Contenu des 9 articles (version Mai 2026) :

1. **Objet du programme** — Programme de fidélité restaurant SKY07, Casablanca, Maroc
2. **Inscription et compte** — Gratuit, majeurs uniquement, un seul compte par personne, données exactes requises
3. **Points de fidélité** — Crédités sur présentation QR code lors d'une visite, non échangeables contre de l'argent, non transférables, expirent après **12 mois d'inactivité**
4. **Roue de fortune** — Accessible avec points, gains valables **30 jours**, non cumulables, SKY07 peut modifier les récompenses
5. **Parrainage** — Points crédités après première visite du filleul, abus = suspension des deux comptes
6. **Données personnelles** — Collecte nom/email/téléphone, jamais vendues, suppression sur demande
7. **Modification des conditions** — SKY07 peut modifier, notification par email si accepté
8. **Résiliation** — Clôture possible à tout moment, points perdus
9. **Droit applicable** — Droit marocain, tribunaux de Casablanca compétents

### Composant OtpBox

Réutilisé sur les écrans `verify-email` et `reset-code` :

```jsx
function OtpBox({ otp, otpRefs, onChange, onKeyDown, onPaste }) {
  return (
    <div style={{ display: 'flex', gap: 8 }} onPaste={onPaste}>
      {otp.map((d, i) => (
        <input key={i} ref={el => otpRefs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => onChange(e.target.value, i)}
          onKeyDown={e => onKeyDown(e, i)}
          style={{ /* champ carré 22px, fond semi-transparent */ }} />
      ))}
    </div>
  )
}

// Comportement clavier
- Saisie d'un chiffre → focus automatique sur le suivant
- Backspace sur champ vide → focus et effacement du champ précédent
- Paste de 6 chiffres → remplissage complet + focus sur le dernier
```

### Écran Vérification email (`verify-email`)

Saisie d'un **code OTP à 6 chiffres** envoyé par email à `pendingEmail`.

**Countdown et renvoi :**
- Countdown de 60 secondes avant de pouvoir renvoyer (mis à jour chaque seconde via `setTimeout`)
- Bouton "Renvoyer le code" actif après le countdown (couleur dorée `GOLD`)
- Appel `renvoyerConfirmation({email: pendingEmail, password: pendingPassword})` → `POST /api/client/renvoyer-confirmation`
- Nouveau countdown de 60 secondes après renvoi
- Limite serveur : 3 renvois par minute par IP

**Flux `handleVerifyEmail` :**
1. Vérification que les 6 chiffres sont saisis (sinon : "Entrez les 6 chiffres du code")
2. Appel `confirmerEmail(code)` → `POST /api/client/confirmer-email`
3. Si succès : stockage token + données client → redirection `/client/dashboard`
4. Si erreur : affichage message, reset des 6 champs OTP, focus sur premier champ

```javascript
// OTP valable 15 minutes (côté backend)
const expire = datetime.utcnow() + timedelta(minutes=15)
```

### Écran Mot de passe oublié (`forgot`)

```javascript
// Flux complet
1. Saisie email dans resetEmail (pré-rempli depuis l'email saisi en login)
2. Appel demanderResetMdpClient(email) → POST /api/clients/demander-reset-mdp
3. Réponse succès : setSuccess("Code envoyé si cet email est enregistré.")
4. Navigation automatique vers écran reset-code
```

Lien "J'ai déjà un code →" permet de sauter directement à `reset-code` sans déclencher l'envoi d'un nouveau code.

### Écran Réinitialisation mot de passe (`reset-code`)

Deux zones de saisie sur le même écran :
1. Code OTP à 6 chiffres (composant `OtpBox`)
2. Nouveau mot de passe (minimum 6 caractères, masqué/visible)

```javascript
// Flux handleResetCode
1. Vérification OTP complet (6 chiffres)
2. Vérification nouveau mot de passe >= 6 chars
3. Appel resetMdpClient(resetEmail, code, newPassword)
   // → POST /api/clients/reset-mdp
   // Corps : { email, code, nouveau_mdp }
4. Succès → message "Mot de passe réinitialisé !" + navigation vers login
5. Erreur → message + reset des champs OTP
```

Le bouton "RÉINITIALISER" est désactivé si OTP < 6 chiffres OU nouveau mot de passe < 6 chars.

---

## Dashboard client

### Fichier concerné
`frontend/src/pages/ClientDashboard.jsx`

### Données chargées au montage

Deux appels API en parallèle via `Promise.all` :

```javascript
const [dashRes, spinsRes] = await Promise.all([
  getClientDashboard(),    // GET /api/client/dashboard
  getClientSpins()         // GET /api/client/historique-spins
])
```

Si le statut 401 est retourné par l'un ou l'autre, redirection vers `/client/login`.

### Structure complète de la réponse dashboard

```javascript
// GET /api/client/dashboard
{
  id: 42,
  prenom: "Yasser",
  nom: "Lahrouini",
  points: 1250,                    // alias de points_solde
  spin_count_mois: 3,
  derniere_date_spin: "2026-06-15T20:34:00",
  avis_google_mois: false,
  avis_statut: "en_attente",       // null | "en_attente" | "valide" | "rejete"
  derniere_date_avis: "2026-06-10T14:22:00",
  historique_gains: [
    {
      id: 12,
      nom_prix: "Boisson offerte",
      date: "2026-06-15T20:34:00",
      statut: "non_utilise",
      description: ""
    }
  ],
  telephone_valide: false,
  config: {
    cout_spin: 100,                // coût par spin en points
    points_avis: 50                // points pour avis Google validé
  }
}
```

### En-tête

Salutation personnalisée : `"Bonjour"` + `{prenom}` (police DM Serif 24px).  
Bouton "Sortir" (déconnexion) → appelle `logout()` puis navigue vers `/client/login`.

### Ticket de solde fidélité

Présenté comme un ticket de caisse avec perforations décoratives :
- Solde en gros chiffres (police Bebas Neue, 56px)
- Unité `pts` en doré à côté
- Objectif fixé à `MAX_PTS = 2000` points affiché sous le solde
- **Anneau de progression SVG** (80×80px, rayon r=34) en couleur or (`GOLD = #B8963E`) :
  ```javascript
  const circumference = 2 * Math.PI * 34  // ≈ 213.6 px
  strokeDashoffset = circumference * (1 - progress)  // arc animé
  ```
- Texte centré dans l'anneau : "SKY07" + pourcentage en Bebas Neue
- **Barre de progression linéaire** horizontale sous le solde, transition CSS 800ms

```javascript
const progress = Math.min(pts / MAX_PTS, 1)
// progress = 0.0 (0 pts) à 1.0 (2000 pts+)
```

### Cartes d'action (composant ActionCard)

4 cartes disposées en grille 2×2 avec hover `translateY(-2px)` :

| Emoji | Label | Sous-titre | Route destination | Condition désactivation |
|---|---|---|---|---|
| 🎡 | Roue Fortune | 100 pts / tour | `/client/roue` | Jamais |
| 🎁 | Parrainage | +100 pts/ami | `/client/parrainage` | Jamais |
| 📱 | Vérif. Tél. | Débloquer +50 | `/client/verification` | `data?.telephone_valide === true` |
| ⭐ | Avis Google | dynamique | `/client/avis-google` | Jamais |

Le sous-titre de la carte "Avis Google" est dynamique selon le champ `data?.avis_statut` :
- `'valide'` → "✓ Validé"
- `'en_attente'` → "⏳ En attente"
- Autre/null → "+50 pts"

La carte désactivée a `opacity: 0.5` et `cursor: default`. Le callback `onClick` est ignoré.

### Bannière téléphone non vérifié

Affichée sous les cartes uniquement si `!data?.telephone_valide` :

```jsx
// Bandeau avec bordure gauche dorée
"Vérifiez votre téléphone"          // police DM Serif 13px
"Confirmez votre numéro pour..."    // sous-titre muted
[+50 PTS]                           // badge doré, police Bebas 16px
```

Clic sur le bandeau → `/client/verification`.

### Section Avis Google embarquée (`GoogleAvisSection`)

Composant non exporté, intégré dans `ClientDashboard`. Il affiche :

1. **Titre et description** : "Avis Google Maps", "Laissez un avis 5★ sur SKY07 et gagnez des points fidélité validés par IA."

2. **Statut de l'avis du mois** (si `avisStatut` est présent) :
   - Vert (`#F0FDF4`) si validé : "✓ Avis validé — points crédités"
   - Jaune (`#FEF9EC`) si en attente : "⏳ En cours de vérification"
   - Rouge (`#FEF2F2`) si rejeté : "✗ Avis rejeté"
   - Mention "Un seul avis par mois est accepté" (si non rejeté)

3. **7 étapes** pour laisser un avis Google (identiques à `GoogleAvisPage` mais avec variante textuelle légèrement différente)

4. **Zone d'upload** (dashed border, JPG/PNG max 10 Mo), aperçu image

5. **Bouton "ENVOYER POUR VALIDATION IA"** → appelle `claimGoogleBonus(file)` → `POST /api/client/avis-google`

6. **Résultat** : si `points_gagnes > 0` → fond vert + `+{points_gagnes} PTS` + "En attente de validation gérant" ; sinon fond jaune + motif de rejet.

### Historique des gains (section)

Liste les **8 premiers** spins de l'historique (`.slice(0, 8)`) :
- Nom du prix (`spin.nom_prix`)
- Date formatée : `jour mois année`
- Différence de points calculée : `ptsDiff = (points_apres ?? 0) - (points_avant ?? 0)`
- Si `isGain` (ptsDiff > 0) : bordure gauche dorée + affichage `+{ptsDiff}` en doré
- Sinon : bordure gauche grise + affichage `ptsDiff` en muted

Si aucun historique : message "AUCUN HISTORIQUE" (letterspacing 0.1em) + bouton "Essayer la roue →".

Chaque entrée utilise les champs du modèle `GainSpin` : `id`, `nom_prix` (depuis `PrixRoue`), `date`, `statut`, `points_avant`, `points_apres`.

---

## Roue de la Fortune

### Fichier concerné
`frontend/src/pages/SpinWheel.jsx`

### Segments de la roue

La roue comporte **8 segments fixes** définis côté frontend. Leur ordre et leur couleur sont constants :

```javascript
const SEGMENTS = [
  { label: '20% OFF',          color: '#C8A882' },
  { label: 'Repas gratuit',    color: '#A07850' },
  { label: 'Double Points',    color: '#B8963E' },
  { label: "Chef's Table VIP", color: '#8B6440' },
  { label: 'Boisson offerte',  color: '#D4B896' },
  { label: 'Dessert offert',   color: '#C8A882' },
  { label: '10% OFF',          color: '#B89470' },
  { label: 'Rejouer',          color: '#6B5040' },
]
```

**Dimensions SVG :**
```javascript
const WHEEL_SIZE = 280  // px
const CX = 140, CY = 140  // centre
const RADIUS = 122  // rayon de la roue
const SEG_COUNT = 8  // nombre de segments
// Angle par segment = 45°
```

Les textes sont positionnés à `RADIUS * 0.65` du centre et orientés perpendiculairement au segment. Les labels multilignes (ex: "Chef's Table VIP") sont splittés sur plusieurs `<tspan>`.

Centre de la roue : disque noir (r=26) avec disque crème intérieur (r=22) affichant "SKY07" + "★★★" en doré.

### Coût par spin

```javascript
const costSpin = dashData?.config?.cout_spin ?? 100
// Affiché dans un badge gris à côté du solde actuel
```

Le bouton de spin change selon l'état :
- `TOURNER — {costSpin} PTS` (état normal, fond INK, texte CREAM)
- `MANQUE {costSpin - pts} PTS` (solde insuffisant, bouton grisé + `disabled`)
- `EN COURS...` (spin en cours, `disabled`)
- `REJOUER` (après résultat, pour relancer)

### Logique d'exclusion (backend)

Le backend implémente un **système progressif anti-répétition** : chaque prix peut être gagné au maximum 2 fois par un même client avant d'être exclu du tirage.

```python
# Pour chaque prix actif, vérifier combien de fois ce client l'a déjà eu
disponibles = []
for p in all_prix:
    count = db.query(GainSpin).filter(
        GainSpin.client_id == client.id,
        GainSpin.prix_id == p.id
    ).count()
    if count < 2:
        disponibles.append(p)

# Si tous les prix ont été gagnés >= 2 fois → réinitialisation complète du cycle
if not disponibles:
    disponibles = list(all_prix)

# Tirage aléatoire parmi les prix disponibles
gagnant = random.choice(disponibles)
```

Le champ `nb_gains_ce_prix` dans `GainSpin` enregistre combien de fois ce client a reçu ce prix spécifique.

### Comportement "Double Points"

Le segment "Double Points" a un traitement comptable spécial :

```python
if gagnant.nom == "Double Points":
    # Le solde est multiplié par 2
    # Le coût du spin N'est PAS déduit préalablement
    points_apres = points_avant * 2
    pts_gagnes = points_avant  # les points "gagnés" = le doublement du solde
else:
    # Pour tous les autres prix, le coût est toujours déduit
    points_apres = points_avant - cout_spin
    # Les gains matériels (boisson, dessert, etc.) ne modifient pas le solde
```

Affichage spécifique côté frontend :
```jsx
{result.nom_prix === 'Double Points' && (
  <div style={{ fontFamily: bebas, fontSize: 22, color: GOLD }}>
    SOLDE × 2 → {result.points_apres} pts
  </div>
)}
```

Pour les autres prix (réductions, produits offerts) : message "Présentez ce gain au restaurant".

### Animation de la roue

```javascript
// Calcul de l'angle de rotation pour amener le segment gagnant sous la flèche
// La flèche est fixe au-dessus de la roue, pointant vers le bas
const segAngle = 360 / SEG_COUNT  // 45° par segment

// La position de départ du SVG est décalée de -90° (convention SVG vs trigonométrie)
const midOfWinner = segIndex * segAngle + segAngle / 2 - 90

// L'angle "top" de la roue correspond à 270° dans le référentiel du SVG
const targetAngle = ((270 - midOfWinner) % 360 + 360) % 360

// Rotation finale = position courante + au moins 5 tours complets + angle additionnel
const additionalR = ((targetAngle - currentMod) % 360 + 360) % 360
const newRotation = currentRotation.current + 5 * 360 + additionalR

// Animation CSS
transition: `transform 4s cubic-bezier(0.17,0.67,0.12,1.0)`
// → démarrage rapide, ralentissement progressif
```

Le résultat est affiché après **4200ms** (4s animation + 200ms tampon), puis les données du dashboard sont rechargées via `loadData()`.

La position courante est trackée dans `currentRotation` (ref, persistante entre spins) pour que la roue reprenne exactement là où elle s'est arrêtée.

### Affichage du résultat

```jsx
// Trois cas d'affichage après le spin
{result.error} → fond rouge, message d'erreur brut
{result.nom_prix === 'Rejouer'} → fond neutre, emoji 😅
{autres} → fond doré, nom du prix, info contextuelle
```

Bouton "FERMER" remet `result` à `null` pour permettre un nouveau spin.

### Légende des récompenses

Sous la roue, grille 4×2 listant les 8 segments avec leur pastille de couleur et leur label.

### Historique des gains (sur la page roue)

Si `history.length > 0`, une section distincte affiche les 10 derniers spins :
- Nom du prix (gras, Space Mono 11px)
- Date et heure : `JJ MMM HH:MM` (ex: "20 Juin 21:45")
- Badge statut : `UTILISÉ` (fond gris) ou `DISPONIBLE` (fond doré)
- Transition de points : `{points_avant} → {points_apres} pts`

---

## Vérification téléphone

### Fichier concerné
`frontend/src/pages/PhoneVerification.jsx`

### Flux en 3 étapes

Le composant gère 3 étapes visibles via indicateur de progression :

```
[ Téléphone ] ——— [ Code OTP ] ——— [ Confirmé ]
      1                 2               3
```

Styles des étapes :
- Étape future (`i > step`) : cercle gris clair, fond transparent
- Étape active (`i === step`) : cercle noir, texte blanc
- Étape passée (`i < step`) : cercle doré, coche "✓"

### Étape 0 — Saisie du numéro de téléphone

Champ de téléphone avec indicatif pays Maroc intégré :

```jsx
// Input combiné : indicatif fixe + numéro saisi
<div style={{ padding: '10px 12px' }}>🇲🇦 +212</div>
<input type="tel" placeholder="6 12 34 56 78" maxLength={10} />
```

Validation locale : minimum 9 chiffres. Appui sur "Entrée" déclenche l'envoi.

```javascript
async function handleSendOTP() {
  // Formatage : suppression du "0" initial si présent
  const fullPhone = '+212' + telephone.replace(/^0/, '')
  // fullPhone = "+212612345678" pour "0612345678" ou "612345678"
  await envoyerCodeOTP(fullPhone)
  // → POST /api/client/telephone/envoyer-code
  // Corps : { telephone: "+212612345678" }
  setStep(1)
}
```

**Important :** Malgré la saisie du numéro de téléphone, le code OTP est envoyé à l'**adresse email de connexion** du client (pas par SMS). Le champ informatif indique : "Le code sera envoyé à votre adresse email de connexion."

### Étape 1 — Saisie du code OTP

6 inputs individuels (même logique que dans `ClientLogin`) avec :
- Navigation automatique au champ suivant à chaque saisie
- Retour au champ précédent sur Backspace depuis un champ vide
- Support du collage d'un code complet

**Countdown et renvoi :**
```javascript
const COUNTDOWN_SEC = 60
// Countdown démarre à l'entrée dans step 1 (useEffect)
// Renvoi possible après 60s
// Renvoi = POST /api/client/telephone/envoyer-code (même endpoint)
```

**Protections backend :**
- OTP valable **10 minutes** (vs 15 min pour confirmation email)
- Maximum **5 tentatives** avant blocage HTTP 429

```javascript
async function handleValidateOTP() {
  const code = otp.join('')  // ex: "482910"
  const res = await validerCodeOTP(code)
  // → POST /api/client/telephone/valider-code
  // Corps : { code: "482910" }
  setPointsGained(res.data?.points ?? 50)
  setStep(2)
}
```

### Étape 2 — Confirmation succès

```jsx
// Affichage succès centré
✓  (grande coche)
"Téléphone vérifié !"
"Votre numéro a bien été confirmé."

// Badge doré
+{pointsGained} PTS crédités

// Bouton
→ TABLEAU DE BORD → navigate('/client/dashboard')
```

**Points crédités en backend :**
```python
POINTS_TELEPHONE = 50  # Constante dans client_fidelite.py

# Dans valider_code_telephone()
otp.utilise = True
client.telephone_valide = True
client.points_solde += POINTS_TELEPHONE
db.commit()

return {
    "message": f"Téléphone vérifié ! +{POINTS_TELEPHONE} points crédités.",
    "points": client.points_solde  # Nouveau solde total
}
```

### Caractère one-time

La vérification est **définitive et unique** par compte. Si `client.telephone_valide` est déjà `True`, le backend retourne HTTP 400 "Téléphone déjà vérifié". La carte d'action correspondante dans le dashboard est visiblement désactivée (`opacity: 0.5`, `cursor: default`).

---

## Programme de parrainage

### Fichier concerné
`frontend/src/pages/ParrainagePage.jsx`

### Données chargées

```javascript
getParrainage()
// → GET /api/client/parrainage
// Réponse :
{
  code: "SKY-YASSE-4F2A",
  nb_parrainages: 2,
  max_parrainages: 3,
  points_par_filleul: 100,
  points_filleul: 30,
  filleuls: [
    { prenom: "Amine", date: "2026-05-12T..." },
    { prenom: "Fatima", date: "2026-06-01T..." }
  ],
  lien: "http://localhost:5173/client/login?code=SKY-YASSE-4F2A"
}
```

Redirige vers `/client/login` si erreur 401. Affiche message d'erreur si autre erreur.

### Format du code de parrainage

```python
# Génération backend
def _generer_code_parrainage(prenom: str, client_id: int) -> str:
    suffix = uuid.uuid4().hex[:4].upper()        # 4 caractères hex en majuscules
    base = re.sub(r'[^A-Z]', '', prenom[:5].upper())  # 5 premiers caractères alphabétiques
    return f"SKY-{base}-{suffix}"

# Regex de validation
r'^SKY-[A-Z]+-[A-Z0-9]{4}$'

# Exemples
"Yasser" → SKY-YASSE-4F2A
"Ali"    → SKY-ALI-B3C1
"Fatima" → SKY-FATIM-9D2E
```

Le code est généré à l'inscription et stocké en base avec contrainte `unique`. Si un client connecté n'a pas encore de code (migration de comptes anciens), il est auto-généré au premier appel de `/api/client/parrainage`.

### Affichage du code

```jsx
// Code affiché en Space Mono, 18px, gras, letterspacing 0.1em, dans cadre en pointillés
<div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700 }}>
  {data?.code ?? '———'}
</div>

// Bouton COPIER → navigator.clipboard.writeText(data.code)
// Animation 2s : "COPIER" → "COPIÉ" (fond doré, coche "✓")
```

Sous le code, si `totalEarned > 0` : "Total gagné via parrainage : **{totalEarned} pts**" en doré.

### Compteur visuel d'amis parrainés

Grille de cercles (`max` cercles, par défaut 3) :

```javascript
const nb           = data?.nb_parrainages ?? 0
const max          = data?.max_parrainages ?? 3
const ptsByReferral = data?.points_par_filleul ?? 100
const totalEarned  = nb * ptsByReferral
```

- Slot rempli (`i < nb`) : cercle doré (44×44px) avec initiale du prénom du filleul
- Slot vide : cercle avec bordure tiretée et signe "+"
- Sous chaque slot : prénom du filleul ou "en attente"
- À droite : "+100 pts / ami" + "+30 filleul" en Bebas

### Règles de parrainage

| Règle | Valeur | Constante |
|---|---|---|
| Maximum de parrainages par compte | 3 | `MAX_PARRAINAGES = 3` |
| Points crédités au parrain | 100 pts par filleul | `POINTS_PARRAIN = 100` |
| Points crédités au filleul | 30 pts à l'inscription | `POINTS_FILLEUL = 30` |
| Moment de crédit | À l'inscription du filleul (pas à la première visite) | — |

### Vérifications backend lors de l'inscription avec code

```python
# 1. Nettoyage et validation du format
code_clean = _sanitize_code(data.code_parrainage)  # re.sub(r'[^A-Z0-9\-]', '', ...)
if not re.match(r'^SKY-[A-Z]+-[A-Z0-9]{4}$', code_clean):
    raise HTTPException(400, "Format de code invalide")

# 2. Code existant en base de données
parrain = db.query(ClientFidelite).filter(
    ClientFidelite.code_parrainage == code_clean
).first()
if not parrain:
    raise HTTPException(400, "Code de parrainage invalide")

# 3. Interdiction d'auto-parrainage
if parrain.email == data.email:
    raise HTTPException(400, "Vous ne pouvez pas utiliser votre propre code")

# 4. Vérification de la limite de parrainages
if parrain.nb_parrainages >= MAX_PARRAINAGES:
    raise HTTPException(400, "Ce code a déjà été utilisé 3 fois")
```

### Effets lors d'un parrainage réussi

```python
# Filleul créé avec points initiaux
new_client = ClientFidelite(
    points_solde = POINTS_FILLEUL,  # 30 pts d'emblée
    parrain_id   = parrain.id,
    ...
)

# Parrain crédité et compteur mis à jour
parrain.points_solde += POINTS_PARRAIN  # +100 pts
parrain.nb_parrainages += 1

# Email de notification envoyé au parrain
envoyer_email_parrainage(
    parrain.prenom, parrain.email,
    data.prenom,        # Prénom du nouveau filleul
    POINTS_PARRAIN,     # 100 pts
    settings.RESTAURANT_NAME
)
```

### Partage WhatsApp

```javascript
function handleWhatsApp() {
  if (!data?.lien) return
  const msg = encodeURIComponent(
    `Rejoins le programme fidélité SKY07 et gagne des points !\n` +
    `Utilise mon code : *${data.code}*\n${data.lien}`
  )
  window.open(`https://wa.me/?text=${msg}`, '_blank')
}
```

Bouton vert (`#25D366`) avec ombre verte `rgba(37,211,102,0.3)`. Désactivé si `!data?.lien`.

Le lien partagé : `http://localhost:5173/client/login?code=SKY-YASSE-4F2A`  
Ce lien ouvre directement l'écran register avec le code pré-rempli et validé.

### Explication "Comment ça marche" (3 étapes)

```javascript
// Étapes affichées dans la carte
{ n: '01', title: 'Partagez votre code', desc: 'Envoyez votre code unique via WhatsApp ou SMS.' }
{ n: '02', title: 'Votre ami s\'inscrit', desc: 'Il crée son compte avec votre code de parrainage.' }
{ n: '03', title: 'Vous gagnez tous les deux',
  desc: `Vous recevez +${ptsByReferral} pts, votre filleul +${data?.points_filleul ?? 30} pts.` }
```

---

## Réservation depuis l'espace client

### Fichier concerné
`frontend/src/pages/ReservationClient.jsx`

### Contexte et accessibilité

La page est accessible à deux endroits :
- `/client/reservation` — dans l'espace client protégé (via `ClientLayout`)
- `/reservation` — accessible au public sans connexion

### Zones disponibles

```javascript
const ZONES = [
  {
    id: 'salle',   name: 'Salle Principale', icon: '🍽',
    color: GOLD,   bg: 'rgba(184,150,62,0.1)',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 8 personnes",
    acompte: null, premium: false,
  },
  {
    id: 't1',    name: 'Terrasse', icon: '☀',
    color: GREEN,  // #2D7D5A
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 6 personnes",
    acompte: null, premium: false,
  },
  {
    id: 't2',    name: 'Terrasse Jardin', icon: '🌿',
    color: '#4A7C59',
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 6 personnes",
    acompte: null, premium: false,
  },
  {
    id: 'priv',  name: 'Salle Privée', icon: '♦',
    color: RED,    // #C8312A
    photos: [3 URLs Unsplash],
    cap: "jusqu'à 20 personnes · exclusif",
    acompte: 500,  // 500 DH d'acompte obligatoire
    premium: true, // Badge "PREMIUM" affiché sur la photo
  },
]
```

Chaque `ZoneCard` dispose de 3 photos avec navigation par points (dots). La zone sélectionnée a une bordure colorée + élévation + coche dans un cercle coloré.

### Créneaux horaires

```javascript
const TIME_SLOTS = [
  '12:00','12:30','13:00','13:30',  // Service déjeuner
  '18:00','18:30','19:00','19:30',  // Service dîner
  '20:00','20:30','21:00','21:30','22:00'
]
// Défaut sélectionné : '19:30'
```

### 5 écrans de réservation

**Écran 0 — Accueil :**  
Fond sombre avec fond radial rouge et doré. Logo SKY07 centré. Ticket CTA rouge "Effectuer une réservation" avec animation hover. Date + heure en temps réel en bas.

**Écran 1 — Configuration :**  
- Sélecteur couverts : boutons +/- (min 1, max 20) + raccourcis rapides (×2, ×3, ×4, ×6, ×8, ×10)
- Calendrier custom : navigation mois/année, lundi en premier, jours passés grisés et non cliquables, aujourd'hui mis en valeur doré avec point indicateur
- Grille créneaux horaires (4 colonnes)
- Sélection zone (optionnel, grille 2×2)
- Champs contact : nom complet (requis), téléphone (requis), message (optionnel, textarea)

**Écran 2 — Ticket de synthèse :**  
Fond `#2A2420` (très sombre). Ticket physique crème centré avec :
- 9 perforations latérales de chaque côté
- En-tête "SKY07 / Ticket de réservation" + tampon "EN ATTENTE" tournée à -12°
- Grille de données (2 colonnes) : N° réservation, date, heure, couverts, zone, client
- Code-barres en bas
- Si salle privée : sélection mode paiement (carte ou espèces)

**Écran 3 — Paiement Stripe (salle privée, mode carte) :**  
Résumé de la réservation + formulaire de carte Stripe (`CardElement`).  
Montant : **500 DH**. Carte de test : `4242 4242 4242 4242 · 12/26 · 123`.

```javascript
// Flux paiement
const r = await creerReservation(payload)
setResaId(r.data.id)
const r2 = await creerPaiementReservation(r.data.id)
// → POST /api/reservations/{id}/paiement-intent
setClientSecret(r2.data.client_secret)
setStripe(loadStripe(r2.data.stripe_publishable_key))
// Formulaire Stripe → confirmerPaiementReservation(resaId, { payment_intent_id })
// → POST /api/reservations/{id}/confirmer-paiement
```

**Écran 4 — Succès :**  
Fond sombre, cercle avec coche rouge. Message "À bientôt chez SKY07".  
Si salle privée : code d'accès affiché (`codeAcces`, style Bebas rouge).  
Récapitulatif de la réservation. Bouton "⬇ Télécharger mon ticket PDF" qui génère un HTML complet avec tous les styles inline et déclenche `window.print()`.

### Payload envoyé au backend

```javascript
await creerReservation({
  nom_complet:     nom,                      // requis
  telephone:       telephone,                // requis
  date:            date,                     // "YYYY-MM-DD", requis
  heure:           heure,                    // "HH:MM"
  nb_personnes:    couverts,                 // 1-20
  zone:            zone || 'salle',          // "salle"|"t1"|"t2"|"priv"
  message:         message || null,
  mode_paiement:   isPrivee ? modePaiement : null,  // "carte"|"especes"
  montant_acompte: isPrivee ? 500 : null,
})
// → POST /api/reservations/
```

### Numéro de réservation affiché

Côté affichage : `SKY-{String(r.data.id).padStart(5, '0')}` (ex: `SKY-00042`).  
Le numéro aléatoire `genResaNum()` (format `AB-7834`) est utilisé uniquement pour les métadonnées du ticket PDF.

---

## Avis Google Maps — bonus IA

### Fichiers concernés

- **Page dédiée :** `frontend/src/pages/GoogleAvisPage.jsx` → route `/client/avis-google`
- **Composant embarqué :** `GoogleAvisSection` dans `ClientDashboard.jsx`

### Description générale

Le client soumet une capture d'écran de son avis Google Maps pour le restaurant SKY07. L'image est analysée par l'IA (backend : `analyser_screenshot_avis()` dans `services/ia_vision.py`) qui vérifie 4 critères.

### Page GoogleAvisPage — Interface et étapes

5 étapes d'instructions affichées avant la soumission :

```javascript
const STEPS = [
  { n: '01', title: 'Ouvrir Google Maps',
    desc: 'Cliquer sur le bouton ci-dessous pour accéder directement à la page SKY07.',
    link: true  // Bouton "→ Ouvrir SKY07 sur Google" avec lien direct
  },
  { n: '02', title: '5 étoiles + commentaire positif',
    desc: 'Sélectionnez 5 étoiles et rédigez un commentaire positif sur votre expérience.'
  },
  { n: '03', title: 'Votre nom doit apparaître',
    desc: "Votre prénom et nom Google doivent correspondre à votre compte ici — l'IA les vérifiera."
  },
  { n: '04', title: 'Prendre la capture d\'écran',
    desc: 'Capture montrant : nom SKY07, vos étoiles, votre commentaire et votre nom visible.'
  },
  { n: '05', title: 'Soumettre ci-dessous',
    desc: "Déposez votre capture et lancez la validation IA."
  },
]
```

Zone d'upload (dashed border qui devient dorée quand une image est chargée, JPG/PNG, max 10 Mo). Aperçu 220px de hauteur max. Bouton "Changer l'image" sous l'aperçu.

### Animation de validation IA (après soumission)

Après soumission, les instructions et la zone d'upload disparaissent, remplacées par 4 checkboxes animées séquentiellement :

```javascript
// Critères vérifiés (dans l'ordre d'animation)
const checks = [
  data.est_avis_google,          // Critère 1 : Interface Google Maps détectée
  data.restaurant_sky07,         // Critère 2 : Restaurant SKY07 visible
  data.auteur_correspond,        // Critère 3 : Nom du client visible
  data.sentiment !== 'NEGATIF',  // Critère 4 : Sentiment POSITIF ou NEUTRE
]

// Labels dynamiques selon les données IA reçues
const labels = [
  'Interface Google Maps détectée',
  'Restaurant SKY07 visible dans la capture',
  data.auteur_detecte ? `Nom trouvé : "${data.auteur_detecte}"` : 'Votre nom visible dans la capture',
  `Sentiment : ${data.sentiment === 'POSITIF' ? 'Positif ✓' : ...}`
]
```

**Timing d'animation :**
```javascript
const DELAYS = [600, 1400, 2300, 3300]  // ms depuis soumission

// Pour chaque checkbox i :
// 1. Attendre (i=0: 300ms, i>0: DELAYS[i]-DELAYS[i-1] ms)
// 2. Passer à 'checking' (spinner gold qui tourne 700ms)
// 3. Passer à 'done' (✓ vert ou ✕ rouge selon la valeur de checks[i])
// Après le dernier : attendre 500ms, puis showFinal = true
```

**États visuels de chaque CheckBox :**
- `'pending'` : fond gris très léger, bordure subtile, case vide
- `'checking'` : fond doré léger, bordure dorée, spinner qui tourne
- `'done'` (checked=true) : fond vert, bordure verte, "✓" blanc
- `'done'` (checked=false) : fond rouge, bordure rouge, "✕" blanc

### Logique de décision backend

```python
# backend/app/api/routes/client_fidelite.py → route POST /api/client/avis-google

# Variables extraites de l'analyse IA
confiance  = analyse.get("score_confiance", 0)    # 0 à 100
est_google = analyse.get("est_avis_google", False)
est_sky07  = analyse.get("restaurant_sky07", False)
auteur_ok  = analyse.get("auteur_correspond", False)
sentiment  = analyse.get("sentiment", "NEUTRE")   # "POSITIF"|"NEGATIF"|"NEUTRE"

# === Logique de décision (ordre de priorité) ===

# 1. REJET IMMÉDIAT — critères bloquants
if not auteur_ok or not est_sky07 or sentiment == "NEGATIF":
    statut = StatutAvisEnum.rejete
    # Construction du message de rejet détaillé
    raison_rejet = []
    if not auteur_ok:
        raison_rejet.append(f"votre nom '{client.prenom} {client.nom}' n'est pas visible")
    if not est_sky07:
        raison_rejet.append("le nom 'SKY07' n'est pas détecté")
    if sentiment == "NEGATIF":
        raison_rejet.append("le texte de l'avis semble négatif")
    # points_gagnes = 0

# 2. VALIDATION AUTOMATIQUE — score élevé
elif confiance >= 80 and est_google:
    statut = StatutAvisEnum.valide
    points_gagnes = points_bonus  # Depuis config, défaut 50
    client.points_solde += points_bonus
    client.derniere_date_avis = now
    client.avis_google_mois = True

# 3. EN ATTENTE — score moyen (validation manuelle gérant requise)
elif confiance >= 40:
    statut = StatutAvisEnum.en_attente
    # points_gagnes = 0 (pas encore crédités)

# 4. REJET — score trop bas
else:
    statut = StatutAvisEnum.rejete
    # points_gagnes = 0
```

### Tableau des seuils de confiance IA

| Score IA | `est_google` | Critères bloquants | Décision |
|---|---|---|---|
| N/A | N/A | auteur ✗ OU sky07 ✗ OU sentiment NÉGATIF | Rejet immédiat |
| >= 80 | `True` | Tous OK | Validation auto + points crédités |
| 40 à 79 | Quelconque | Tous OK | En attente validation gérant |
| < 40 | Quelconque | Tous OK | Rejet (score insuffisant) |

### Champs mis à jour sur le client

```python
client.avis_screenshot = file_path        # "uploads/avis/client_42_abc123.png"
client.avis_score_ia   = confiance / 100.0  # Normalisé 0.0 à 1.0
client.avis_sentiment  = sentiment
client.avis_statut     = statut
```

### Réponse complète de l'API

```javascript
// POST /api/client/avis-google → réponse
{
  status:            "valide"|"en_attente"|"rejete",
  message:           string,          // Message explicatif
  points_gagnes:     number,          // 0 ou points_avis_google (défaut 50)
  solde:             number,          // Nouveau solde total
  score_confiance:   number,          // 0 à 100 (score brut de l'IA)
  est_avis_google:   boolean,
  restaurant_sky07:  boolean,
  auteur_correspond: boolean,
  auteur_detecte:    string|null,     // Nom tel que détecté par l'IA
  sentiment:         "POSITIF"|"NEGATIF"|"NEUTRE",
  motif_rejet:       string|null      // Raison si rejeté
}
```

### Affichage du résultat final (après animations)

```jsx
// Si accepté (points_gagnes > 0)
🎉
"Avis accepté !"
"+{apiResult.points_gagnes} PTS"   // Police Bebas 34px, couleur GOLD
"SCORE IA : {score_confiance}/100" // Police mono 8px, MUTED

// Si rejeté
❌
"Avis non accepté"
{apiResult.motif_rejet}            // Raison détaillée en rouge
"SCORE IA : {score_confiance}/100"
[Bouton "Réessayer" → reset complet]
```

### Fallback si l'IA est indisponible

```python
# Si analyser_screenshot_avis() lève une exception
analyse = {
    "est_avis_google": True, "restaurant_sky07": True,
    "auteur_detecte": f"{client.prenom} {client.nom}",
    "auteur_correspond": True, "etoiles": None,
    "texte_extrait": None, "sentiment": "NEUTRE",
    "score_confiance": 50,     # → déclenche en_attente (40 <= 50 < 80)
    "motif_rejet": None
}
# L'avis sera mis en attente de validation manuelle par le gérant
```

### Stockage des captures d'écran

Les fichiers sont sauvegardés dans `uploads/avis/` :
```python
file_name = f"client_{client.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
file_path = os.path.join("uploads/avis", file_name)
```

---

## Avis restaurant (AvisPage)

### Fichier concerné
`frontend/src/pages/AvisPage.jsx`

### Description

Page accessible depuis la landing page publique (`/`), permet de laisser un avis général sur le restaurant. Aucune connexion requise. Style Tailwind CSS classique (sans l'identité ticket).

### Formulaire

```javascript
const [form, setForm] = useState({ nom: '', note: 0, commentaire: '' })

// Champs
- nom : string (requis, prénom ou pseudonyme)
- note : integer 1-5, sélection par étoiles interactives (requis)
- commentaire : texte libre, textarea 4 lignes (optionnel)
```

**Composant étoile :**
```jsx
function Etoile({ pleine, onClick }) {
  // SVG étoile w-9 h-9 (36px)
  // text-amber-400 si pleine, text-gray-300 sinon
  // transition-colors CSS
}
// 5 étoiles affichées, chaque clic met à jour form.note
```

**Libellés selon la note :**
```javascript
['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'][form.note]
// Affiché sous les étoiles en text-xs text-gray-400
```

**Soumission :**
```javascript
await deposerAvis(form)
// → POST /api/avis-clients/
// Corps : { nom, note, commentaire }
```

**Écran de confirmation :**
```jsx
// Fond vert clair
// Coche verte dans cercle vert
"Merci pour votre avis !"
"Votre avis a été envoyé. Il sera visible après validation par l'équipe."
[Lien "Retour à l'accueil" → navigate('/')]
```

Ce module est distinct du bonus Google Maps. Les avis soumis ici alimentent le modèle `AvisClient` (table `avis_clients`), analysés par le sentiment HuggingFace et gérés via `/api/avis-clients/admin`.

---

## ClientLayout — navigation et structure

### Fichier concerné
`frontend/src/components/shared/ClientLayout.jsx`

### Structure générale

Le layout utilise une approche responsive avec deux types de navigation :

```jsx
// Structure générale
<div className="flex min-h-screen" style={{ background: '#0a1408' }}>
  <aside className="hidden md:flex ...">  {/* Sidebar desktop */}
    {/* En-tête SKY07 */}
    <nav>{/* NavLinks */}</nav>
    <div>{/* Infos utilisateur + bouton déconnexion */}</div>
  </aside>

  <main className="flex-1 md:ml-60 pb-20 md:pb-0">
    <Outlet />  {/* Page enfant rendue ici */}
  </main>

  <nav className="md:hidden fixed bottom-0 ...">  {/* Bottom nav mobile */}
    {/* NavLinks compacts */}
  </nav>
</div>
```

### Items de navigation (NAV_ITEMS)

```javascript
const NAV_ITEMS = [
  { to: '/client/dashboard',    icon: Home,       label: 'Accueil' },
  { to: '/client/roue',         icon: Disc,       label: 'Roue' },
  { to: '/client/parrainage',   icon: Gift,       label: 'Parrainage' },
  { to: '/client/verification', icon: Smartphone, label: 'Téléphone' },
  { to: '/client/reservation',  icon: Calendar,   label: 'Réserver' },
]
// Icônes : lucide-react, strokeWidth: 1.75
// Taille : 16px (sidebar) / 20px (mobile)
```

### Sidebar desktop (md+)

- Fond très sombre : `#0d180b`
- Bordure droite subtile : `rgba(245,240,232,0.05)`
- Largeur fixe : `w-60` (240px), `position: fixed`, hauteur `h-screen`
- Logo "SKY07" en Playfair Display, 3xl, couleur orange `#e8824a`
- Sous-titre "Restaurant & Lounge" en xs letterspacing 0.3em

**Style des liens NavLink actifs/inactifs :**
```javascript
// NavLink reçoit isActive depuis react-router-dom
isActive
  ? `border-[#e8824a] text-[#e8824a]`  // Bordure gauche orange + texte orange
  : `border-transparent text-[#a89880] hover:text-[#f5f0e8]`

// Background conditionnel (style inline)
isActive ? { background: 'rgba(232,130,74,0.1)' } : {}
```

### Section utilisateur (footer sidebar)

```jsx
// Avatar circulaire avec initiale
<div style={{
  background: 'rgba(232,130,74,0.15)',
  border: '1.5px solid rgba(232,130,74,0.3)'
}}>
  {user?.prenom?.[0] ?? 'C'}  // Première lettre du prénom, ou 'C' par défaut
</div>

// Nom affiché
<div style={{ color: '#f5f0e8' }}>{user?.prenom} {user?.nom}</div>
<div style={{ color: '#a89880' }}>Client fidèle</div>

// Bouton déconnexion (icône LogOut, 15px)
// hover: '#f5f0e8', normal: '#a89880'
// onClick: handleLogout → logout() + navigate('/client/login')
```

### Bottom nav mobile (hidden md)

Barre fixe en bas avec `backdropFilter: blur(16px)`, fond `rgba(10,20,8,0.96)`, bordure top orange atténuée.

```jsx
{NAV_ITEMS.map(({ to, icon: Icon, label }) => (
  <NavLink className={isActive => `... ${isActive ? 'text-[#e8824a]' : 'text-[#a89880]'}`}>
    {({ isActive }) => (
      <>
        <Icon size={20} color={isActive ? '#e8824a' : '#a89880'} />
        <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
          {label.split(' ')[0]}   {/* Premier mot seulement (ex: "Téléphone" reste "Téléphone") */}
        </span>
      </>
    )}
  </NavLink>
))}
```

---

## Routes protégées avec role='client'

### Définition complète dans App.jsx

```jsx
// src/App.jsx

// Redirection racine /client → /client/dashboard
<Route path="/client" element={<Navigate to="/client/dashboard" replace />} />

// Connexion non protégée
<Route path="/client/login" element={<ClientLogin />} />

// Groupe protégé : ProtectedRoute vérifie roles=['client']
<Route
  path="/client"
  element={
    <ProtectedRoute roles={['client']}>
      <ClientLayout />
    </ProtectedRoute>
  }
>
  <Route path="dashboard"    element={<ClientDashboard />} />
  <Route path="roue"         element={<SpinWheel />} />
  <Route path="verification" element={<PhoneVerification />} />
  <Route path="parrainage"   element={<ParrainagePage />} />
  <Route path="reservation"  element={<ReservationClient />} />
  <Route path="avis-google"  element={<GoogleAvisPage />} />
</Route>

// Réservation également accessible sans connexion
<Route path="/reservation" element={<ReservationClient />} />
```

### ProtectedRoute

Vérifie que `user` existe dans le contexte `useAuth` ET que `user.role` est dans le tableau `roles` passé en prop. Si non authentifié ou mauvais rôle → redirection vers `/client/login`.

### Gestion de la déconnexion auto (401)

Deux mécanismes complémentaires :

**1. Intercepteur global dans api.js :**
```javascript
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const raw = _storageGet('user')
      const user = raw ? JSON.parse(raw) : {}
      const isClient = user.role === 'client'
                    || window.location.pathname.startsWith('/client')

      _storageRemove('token')
      _storageRemove('user')
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

**2. Gestion locale dans chaque page :**
```javascript
// Pattern commun dans ClientDashboard, SpinWheel, ParrainagePage
.catch(err => {
  if (err.response?.status === 401) navigate('/client/login')
})
```

---

## Toutes les routes API client

### Authentification — préfixe `/api/client`

| Méthode | Route | Description | Auth requise | Rate limit |
|---|---|---|---|---|
| `POST` | `/api/client/register` | Inscription nouveau client | Non | Non |
| `POST` | `/api/client/login` | Connexion email+mot de passe | Non | Non |
| `POST` | `/api/client/confirmer-email` | Valider code OTP email | Non | 10 req/min/IP |
| `POST` | `/api/client/renvoyer-confirmation` | Renvoyer un nouveau code OTP | Non | 3 req/min/IP |

#### POST /api/client/register — corps et réponse

```json
// Corps (RegisterSchema)
{
  "prenom": "Yasser",
  "nom": "Lahrouini",
  "email": "yasser@example.com",
  "password": "motdepasse123",
  "telephone": null,
  "code_parrainage": "SKY-YASSE-4F2A"  // optionnel
}

// Réponse 200
{
  "requires_email_verification": true,
  "email": "yasser@example.com",
  "message": "Code de vérification envoyé à yasser@example.com"
}

// Erreurs possibles
// 400 : "Email déjà utilisé"
// 400 : "Format de code invalide"
// 400 : "Code de parrainage invalide"
// 400 : "Vous ne pouvez pas utiliser votre propre code"
// 400 : "Ce code a déjà été utilisé 3 fois"
```

**Effets lors de l'inscription :**
1. Vérification unicité email
2. Vérification code parrainage (si fourni)
3. Création `ClientFidelite` avec `points_solde = POINTS_FILLEUL (30)` si parrain, sinon 0
4. Génération du code parrainage unique `SKY-PRENOM-XXXX`
5. Si parrain : créditer +100 pts au parrain, incrémenter `nb_parrainages`, envoyer email
6. Générer OTP 6 chiffres, expiration 15 min, envoyer par email
7. Retourner `requires_email_verification: true`

#### POST /api/client/login — corps et réponse

```json
// Corps (LoginSchema)
{
  "email": "yasser@example.com",
  "password": "motdepasse123"
}

// Réponse 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "client": {
    "id": 42,
    "prenom": "Yasser",
    "nom": "Lahrouini",
    "email": "yasser@example.com",
    "points_solde": 130,
    "telephone_valide": false,
    "code_parrainage": "SKY-YASSE-4F2A"
  }
}

// Erreurs
// 401 : "Email ou mot de passe incorrect"
// 403 : "EMAIL_NOT_VERIFIED"
```

#### POST /api/client/confirmer-email

```json
// Corps (OTPSchema)
{ "code": "847291" }

// Réponse 200 (identique à /login)
{ "access_token": "...", "token_type": "bearer", "client": {...} }

// Erreur
// 400 : "Code invalide ou expiré"
```

OTP valable **15 minutes**, usage unique. L'OTP est recherché globalement (pas par client_id), puis le client correspondant est chargé.

---

### Dashboard — `/api/client/dashboard`

| Méthode | Route | Auth |
|---|---|---|
| `GET` | `/api/client/dashboard` | JWT client |

Réponse : voir section [Dashboard client](#dashboard-client).

---

### Spin / Roue de la Fortune

| Méthode | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/client/spin` | Lancer un spin | JWT client |
| `GET` | `/api/client/historique-spins` | Historique spins du client | JWT client |

#### POST /api/client/spin — réponse

```json
{
  "nom_prix":     "Boisson offerte",  // Doit correspondre à un label de SEGMENTS
  "type_prix":    "gratuit",          // TypePrixEnum
  "pts":          0,                  // Points gagnés (0 pour prix matériels)
  "points_apres": 1150,               // Nouveau solde
  "prix_restants": 6,                 // Prix encore disponibles avant reset
  "reset":        false               // true si cycle réinitialisé
}

// Erreurs
// 400 : "Points insuffisants"
// 400 : "Aucun prix configuré — contactez le gérant"
```

#### GET /api/client/historique-spins — réponse

```json
[
  {
    "id": 15,
    "nom_prix":     "20% OFF",
    "date":         "2026-06-20T18:45:00",
    "statut":       "non_utilise",  // "utilise"|"non_utilise"
    "points_avant": 1250,
    "points_apres": 1150
  }
]
// Ordre : du plus récent au plus ancien
```

---

### Avis Google

| Méthode | Route | Auth |
|---|---|---|
| `POST` | `/api/client/avis-google` | JWT client |

**Corps :** `multipart/form-data`, champ `file` (image).  
**Réponse :** Voir section [Avis Google Maps](#avis-google-maps--bonus-ia).

---

### Vérification téléphone

| Méthode | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/client/telephone/envoyer-code` | Enregistre numéro + envoie OTP email | JWT client |
| `POST` | `/api/client/telephone/valider-code` | Valide OTP + crédite 50 pts | JWT client |

#### POST /api/client/telephone/envoyer-code

```json
// Corps
{ "telephone": "+212612345678" }
// Réponse
{ "message": "Code envoyé à yasser@email.com" }
// Erreur : 400 si téléphone déjà validé
```

**Effets :** Invalide les anciens OTP non utilisés, génère nouvel OTP 6 chiffres valable **10 minutes**, enregistre `client.telephone = data.telephone`, envoie OTP par **email** (pas par SMS).

#### POST /api/client/telephone/valider-code

```json
// Corps
{ "code": "482910" }
// Réponse succès
{
  "message": "Téléphone vérifié ! +50 points crédités.",
  "points": 1300  // Nouveau solde total
}
// Erreurs
// 400 : "Téléphone déjà vérifié"
// 400 : "Code expiré. Demandez un nouveau code."
// 400 : "Code incorrect"
// 429 : "Trop de tentatives. Demandez un nouveau code." (après 5 échecs)
```

---

### Parrainage

| Méthode | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/client/parrainage` | Données parrainage du client | JWT client |
| `GET` | `/api/client/verifier-code/{code}` | Vérifier un code (avant inscription) | Public |

#### GET /api/client/verifier-code/{code}

Rate limit : 15 req/min/IP.

```json
// Réponse si valide
{
  "valide":        true,
  "parrain_prenom": "Yasser",
  "points_filleul": 30,
  "restants":      1      // Slots de parrainage restants
}

// Réponse si invalide
{ "valide": false, "message": "Code invalide" }
// ou : { "valide": false, "message": "Ce code a déjà été utilisé 3 fois" }
// ou : { "valide": false, "message": "Format de code invalide" }
```

---

### Reset mot de passe client

**Attention :** Ces routes ont le préfixe `/api/clients/` (avec 's') différent du reste.

| Méthode | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/clients/demander-reset-mdp` | Envoyer OTP de reset par email | Public |
| `POST` | `/api/clients/reset-mdp` | Valider OTP + changer mot de passe | Public |

```json
// Corps demander-reset-mdp
{ "email": "yasser@example.com" }
// Réponse (toujours 200, même si email inconnu pour ne pas révéler d'existence)
{ "message": "Code envoyé si cet email est enregistré." }

// Corps reset-mdp
{
  "email":       "yasser@example.com",
  "code":        "123456",
  "nouveau_mdp": "nouveaumdp123"
}
```

---

### Photo de profil

| Méthode | Route | Auth |
|---|---|---|
| `POST` | `/api/client/upload-photo` | JWT client |

**Corps :** `multipart/form-data`, champ `file`. Formats : jpg, jpeg, png, webp.  
Stocké dans `uploads/photos/client_{id}_{uuid}{ext}`.  
**Réponse :** `{ "photo_url": "/uploads/photos/client_42_abc123.jpg" }`

---

## Routes API gérant — fidélité

Toutes sous `/api/gerant`, toutes requièrent `Depends(require_role("gerant"))`.

### Liste des routes

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/gerant/clients` | Liste tous les clients fidélité |
| `PUT` | `/api/gerant/clients/{id}/valider-telephone` | Validation manuelle du téléphone |
| `GET` | `/api/gerant/spins` | Liste tous les spins de tous les clients |
| `PUT` | `/api/gerant/spins/{gain_id}/utiliser` | Marquer un gain comme utilisé |
| `GET` | `/api/gerant/config-fidelite` | Lire la configuration fidélité |
| `PUT` | `/api/gerant/config-fidelite` | Mettre à jour la configuration |

### GET /api/gerant/clients

Retourne tous les enregistrements `ClientFidelite` (objet SQLAlchemy sérialisé).

### PUT /api/gerant/clients/{id}/valider-telephone

```json
// Réponse
{
  "message": "Téléphone validé — 50 points crédités",
  "points": 1350
}
// Erreurs
// 404 : "Client introuvable"
// 400 : "Téléphone déjà validé"
// 400 : "Aucun numéro enregistré"
```

Utilise `config.points_avis_google` comme nombre de points (50 par défaut), le même paramètre que pour l'avis Google.

### GET /api/gerant/spins

```json
[
  {
    "id":          15,
    "client_nom":  "Yasser Lahrouini",
    "prix_nom":    "Boisson offerte",
    "date":        "2026-06-20T18:45:00",
    "statut":      "non_utilise",
    "points_avant": 1250,
    "points_apres": 1150
  }
]
// Ordre : du plus récent au plus ancien
```

### PUT /api/gerant/spins/{gain_id}/utiliser

```json
// Réponse
{ "message": "Gain marqué comme utilisé" }
// Erreurs
// 404 : "Gain introuvable"
// 400 : "Déjà marqué comme utilisé"
```

### GET et PUT /api/gerant/config-fidelite

```json
// Corps de la requête PUT (ConfigUpdate)
{
  "seuil_minimum_mad":  80,   // Montant minimum DH pour points sur commande
  "points_par_tranche": 5,    // Points gagnés par tranche
  "tranche_mad":        20,   // Taille de la tranche en DH
  "cout_spin_points":   100,  // Coût d'un spin en points
  "points_avis_google": 50    // Points pour avis Google validé
}
// Réponse
{ "message": "Configuration mise à jour" }
```

Si aucune config n'existe en base, elle est créée. Un seul enregistrement est censé exister.

### Fonctions API frontend correspondantes

```javascript
// Toutes dans src/services/api.js
export const getGerantClients       = ()     => api.get('/api/gerant/clients')
export const getGerantSpins         = ()     => api.get('/api/gerant/spins')
export const marquerGainUtilise     = (id)   => api.put(`/api/gerant/spins/${id}/utiliser`)
export const getFideliteConfig      = ()     => api.get('/api/gerant/config-fidelite')
export const updateFideliteConfig   = (data) => api.put('/api/gerant/config-fidelite', data)
export const validerTelephoneClient = (id)   => api.put(`/api/gerant/clients/${id}/valider-telephone`)

// Routes serveur liées aux prizes clients
export const getClientPrizes         = (clientId)    => api.get(`/api/qr/client-prizes/${clientId}`)
export const getClientPrizesServeur  = (identifiant) => api.get(`/api/commandes/client-prizes?identifiant=${encodeURIComponent(identifiant)}`)
export const appliquerReductionServeur = (commandeId, gain_id) =>
  api.post(`/api/commandes/${commandeId}/appliquer-reduction`, { gain_id })
```

---

## Modèles de données fidélité

Tous définis dans `backend/app/models/models.py`.

### ClientFidelite

Table SQL : `clients_fidelite`

```python
class ClientFidelite(Base):
    __tablename__ = "clients_fidelite"

    id               = Column(Integer, primary_key=True, index=True)
    prenom           = Column(String(100), nullable=False)
    nom              = Column(String(100), default="")
    email            = Column(String(200), unique=True, nullable=False, index=True)
    mot_de_passe     = Column(String(255), nullable=False)  # hash bcrypt
    telephone        = Column(String(20), nullable=True, index=True)
    telephone_valide = Column(Boolean, default=False)
    photo_url        = Column(String(500), nullable=True)

    # === Parrainage ===
    code_parrainage  = Column(String(20), unique=True, nullable=True, index=True)
    # Format : "SKY-PRENOM-XXXX", généré à l'inscription
    nb_parrainages   = Column(Integer, default=0)
    # Incrémenté à chaque filleul, limité à MAX_PARRAINAGES (3)
    parrain_id       = Column(Integer, ForeignKey("clients_fidelite.id"), nullable=True)
    # Auto-référentiel : ID du client qui a parrainé ce compte

    # === Fidélité ===
    points_solde      = Column(Integer, default=0)
    date_inscription  = Column(DateTime, server_default=func.now())
    derniere_activite = Column(DateTime, server_default=func.now())
    spin_count_mois   = Column(Integer, default=0)
    # Incrémenté à chaque spin, non réinitialisé automatiquement
    derniere_date_spin = Column(DateTime, nullable=True)

    # === Avis Google ===
    avis_google_mois  = Column(Boolean, default=False)
    # Mis à True quand l'avis est validé automatiquement (score >= 80)
    derniere_date_avis = Column(DateTime, nullable=True)
    avis_screenshot   = Column(String(500), nullable=True)
    # Chemin relatif : "uploads/avis/client_42_abc123.png"
    avis_score_ia     = Column(Float, nullable=True)
    # Score normalisé 0.0 à 1.0 (confiance / 100)
    avis_sentiment    = Column(String(20), nullable=True)
    # "POSITIF" | "NEGATIF" | "NEUTRE"
    avis_statut       = Column(Enum(StatutAvisEnum), nullable=True)
    # null | "en_attente" | "valide" | "rejete"

    # === Email ===
    email_confirme  = Column(Boolean, default=False)
    accept_emails   = Column(Boolean, default=False)
    # Consentement emails promotionnels (coché à l'inscription)

    # === Reset mot de passe ===
    reset_code        = Column(String(6), nullable=True)
    reset_code_expiry = Column(DateTime, nullable=True)

    # === Hérité de l'ancienne version ===
    date_naissance = Column(String(10), default="")
    nb_visites     = Column(Integer, default=0)
    montant_total  = Column(Float, default=0)
    qr_token       = Column(String(100), unique=True, index=True)
    # Token QR pour scans en restaurant (ancienne logique)

    # === Relations ===
    gains    = relationship("GainSpin", back_populates="client")
    filleuls = relationship(
        "ClientFidelite",
        foreign_keys="[ClientFidelite.parrain_id]",
        backref=backref("parrain", remote_side="ClientFidelite.id")
    )
    # filleuls : liste des clients que ce client a parrainés
    # parrain : le client qui a parrainé ce compte (backref)
```

### PrixRoue

Table SQL : `prix_roue`

```python
class PrixRoue(Base):
    __tablename__ = "prix_roue"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(200), nullable=False)
    # Doit correspondre exactement au label d'un segment de la roue frontend
    # ex: "20% OFF", "Repas gratuit", "Double Points", etc.
    description     = Column(Text)
    validite_jours  = Column(Integer, default=30)   # durée de validité du gain
    type            = Column(Enum(TypePrixEnum), nullable=False)
    valeur          = Column(Float, default=0)
    # ex: 20 pour "20% OFF", ou 0 pour "Boisson offerte"
    actif           = Column(Boolean, default=True)
    # Prix inactifs exclus du tirage

    gains = relationship("GainSpin", back_populates="prix")
```

**TypePrixEnum (4 valeurs) :**
```python
class TypePrixEnum(str, enum.Enum):
    reduction = "reduction"   # Pourcentage de réduction (valeur = %)
    gratuit   = "gratuit"     # Produit ou service offert
    points    = "points"      # Points supplémentaires directement
    rejouer   = "rejouer"     # Droit à un spin supplémentaire
```

### GainSpin

Table SQL : `gains_spin`

```python
class GainSpin(Base):
    __tablename__ = "gains_spin"

    id               = Column(Integer, primary_key=True, index=True)
    client_id        = Column(Integer, ForeignKey("clients_fidelite.id"))
    prix_id          = Column(Integer, ForeignKey("prix_roue.id"))

    date_gain        = Column(DateTime, server_default=func.now())
    statut           = Column(Enum(StatutGainEnum), default=StatutGainEnum.non_utilise)
    points_avant     = Column(Integer)    # Solde du client AVANT ce spin
    points_apres     = Column(Integer)    # Solde du client APRÈS ce spin
    nb_gains_ce_prix = Column(Integer, default=1)
    # Compteur : combien de fois CE client a reçu CE prix spécifique
    # Utilisé pour la logique d'exclusion (max 2 fois par prix)

    client = relationship("ClientFidelite", back_populates="gains")
    prix   = relationship("PrixRoue", back_populates="gains")
```

**StatutGainEnum (2 valeurs) :**
```python
class StatutGainEnum(str, enum.Enum):
    utilise     = "utilise"      # Présenté et consommé au restaurant
    non_utilise = "non_utilise"  # Encore disponible
```

### ConfigFidelite

Table SQL : `config_fidelite`

```python
class ConfigFidelite(Base):
    __tablename__ = "config_fidelite"

    id                 = Column(Integer, primary_key=True, index=True)
    seuil_minimum_mad  = Column(Float, default=80)
    # Montant minimum d'une commande en DH pour gagner des points
    points_par_tranche = Column(Integer, default=5)
    # Nombre de points gagnés par tranche de montant
    tranche_mad        = Column(Integer, default=20)
    # Taille de la tranche en DH (ex: 5 pts tous les 20 DH dépensés)
    cout_spin_points   = Column(Integer, default=100)
    # Points nécessaires pour un spin de la roue
    points_avis_google = Column(Integer, default=50)
    # Points crédités pour un avis Google Maps validé
```

**Usage :** Un seul enregistrement attendu en base. Si absent, les valeurs par défaut sont utilisées dans les routes. Le gérant peut modifier via `PUT /api/gerant/config-fidelite`.

### OTPVerification

Table SQL : `otp_verifications`

```python
class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id         = Column(Integer, primary_key=True)
    client_id  = Column(Integer, ForeignKey("clients_fidelite.id"), nullable=False)
    code       = Column(String(6), nullable=False)     # 6 chiffres numériques
    expire_at  = Column(DateTime, nullable=False)       # Horodatage d'expiration
    utilise    = Column(Boolean, default=False)         # Marqué True après usage
    tentatives = Column(Integer, default=0)             # Compteur d'erreurs de saisie
```

**Durées de validité par usage :**

| Usage | Durée | Endpoint |
|---|---|---|
| Confirmation email (inscription) | 15 minutes | `POST /api/client/confirmer-email` |
| Renvoi confirmation email | 15 minutes | `POST /api/client/renvoyer-confirmation` |
| Vérification téléphone | 10 minutes | `POST /api/client/telephone/envoyer-code` |

**Protections anti-brute-force :**

```python
# Vérification téléphone : max 5 tentatives par OTP
otp.tentatives += 1
if otp.tentatives > 5:
    db.commit()
    raise HTTPException(status_code=429, detail="Trop de tentatives. Demandez un nouveau code.")

# Rate limits par IP (implémentés via _rate_store dictionnaire en mémoire)
_check_rate_limit(request.client.host, max_req=10, window_sec=60)  # confirmer-email
_check_rate_limit(request.client.host, max_req=3, window_sec=60)   # renvoyer-confirmation
_check_rate_limit(request.client.host, max_req=15, window_sec=60)  # verifier-code
```

**Nettoyage avant renvoi :**
```python
# Avant d'envoyer un nouveau code, les anciens OTP non utilisés sont supprimés
db.query(OTPVerification).filter(
    OTPVerification.client_id == client.id,
    OTPVerification.utilise == False
).delete()
```

---

## Hook useAuth et gestion du token

### Fichier concerné
`frontend/src/hooks/useAuth.jsx`

### Contexte React exporté

```javascript
// AuthContext fournit à tous les composants enfants
{
  user:    null | {...},  // Données utilisateur (staff OU client)
  setUser: Function,      // Setter direct utilisé par ClientLogin
  login:   Function,      // Connexion staff via POST /api/auth/login (OAuth2 form)
  logout:  Function       // Déconnexion (efface localStorage)
}
```

### Persistance de session

```javascript
// Initialisation depuis localStorage (synchrone)
const [user, setUser] = useState(() => {
  const saved = storageGet('user')  // wrapper autour de localStorage.getItem
  try { return saved ? JSON.parse(saved) : null } catch { return null }
})
```

### Deux mécanismes de connexion

**Connexion staff (gérant, serveur, cuisinier) via `login()` :**
```javascript
async function login(identifiant, code_passe) {
  const res = await loginApi(identifiant, code_passe)
  // → POST /api/auth/login (formulaire OAuth2 multipart)
  const userData = res.data  // { access_token, role, nom, prenom, identifiant... }
  storageSave('token', userData.access_token)
  storageSave('user', JSON.stringify(userData))
  setUser(userData)
  return userData
}
```

**Connexion client via `setUser()` direct depuis `ClientLogin` :**
```javascript
// Dans ClientLogin.jsx après clientLogin() réussi
const clientData = {
  ...res.data.client,  // id, prenom, nom, email, points_solde, telephone_valide, code_parrainage
  role: 'client',
  access_token: res.data.access_token
}
localStorage.setItem('token', res.data.access_token)
localStorage.setItem('user', JSON.stringify(clientData))
if (setUser) setUser(clientData)
```

### Structure de l'objet `user` côté client

```javascript
// Après connexion réussie via /api/client/login
{
  id:               42,
  prenom:           "Yasser",
  nom:              "Lahrouini",
  email:            "yasser@example.com",
  points_solde:     1250,
  telephone_valide: false,
  code_parrainage:  "SKY-YASSE-4F2A",
  role:             "client",        // Ajouté manuellement (pas dans la réponse backend)
  access_token:     "eyJ..."         // JWT Bearer token
}
```

### Déconnexion

```javascript
function logout() {
  storageRemove('token')   // localStorage.removeItem('token')
  storageRemove('user')    // localStorage.removeItem('user')
  setUser(null)
}
```

Appelée depuis `ClientLayout` (bouton déconnexion) et `ClientDashboard` (bouton "Sortir").

---

## Fonctions API côté frontend (api.js)

### Fichier
`frontend/src/services/api.js`

### Configuration Axios

```javascript
const api = axios.create({
  baseURL: '',      // Pas de baseURL → même origine que le frontend
  timeout: 30000,   // 30 secondes
})

// Intercepteur requête : ajout automatique du token JWT
api.interceptors.request.use((config) => {
  const token = _storageGet('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Intercepteur réponse : redirection sur 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Déterminer si c'est un client ou un staff
      const raw = _storageGet('user')
      const user = raw ? JSON.parse(raw) : {}
      const isClient = user.role === 'client'
                    || window.location.pathname.startsWith('/client')
      _storageRemove('token')
      _storageRemove('user')
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

### Récapitulatif de toutes les fonctions fidélité client

```javascript
// ── AUTHENTIFICATION CLIENT ─────────────────────────────────────────────────
export const clientRegister       = (data) => api.post('/api/client/register', data)
export const clientLogin          = (data) => api.post('/api/client/login', data)
export const confirmerEmail       = (code) => api.post('/api/client/confirmer-email', { code })
export const renvoyerConfirmation = (data) => api.post('/api/client/renvoyer-confirmation', data)

// ── DASHBOARD ───────────────────────────────────────────────────────────────
export const getClientDashboard = () => api.get('/api/client/dashboard')

// ── ROUE DE LA FORTUNE ──────────────────────────────────────────────────────
export const spinWheel    = ()     => api.post('/api/client/spin')
export const getClientSpins = ()   => api.get('/api/client/historique-spins')

// ── AVIS GOOGLE MAPS ────────────────────────────────────────────────────────
export const claimGoogleBonus = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/client/avis-google', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ── TÉLÉPHONE OTP ───────────────────────────────────────────────────────────
export const envoyerCodeOTP   = (telephone) =>
  api.post('/api/client/telephone/envoyer-code', { telephone })
export const validerCodeOTP   = (code)      =>
  api.post('/api/client/telephone/valider-code', { code })

// ── PHOTO PROFIL ────────────────────────────────────────────────────────────
export const uploadPhotoProfil = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/client/upload-photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ── RESET MOT DE PASSE CLIENT ───────────────────────────────────────────────
export const demanderResetMdpClient = (email) =>
  api.post('/api/clients/demander-reset-mdp', { email })
export const resetMdpClient = (email, code, nouveau_mdp) =>
  api.post('/api/clients/reset-mdp', { email, code, nouveau_mdp })

// ── PARRAINAGE ──────────────────────────────────────────────────────────────
export const getParrainage   = ()     => api.get('/api/client/parrainage')
export const verifierCodeAmi = (code) => api.get(`/api/client/verifier-code/${code}`)

// ── ADMINISTRATION GÉRANT ────────────────────────────────────────────────────
export const getGerantClients       = ()     => api.get('/api/gerant/clients')
export const getGerantSpins         = ()     => api.get('/api/gerant/spins')
export const marquerGainUtilise     = (id)   => api.put(`/api/gerant/spins/${id}/utiliser`)
export const getFideliteConfig      = ()     => api.get('/api/gerant/config-fidelite')
export const updateFideliteConfig   = (data) => api.put('/api/gerant/config-fidelite', data)
export const validerTelephoneClient = (id)   => api.put(`/api/gerant/clients/${id}/valider-telephone`)

// ── PRIZES EN SALLE (SERVEUR) ────────────────────────────────────────────────
export const getClientPrizes         = (clientId)      =>
  api.get(`/api/qr/client-prizes/${clientId}`)
export const getClientPrizesServeur  = (identifiant)   =>
  api.get(`/api/commandes/client-prizes?identifiant=${encodeURIComponent(identifiant)}`)
export const appliquerReductionServeur = (commandeId, gain_id) =>
  api.post(`/api/commandes/${commandeId}/appliquer-reduction`, { gain_id })
```

---

## Résumé des règles d'acquisition de points

### Tableau complet des sources de points

| Action | Points gagnés | Déduction | Conditions | Récurrence |
|---|---|---|---|---|
| Inscription avec code parrainage | +30 pts (filleul) | Aucune | Code valide, parrain < 3 parrainages | Une seule fois à l'inscription |
| Parrainer un ami | +100 pts (parrain) | Aucune | Filleul crée compte avec votre code | Par filleul (max 3) |
| Vérification téléphone | +50 pts | Aucune | OTP email validé, téléphone non encore validé | Une seule fois par compte |
| Avis Google auto-validé | +50 pts (config) | Aucune | Score IA >= 80, `est_google=True`, critères OK | Mensuel (désactivé en démo) |
| Avis Google validé manuellement | +50 pts (config) | Aucune | Score 40-79, gérant valide | Mensuel |
| Spin "Double Points" | Solde actuel (x2) | Aucune (spin gratuit) | Segment sélectionné par l'IA aléatoire | Chaque fois que la roue tombe sur ce segment |
| Spin autres segments | Aucun point gagné | -100 pts (cout_spin) | Solde >= cout_spin | À chaque spin |

### Constantes backend (non configurables sans modification de code)

```python
# Fichier : backend/app/api/routes/client_fidelite.py
POINTS_TELEPHONE  = 50    # Points vérification téléphone
POINTS_PARRAIN    = 100   # Points au parrain par filleul
POINTS_FILLEUL    = 30    # Points au filleul à l'inscription
MAX_PARRAINAGES   = 3     # Maximum de filleuls par compte
```

### Paramètres configurables par le gérant (ConfigFidelite)

```python
# Valeurs par défaut en base
seuil_minimum_mad  = 80    # Montant minimum en DH pour gagner des points sur commande
points_par_tranche = 5     # Points gagnés par tranche
tranche_mad        = 20    # Taille de la tranche en DH (5 pts / 20 DH dépensés)
cout_spin_points   = 100   # Points pour un spin de la roue
points_avis_google = 50    # Points pour avis Google validé
```

### Règle de progression et objectif

```javascript
// Affiché dans ClientDashboard.jsx
const MAX_PTS = 2000  // Objectif de points (non configuré dynamiquement)
const progress = Math.min(pts / MAX_PTS, 1)
// Anneau SVG + barre de progression = visualisation de pts / 2000
```

### Règle d'expiration (CGU)

Selon les CGU affichées :
- Points : expirent après **12 mois d'inactivité** (non implémenté dans la version actuelle)
- Gains roue : valables **30 jours** (`validite_jours = 30` dans `PrixRoue`, vérification non implémentée)

---

## Annexe — Palette de couleurs de l'espace client

| Variable | Valeur hex | Utilisation |
|---|---|---|
| `INK` | `#1A1410` | Texte principal, fonds foncés, bordures |
| `CREAM` | `#F5F0E8` | Fond des cartes ticket, texte sur fond sombre |
| `PAPER` | `#FAF7F0` | Fond de page général, fond des inputs |
| `MUTED` | `#8A7E76` | Labels secondaires, placeholders, textes atténués |
| `RED` | `#C8312A` | Erreurs, salle privée, accents d'alerte |
| `GOLD` | `#B8963E` | Points, éléments actifs, progression, validations |

## Annexe — Polices utilisées

| Police | Usage | Import |
|---|---|---|
| Bebas Neue | Logo SKY07, solde en gros chiffres, badges, résultats | Google Fonts |
| DM Serif Display | Titres de sections, noms propres, textes serif | Google Fonts |
| Space Mono | Labels, champs de saisie, textes courants, codes | Google Fonts |

---

*Documentation générée depuis l'analyse du code source de MangerManger — Juin 2026*
