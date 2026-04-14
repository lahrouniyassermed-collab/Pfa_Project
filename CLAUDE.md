# MangerManger — Contexte projet pour Claude Code

## Vue d'ensemble
Système de gestion de restaurant complet développé en Python (FastAPI) + React.
PFA universitaire — 2 développeurs — délai : 60 jours.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python 3.11 + FastAPI + Uvicorn |
| ORM | SQLAlchemy 2.0 + Alembic |
| Base de données | PostgreSQL |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Frontend | React 18 + Vite + Tailwind CSS |
| HTTP client | Axios |
| Graphiques | Recharts |
| IA Vision | OpenAI GPT-4o (vérification screenshot tombola) |
| IA Sentiment | HuggingFace — cardiffnlp/twitter-xlm-roberta-base-sentiment |
| QR Codes | Python qrcode + Pillow |
| Emails | smtplib / SendGrid |

---

## Structure du projet

```
mangermanger/
├── backend/
│   ├── main.py                        # Point d'entrée FastAPI — importe toutes les routes
│   ├── requirements.txt               # Toutes les dépendances Python
│   ├── .env.example                   # Template variables d'environnement (copier en .env)
│   └── app/
│       ├── core/
│       │   ├── config.py              # Settings Pydantic (lit le .env)
│       │   ├── database.py            # Engine SQLAlchemy + get_db() dependency
│       │   └── security.py            # hash_password, verify_password, create_access_token,
│       │                              # get_current_user, require_role(*roles)
│       ├── models/
│       │   ├── __init__.py            # Re-export de tous les modèles
│       │   └── models.py              # TOUS les modèles SQLAlchemy + tous les Enums
│       ├── services/
│       │   └── ia_service.py          # analyser_screenshot() + analyser_sentiment()
│       └── api/routes/
│           ├── auth.py                # POST /api/auth/login
│           ├── plats.py               # CRUD plats + propositions cuisinier
│           ├── commandes.py           # Commandes serveur + interface cuisine
│           ├── reservations.py        # Réservations standard + local privé
│           ├── tombola.py             # Tombola + participation + IA
│           └── tables_employes.py     # Tables + Employés + Dashboard gérant
└── frontend/
    ├── package.json
    └── src/
        ├── services/api.js            # Toutes les fonctions Axios vers le backend
        ├── hooks/useAuth.jsx          # Context Auth global (login, logout, user)
        └── pages/
            └── LoginPage.jsx          # Page de connexion (redirige selon rôle)
```

---

## Modèles de données (SQLAlchemy)

Tous dans `backend/app/models/models.py` :

### Enums disponibles
```python
RoleEnum          : gerant | serveur | cuisinier
StatutPlatEnum    : valide | en_attente | refuse
StatutCommandeEnum: en_cours | envoyee | en_preparation | prete | cloturee
OrigineCommandeEnum: serveur | qr_table
StatutTableEnum   : libre | occupee | reservee
EmplacementEnum   : interieur | terrasse | mezzanine
TypeReservationEnum: standard | local_prive
StatutReservationEnum: en_attente | confirmee | annulee
ModePaiementEnum  : especes | carte | google_pay | apple_pay | en_ligne
StatutPaiementEnum: en_attente | valide | rembourse
StatutAvisEnum    : en_attente | valide | rejete
SentimentEnum     : positif | neutre | negatif
```

### Tables SQL créées automatiquement
- `employes` — staff (gérant, serveur, cuisinier)
- `categories` — catégories de plats (entrées, plats, desserts…)
- `ingredients` — stock ingrédients avec seuil d'alerte
- `plats` — menu avec statut validation (cuisinier peut proposer)
- `plat_ingredients` — liaison Plat ↔ Ingredient avec quantité
- `tables` — tables du restaurant avec QR code
- `commandes` — commandes avec code unique CMD-YYYYMMDD-XXXX
- `lignes_commande` — détail plats par commande
- `paiements` — paiements liés aux commandes
- `reservations` — réservations standard + local privé (code accès)
- `tombolas` — tombolas avec titre, lot, période
- `avis` — participations tombola avec résultat IA (score + sentiment)

---

## API Routes disponibles

### Auth
```
POST /api/auth/login                  — Form: username + password → JWT token
```

