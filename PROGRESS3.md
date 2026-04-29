# PROGRESS3 — Développement Aymane (Session 3)
> Branche : `feature/aymane-fidelite-qr`  
> Date : Avril 2026  
> Développeur : Aymane HP

---

## 1. Résumé de ce qui a été développé

### Système de fidélité client complet
- Inscription / connexion client (JWT séparé du staff)
- Dashboard points avec solde, historique gains, statistiques mensuelles
- Roue de la fortune (1 spin/mois, coût configurable en points)
- Bonus avis Google (upload screenshot → analyse IA → crédit automatique)

### IA Vision — Vérification des avis Google
- **Pipeline principal** : Google Gemini 2.0 Flash (analyse l'image)
- **Fallback automatique** : EasyOCR local + HuggingFace RoBERTa sentiment
- Vérifie : présence du nom du client, mention de SKY07, sentiment positif/neutre

### Interface QR Code / Commande en ligne
- Page d'accueil QR (linktree) : menu, fidélité, Instagram, WhatsApp
- Commande depuis table : menu dark par catégorie, panier, paiement Stripe-like
- 4 étapes : menu → panier → paiement → confirmation

### Landing page publique
- Page statique 100% (pas de dépendance backend)
- Plan 2D SVG interactif du restaurant (clic sur table → pré-remplit la résa)
- Sections : Hero, Menu (onglets), Réservation, Avis, Carrières, Fidélité, Footer

---

## 2. Fichiers créés / modifiés

### Backend — Nouveaux fichiers
```
backend/app/api/routes/client_fidelite.py   ← Auth client + dashboard + spin + avis Google
backend/app/api/routes/gerant_fidelite.py   ← Dashboard gérant fidélité (stats, gains, config)
backend/app/services/ia_vision.py           ← Analyse screenshot (Gemini + OCR fallback)
backend/seed_menu.py                        ← 34 plats marocains en 7 catégories
backend/migrate_fidelite.py                 ← Migration tables fidélité (à exécuter 1 fois)
backend/migrate_ia_cols.py                  ← Migration colonnes IA sur ClientFidelite
backend/create_prix_roue.py                 ← Crée les prix par défaut de la roue
backend/fix_admin.py                        ← Utilitaire fix compte admin
backend/fix_telephone_nullable.py           ← Migration téléphone nullable
```

### Backend — Fichiers modifiés
```
backend/main.py                             ← Import des nouvelles routes
backend/app/models/models.py                ← Nouveaux modèles (voir section 3)
backend/app/core/config.py                  ← Ajout GEMINI_API_KEY
backend/app/core/security.py               ← get_current_client() pour JWT client
backend/app/api/routes/clients.py          ← Endpoint inscrireClient (landing page)
backend/app/api/routes/commandes.py        ← Commande QR table publique
backend/app/api/routes/qr_commande.py      ← Route QR commande
backend/requirements.txt                   ← Nouvelles dépendances IA
```

### Frontend — Nouveaux fichiers
```
frontend/src/pages/QRLanding.jsx            ← Page linktree QR code
frontend/src/pages/ClientLogin.jsx          ← Login/register client fidélité
frontend/src/pages/ClientDashboard.jsx      ← Dashboard fidélité (points, roue, avis)
frontend/src/components/client/SpinWheel.jsx← Roue de la fortune animée
frontend/src/components/landing/FloorPlan.jsx ← Plan 2D SVG interactif
frontend/src/components/landing/AboutSection.jsx
frontend/src/components/landing/HeroSection.jsx
frontend/src/components/landing/MenuSection.jsx
frontend/src/components/landing/ReservationSection.jsx
frontend/src/components/landing/ReviewsSection.jsx
frontend/src/components/landing/JobsSection.jsx
frontend/src/components/landing/Footer.jsx
frontend/src/components/landing/Navbar.jsx
frontend/src/components/landing/TableCard.jsx
frontend/src/components/landing/ReservationForm.jsx
frontend/src/components/landing/ReservationModal.jsx
frontend/src/components/landing/JobApplicationForm.jsx
frontend/src/components/landing/useScrollFade.js
frontend/src/data/mockData.js               ← Données statiques (plats, tables, avis, emplois)
```

### Frontend — Fichiers modifiés
```
frontend/index.html                         ← Google Fonts (Inter + Playfair Display)
frontend/src/App.jsx                        ← Nouvelles routes
frontend/src/services/api.js               ← Nouvelles fonctions API
frontend/src/pages/LandingPage.jsx         ← Refacto complet statique + FloorPlan
frontend/src/pages/CommandeQR.jsx          ← Refacto dark + paiement Stripe-style
```

---

## 3. Modèles SQLAlchemy ajoutés dans `models.py`

```python
class ClientFidelite(Base):
    id, prenom, nom, email, mot_de_passe, telephone
    points, derniere_date_spin, spin_count_mois
    avis_google_mois, avis_screenshot, avis_score_ia, avis_sentiment, avis_statut
    derniere_date_avis, created_at

class PrixRoue(Base):
    id, nom, description, type (points/remise/gratuit/rien)
    valeur, probabilite, couleur, actif

class GainSpin(Base):
    id, client_id, prix_id, date, statut (disponible/utilise/expire)

class ConfigFidelite(Base):
    id, cout_spin, points_avis, points_commande_par_dh

# Enums ajoutés :
TypePrixEnum    : points | remise | gratuit | rien
StatutGainEnum  : disponible | utilise | expire
StatutAvisEnum  : en_attente | valide | rejete
```

---

## 4. Routes API ajoutées

### Client Fidélité (`/api/client/`)
```
POST /api/client/register          — Créer compte client
POST /api/client/login             — Connexion client → JWT
GET  /api/client/dashboard         — Solde points, historique, config roue
POST /api/client/spin              — Tourner la roue (débite points, retourne gain)
POST /api/client/avis-google       — Upload screenshot avis → analyse IA → crédite points
```

### Gérant Fidélité (`/api/gerant/fidelite/`)
```
GET  /api/gerant/fidelite/stats    — Stats globales fidélité
GET  /api/gerant/fidelite/clients  — Liste clients avec points
GET  /api/gerant/fidelite/gains    — Historique tous les gains
PUT  /api/gerant/fidelite/config   — Modifier config (coût spin, points avis...)
GET  /api/gerant/fidelite/prix-roue— Liste prix roue
POST /api/gerant/fidelite/prix-roue— Créer prix roue
PUT  /api/gerant/fidelite/prix-roue/{id} — Modifier prix
```

### QR / Commande publique
```
GET  /api/qr/table/{id}            — Info table par ID
POST /api/commandes/qr             — Créer commande depuis QR (sans auth staff)
```

---

## 5. Installation — Dépendances

### Backend (Python)
```bash
cd backend
pip install -r requirements.txt
```

**Dépendances IA critiques à installer manuellement si erreur :**
```bash
pip install google-genai>=0.8.0
pip install easyocr
pip install torch torchvision
pip install transformers sentencepiece
pip install Pillow numpy
```

### Frontend (Node)
```bash
cd frontend
npm install
```
> lucide-react est déjà dans package.json — `npm install` suffit.

---

## 6. Variables d'environnement — `.env`

Fichier à créer dans `backend/.env` :

```env
# Base de données
DATABASE_URL=sqlite:///./mangermanger.db

# Sécurité JWT
SECRET_KEY=une_cle_tres_longue_et_aleatoire_ici

# Gemini Vision (optionnel — fallback OCR si absent/quota dépassé)
GEMINI_API_KEY=AIzaSy...

# Email (optionnel)
SMTP_USER=votre.email@gmail.com
SMTP_PASSWORD=mot_de_passe_app_gmail

# Nom du restaurant
RESTAURANT_NAME=SKY07
```

> **Note :** Si `GEMINI_API_KEY` est invalide ou quota dépassé, le système bascule
> automatiquement sur EasyOCR local. Le système fonctionne sans clé Gemini.

---

## 7. Scripts à exécuter dans l'ordre (première installation)

```bash
cd backend

# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer le backend une première fois pour créer les tables
uvicorn main:app --reload
# Ctrl+C après 5 secondes

# 3. Migrations fidélité (ajoute les colonnes manquantes)
python migrate_fidelite.py
python migrate_ia_cols.py
python fix_telephone_nullable.py

# 4. Créer les prix de la roue par défaut
python create_prix_roue.py

# 5. Remplir le menu avec 34 plats marocains
python seed_menu.py

# 6. Relancer le backend
uvicorn main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

---

## 8. URLs de test

| URL | Description |
|-----|-------------|
| `http://localhost:5173/` | Landing page publique (plan SVG) |
| `http://localhost:5173/qr?table=1` | Page QR linktree (table 1) |
| `http://localhost:5173/commande/menu?table=1` | Commander depuis table 1 |
| `http://localhost:5173/client/login` | Connexion/inscription fidélité |
| `http://localhost:5173/client/dashboard` | Dashboard points & roue |
| `http://localhost:8000/docs` | Swagger API backend |

---

## 9. Identifiants de test

### Compte client fidélité (à créer via `/client/login`)
```
Email    : test@sky07.com
Password : test1234
Prénom   : Yasser
Nom      : Lahrouni
```

### Compte gérant (déjà existant)
```
Identifiant : admin
Mot de passe : admin123   (ou selon ce qui est en base)
```

---

## 10. Architecture IA Vision

```
Screenshot uploadée
        │
        ▼
┌─────────────────────┐
│  Gemini 2.0 Flash   │ ◄── Clé API dans .env
│  (analyse visuelle) │
└─────────────────────┘
        │ Erreur (quota/réseau) ?
        ▼
┌─────────────────────┐
│  EasyOCR local      │ ← extrait le texte de l'image
│  + RoBERTa XLM      │ ← analyse le sentiment
│  (HuggingFace)      │
└─────────────────────┘
        │
        ▼
Vérifications :
  ✓ Nom du client dans le texte (word boundary regex)
  ✓ "sky07" ou "sky 07" présent
  ✓ Sentiment ≠ NÉGATIF
        │
        ▼
  VALIDÉ → +points  |  REJETÉ → message erreur  |  EN ATTENTE → vérif manuelle
```

---

## 11. Design System SKY07

```
Couleur principale : #e8824a  (orange doré)
Fond               : #0a1408  (vert très sombre)
Fond secondaire    : #0d1b0b
Texte              : #f5f0e8
Texte secondaire   : rgba(245,240,232,0.5)
Police titre       : 'Playfair Display' (serif)
Police corps       : 'Inter' (sans-serif)
Radius cartes      : 16px
```

---

## 12. Problèmes connus / Notes

- Le modèle HuggingFace RoBERTa (~500MB) se télécharge automatiquement au **premier appel** OCR. Prévoir ~2min.
- L'OCR EasyOCR peut mal lire "SKY07" comme "sky 9" — le regex `sky\s*0?7` gère les cas courants.
- `pin_memory` warning de PyTorch est normal sur machine sans GPU, n'affecte pas le fonctionnement.
- La clé Gemini fournie peut avoir quota 0 — l'OCR fallback est opérationnel sans elle.
- Le `.env` est dans `.gitignore` — Yasser doit créer son propre `.env` à partir de ce fichier.