### Plats
```
GET  /api/plats/                      — Menu public (validés + disponibles)
GET  /api/plats/categories            — Menu groupé par catégorie
GET  /api/plats/admin/tous            — Tous plats [gerant]
GET  /api/plats/admin/propositions    — Propositions en attente [gerant]
POST /api/plats/admin/creer           — Créer plat [gerant]
PUT  /api/plats/admin/{id}/valider    — Valider/Refuser proposition [gerant]
PUT  /api/plats/admin/{id}            — Modifier plat [gerant]
DELETE /api/plats/admin/{id}          — Supprimer plat [gerant]
POST /api/plats/proposer              — Proposer nouveau plat [cuisinier]
GET  /api/plats/mes-propositions      — Voir mes propositions [cuisinier]
POST /api/plats/{id}/image            — Upload image plat
```

### Commandes
```
POST /api/commandes/                          — Créer commande [serveur/gerant]
POST /api/commandes/{id}/envoyer-cuisine      — Envoyer en cuisine [serveur]
POST /api/commandes/{id}/cloturer             — Clôturer + libérer table [serveur]
GET  /api/commandes/cuisine                   — Commandes en attente [cuisinier]
PUT  /api/commandes/ligne/{id}/statut         — Marquer plat prêt [cuisinier]
GET  /api/commandes/                          — Toutes commandes [serveur/gerant]
```

### Réservations
```
POST /api/reservations/                       — Créer réservation (public)
GET  /api/reservations/                       — Liste [gerant]
PUT  /api/reservations/{id}/confirmer         — Confirmer [gerant]
PUT  /api/reservations/{id}/annuler           — Annuler [gerant]
GET  /api/reservations/verifier-code/{code}   — Vérifier code local privé [gerant]
```

### Tombola
```
POST /api/tombola/participer           — Participer (upload screenshot, IA auto)
POST /api/tombola/creer                — Créer tombola [gerant]
GET  /api/tombola/participations       — Voir participations + score IA [gerant]
PUT  /api/tombola/avis/{id}/valider    — Valider participation [gerant]
PUT  /api/tombola/avis/{id}/rejeter    — Rejeter participation [gerant]
POST /api/tombola/{id}/tirage          — Tirage au sort [gerant]
```

### Tables & Employés
```
GET    /api/tables/                    — Liste tables (public)
POST   /api/tables/                    — Créer table + QR code [gerant]
PUT    /api/tables/{id}/statut         — Changer statut [serveur/gerant]
DELETE /api/tables/{id}                — Supprimer [gerant]
GET    /api/employes/                  — Liste employés [gerant]
POST   /api/employes/                  — Créer compte employé [gerant]
PUT    /api/employes/{id}/actif        — Activer/Désactiver [gerant]
```

### Dashboard
```
GET /api/dashboard/   — CA jour, top plats, avis en attente, sentiments [gerant]
```

---

## Sécurité / Auth

```python
# Protéger une route par rôle :
from app.core.security import require_role, get_current_user

@router.get("/ma-route")
def ma_route(_=Depends(require_role("gerant"))):
    ...

@router.get("/route-multi-roles")
def route_multi(_=Depends(require_role("serveur", "gerant"))):
    ...

@router.get("/route-connecte")
def route_connecte(user=Depends(get_current_user)):
    # user = objet Employe SQLAlchemy
    ...
```

---

## Frontend — Fonctions API disponibles (api.js)

```javascript
// Auth
login(identifiant, code_passe)

// Plats
getMenu()                          // menu public par catégorie
getTousPlats()                     // admin
getPropositions()                  // propositions cuisinier
creerPlatGerant(data)
validerProposition(id, { statut, motif_refus })
modifierPlat(id, data)
supprimerPlat(id)
proposerPlat(data)                 // cuisinier
mesPropositions()                  // cuisinier

// Commandes
creerCommande({ table_id, lignes: [{plat_id, quantite, note}] })
envoyerCuisine(commandeId)
cloturerCommande(commandeId)
getCommandesCuisine()              // cuisinier
majStatutLigne(ligneId, statut)    // cuisinier
toutesCommandes()

// Tables
getTables()
creerTable({ numero, capacite, emplacement })
changerStatutTable(id, statut)

// Réservations
creerReservation(data)
getReservations()
confirmerReservation(id)
annulerReservation(id)
verifierCodeAcces(code)

// Tombola
getParticipations()
validerAvis(id)
rejeterAvis(id)
tirageAuSort(tombolaId)

// Dashboard
getDashboard()

// Employés
getEmployes()
creerEmploye(data)
```

---

## Frontend — Auth (useAuth hook)

```javascript
import { useAuth } from '../hooks/useAuth'

const { user, login, logout } = useAuth()
// user = { role, nom, prenom, identifiant, access_token }
// user.role = "gerant" | "serveur" | "cuisinier"
```

---

## Pages frontend à créer

### Pages existantes
- `src/pages/LoginPage.jsx` ✅ — connexion, redirige selon rôle

### Pages à créer (priorité haute)

#### Gérant (`/gerant/*`)
- `GerantDashboard.jsx` — CA, top plats, alertes, sentiments (utilise `getDashboard()`)
- `GerantMenu.jsx` — CRUD plats + valider/refuser propositions cuisinier
- `GerantReservations.jsx` — liste + confirmer/annuler + vérifier code local
- `GerantTombola.jsx` — voir participations avec score IA + valider/rejeter + tirage
- `GerantPersonnel.jsx` — créer/désactiver comptes employés
- `GerantTables.jsx` — créer tables + voir statut en temps réel

#### Serveur (`/serveur/*`)
- `ServeurTables.jsx` — plan des tables avec statut (libre/occupée/réservée)
- `ServeurCommande.jsx` — prendre commande, choisir plats, notes, envoyer cuisine
- `ServeurCaisse.jsx` — clôturer commande, générer ticket

#### Cuisinier (`/cuisinier/*`)
- `CuisinierInterface.jsx` — commandes en attente, marquer prêt
- `CuisinierProposer.jsx` — formulaire proposition de nouveau plat

#### Public (`/`)
- `LandingPage.jsx` — présentation resto, menu, réservation
- `MenuPublic.jsx` — menu par catégorie
- `ReservationPage.jsx` — plan 2D interactif + formulaire réservation
- `TombolaParticipation.jsx` — formulaire participation + upload screenshot

---

## Conventions de code

### Backend Python
- Schemas Pydantic définis directement dans le fichier route (pas de fichier schemas/ séparé pour l'instant)
- `require_role("gerant")` — rôle unique
- `require_role("serveur", "gerant")` — multi-rôles
- Toujours `db.commit()` + `db.refresh(obj)` après modification
- Les uploads vont dans `uploads/` (servi statiquement sur `/uploads/`)

### Frontend React
- Tailwind CSS pour tout le style — pas de fichiers CSS séparés
- `useAuth()` pour accéder à l'utilisateur connecté
- Toutes les fonctions API sont dans `src/services/api.js` — importer depuis là
- Composants réutilisables dans `src/components/shared/`
- Composants spécifiques dans `src/components/gerant/`, `/serveur/`, `/cuisinier/`

---

## Commandes de démarrage

```bash
# Backend
cd mangermanger/backend
cp .env.example .env       # configurer DATABASE_URL et SECRET_KEY
pip install -r requirements.txt
uvicorn main:app --reload  # → http://localhost:8000/docs

# Frontend
cd mangermanger/frontend
npm install
npm run dev                # → http://localhost:5173
```

---

## Variables d'environnement (.env)

```
DATABASE_URL=postgresql://postgres:motdepasse@localhost:5432/mangermanger
SECRET_KEY=une_cle_secrete_longue_et_aleatoire
OPENAI_API_KEY=sk-...
SMTP_USER=votre.email@gmail.com
SMTP_PASSWORD=mot_de_passe_application_gmail
RESTAURANT_NAME=MangerManger
```

---

## Priorités immédiates

1. Configurer `.env` et lancer le backend — vérifier `/docs` accessible
2. Créer la base de données PostgreSQL `mangermanger`
3. Lancer le frontend — vérifier que la page login s'affiche
4. Créer le premier compte gérant directement en base (hash du mot de passe avec `passlib`)
5. Coder `GerantDashboard.jsx` + `GerantMenu.jsx` en premier

---

## Notes importantes

- Le backend crée automatiquement toutes les tables SQL au démarrage (`Base.metadata.create_all`)
- La doc API interactive est disponible sur `http://localhost:8000/docs` (Swagger UI)
- Le modèle HuggingFace sentiment se télécharge automatiquement au premier appel (~500MB)
- Les QR codes sont générés en base64 et stockés directement dans la colonne `qr_code_url`
- Code accès local privé format : `LOCAL-2026-XXXX` (généré à la confirmation si paiement sur place, à la création si paiement en ligne)
