# Flow Serveur — Documentation exhaustive

Documentation du flux complet du rôle **serveur** dans MangerManger : plan des tables, prise de commande, suivi cuisine, clôture et paiement.

---

## Sommaire

1. [Contrôle d'accès et rôles autorisés](#1-contrôle-daccès-et-rôles-autorisés)
2. [Routage frontend — pages serveur](#2-routage-frontend--pages-serveur)
3. [Layout et navigation sidebar](#3-layout-et-navigation-sidebar)
4. [Modèles de données](#4-modèles-de-données)
5. [Énumérations clés](#5-énumérations-clés)
6. [Page ServeurTables — Plan des tables](#6-page-serveurttables--plan-des-tables)
7. [Page ServeurCommande — Prise de commande complète](#7-page-serveurcommande--prise-de-commande-complète)
8. [Cycle de vie complet d'une commande](#8-cycle-de-vie-complet-dune-commande)
9. [Endpoints API utilisés par le serveur](#9-endpoints-api-utilisés-par-le-serveur)
10. [Clôture et intégration fidélité](#10-clôture-et-intégration-fidélité)
11. [Annulation de commande](#11-annulation-de-commande)
12. [Commandes QR depuis table — Cas particulier](#12-commandes-qr-depuis-table--cas-particulier)
13. [Mécanisme de mise à jour en temps réel (polling)](#13-mécanisme-de-mise-à-jour-en-temps-réel-polling)
14. [Notifications et alertes](#14-notifications-et-alertes)
15. [Gestion des erreurs et cas limites](#15-gestion-des-erreurs-et-cas-limites)
16. [Fonctions API — référence complète (api.js)](#16-fonctions-api--référence-complète-apijs)
17. [Sécurité et authentification](#17-sécurité-et-authentification)

---

## 1. Contrôle d'accès et rôles autorisés

### Côté backend (security.py)

L'accès aux routes serveur repose sur le système `require_role` défini dans `backend/app/core/security.py` :

```python
def require_role(*roles):
    def checker(current_user=Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return current_user
    return checker
```

Le token JWT est extrait de l'en-tête `Authorization: Bearer <token>`. La fonction `get_current_user` décode le token, récupère l'identifiant (`sub` du payload), puis charge l'objet `Employe` depuis la base de données. Si l'employé n'existe plus ou est inactif (`actif=False`), une erreur 401 est renvoyée.

**Rôles autorisés sur les routes commandes :**

| Endpoint | Rôles autorisés |
|---|---|
| `POST /api/commandes/` | `serveur`, `gerant` |
| `POST /api/commandes/{id}/envoyer-cuisine` | `serveur`, `gerant` |
| `POST /api/commandes/{id}/cloturer` | `serveur`, `gerant` |
| `POST /api/commandes/{id}/annuler` | `serveur`, `gerant` |
| `GET /api/commandes/` | `serveur`, `gerant` |
| `GET /api/commandes/{id}/suivi` | `serveur`, `gerant` |
| `PUT /api/commandes/{id}/modifier` | `serveur`, `gerant` |
| `PUT /api/commandes/{id}/ligne/{ligne_id}/quantite` | `serveur`, `gerant` |
| `DELETE /api/commandes/{id}/ligne/{ligne_id}` | `serveur`, `gerant` |
| `POST /api/commandes/{id}/ajouter-plat` | `serveur`, `gerant` |
| `GET /api/commandes/client-prizes` | `serveur`, `gerant` |
| `POST /api/commandes/{id}/appliquer-reduction` | `serveur`, `gerant` |

### Côté frontend (App.jsx)

La route `/serveur` est protégée par le composant `ProtectedRoute` avec les rôles `['serveur', 'gerant']` :

```jsx
<Route
  path="/serveur"
  element={
    <ProtectedRoute roles={['serveur', 'gerant']}>
      <Layout role="serveur" />
    </ProtectedRoute>
  }
>
  <Route index element={<ServeurTables />} />
  <Route path="commande" element={<ServeurCommande />} />
</Route>
```

Cela signifie que **le gérant peut également accéder à l'interface serveur** et effectuer toutes les actions : prendre une commande, l'envoyer en cuisine, la clôturer. La séparation se fait uniquement via la navigation (sidebar différente selon le rôle).

---

## 2. Routage frontend — pages serveur

Deux pages composent l'interface serveur :

| Route | Composant | Description |
|---|---|---|
| `/serveur` | `ServeurTables` | Plan des tables, vue d'ensemble, commandes actives |
| `/serveur/commande` | `ServeurCommande` | Prise de commande, suivi, clôture |

La page `ServeurCommande` reçoit ses paramètres via la query string (URL params) :

| Paramètre | Type | Description |
|---|---|---|
| `table_id` | `int` | Identifiant de la table sélectionnée |
| `table_num` | `string` | Numéro affiché de la table (pour l'affichage) |
| `commande_id` | `int` (optionnel) | Si présent, ouvre directement le suivi d'une commande existante |
| `edit_qr` | `"1"` (optionnel) | Mode édition d'une commande QR espèces |

Exemple de navigation depuis `ServeurTables` vers une nouvelle commande :
```javascript
navigate(`/serveur/commande?table_id=${table.id}&table_num=${table.numero}`)
```

Exemple de navigation vers le suivi d'une commande existante :
```javascript
navigate(`/serveur/commande?table_id=${cmd.table_id}&table_num=${tableNum}&commande_id=${cmd.id}`)
```

---

## 3. Layout et navigation sidebar

Le composant `Layout` (`frontend/src/components/shared/Layout.jsx`) affiche une sidebar sombre (fond `bg-gray-900`) commune à tous les rôles. Pour le rôle serveur, la navigation est réduite à deux entrées :

```javascript
const SERVEUR_NAV = [
  { to: '/serveur', end: true, label: 'Tables', icon: <...> },
  { to: '/serveur/commande', label: 'Commande', icon: <...> },
]
```

Le lien actif est mis en surbrillance avec la classe `bg-amber-500 text-white`. Les liens inactifs affichent `text-gray-400 hover:text-white hover:bg-gray-800`.

Le bas de la sidebar affiche le nom et l'identifiant de l'employé connecté ainsi qu'un bouton de déconnexion. La cloche de notifications (`NotifBell`) est réservée au rôle gérant uniquement — elle n'apparaît pas dans l'interface serveur.

---

## 4. Modèles de données

Tous les modèles sont définis dans `backend/app/models/models.py`.

### Modèle `Commande`

```python
class Commande(Base):
    __tablename__ = "commandes"

    id = Column(Integer, primary_key=True, index=True)
    code_unique = Column(String(30), unique=True, index=True)  # CMD-20260411-0042
    date_heure = Column(DateTime, server_default=func.now())
    origine = Column(Enum(OrigineCommandeEnum), default=OrigineCommandeEnum.serveur)
    statut = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)
    montant_total = Column(Float, default=0)

    employe_id         = Column(Integer, ForeignKey("employes.id"), nullable=True)
    table_id           = Column(Integer, ForeignKey("tables.id"), nullable=True)
    cuisinier_id       = Column(Integer, ForeignKey("employes.id"), nullable=True)
    client_fidelite_id = Column(Integer, ForeignKey("clients_fidelite.id"), nullable=True)

    employe   = relationship("Employe", back_populates="commandes", foreign_keys="Commande.employe_id")
    cuisinier = relationship("Employe", foreign_keys="Commande.cuisinier_id")
    table     = relationship("Table", back_populates="commandes")
    lignes    = relationship("LigneCommande", back_populates="commande")
    paiement  = relationship("Paiement", back_populates="commande", uselist=False)
```

Points importants :
- `code_unique` : format `CMD-YYYYMMDD-XXXX` (ex: `CMD-20260621-4782`), généré automatiquement au moment de la création
- `employe_id` : le serveur qui a créé la commande
- `cuisinier_id` : assigné automatiquement quand un cuisinier prend en charge la commande (passage en `en_preparation`)
- `client_fidelite_id` : lié à la clôture si le client fournit son identifiant fidélité

### Modèle `LigneCommande`

```python
class LigneCommande(Base):
    __tablename__ = "lignes_commande"

    id = Column(Integer, primary_key=True, index=True)
    quantite = Column(Integer, nullable=False, default=1)
    prix_unitaire = Column(Float, nullable=False)
    note = Column(Text)          # "sans oignon", "bien cuit"
    statut = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)

    commande_id = Column(Integer, ForeignKey("commandes.id"))
    plat_id     = Column(Integer, ForeignKey("plats.id"))

    commande = relationship("Commande", back_populates="lignes")
    plat     = relationship("Plat", back_populates="lignes")
```

Points importants :
- Chaque ligne représente un plat dans la commande avec sa quantité et son prix capturé au moment de la commande (pas lié à des modifications ultérieures du menu)
- Le champ `note` permet des instructions spéciales par plat (allergies, cuisson, etc.)
- Le `statut` de la ligne est indépendant du statut de la commande : une ligne peut être `prete` alors que d'autres sont encore `en_cours`

### Modèle `Paiement`

```python
class Paiement(Base):
    __tablename__ = "paiements"

    id = Column(Integer, primary_key=True, index=True)
    montant = Column(Float, nullable=False)
    date_heure = Column(DateTime, server_default=func.now())
    mode = Column(Enum(ModePaiementEnum), nullable=False)
    statut = Column(Enum(StatutPaiementEnum), default=StatutPaiementEnum.en_attente)
    reference_transaction = Column(String(200))   # ID Stripe ou référence externe

    commande_id = Column(Integer, ForeignKey("commandes.id"), unique=True)
    commande = relationship("Commande", back_populates="paiement")
```

Points importants :
- Un seul paiement par commande (`unique=True` sur `commande_id`)
- La `reference_transaction` stocke l'ID PaymentIntent Stripe pour les paiements en ligne
- Le statut `en_attente` est utilisé pour les paiements espèces QR non encore validés par un serveur

### Modèle `Table`

```python
class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True, nullable=False)
    capacite = Column(Integer, nullable=False)
    emplacement = Column(Enum(EmplacementEnum), default=EmplacementEnum.interieur)
    statut = Column(Enum(StatutTableEnum), default=StatutTableEnum.libre)
    qr_code_url = Column(String(500))   # QR code en base64
```

### Modèle `Notification`

```python
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(500), nullable=False)
    type = Column(String(50), default="info")   # info | alerte | annulation
    lu = Column(Boolean, default=False)
    date_heure = Column(DateTime, server_default=func.now())
```

Les notifications sont créées automatiquement lors d'annulations de commande et sont destinées au gérant (visibles via la cloche de notifications dans le Layout gérant).

---

## 5. Énumérations clés

### `StatutCommandeEnum`

```python
class StatutCommandeEnum(str, enum.Enum):
    en_cours        = "en_cours"          # Commande créée, pas encore envoyée
    envoyee         = "envoyee"           # Envoyée en cuisine, en attente de prise en charge
    en_preparation  = "en_preparation"   # Un cuisinier l'a prise en charge
    prete           = "prete"            # Tous les plats sont prêts
    cloturee        = "cloturee"         # Commande servie et payée
    annulee         = "annulee"          # Annulée avant clôture
    annulee_partielle = "annulee_partielle"  # Annulation partielle de lignes
    # Statuts ligne uniquement :
    rupture   = "rupture"    # Ingrédient manquant, ligne abandonnée
    remplacee = "remplacee"  # Ligne remplacée par un autre plat
```

### `OrigineCommandeEnum`

```python
class OrigineCommandeEnum(str, enum.Enum):
    serveur   = "serveur"    # Commande créée par un serveur/gérant via l'interface
    qr_table  = "qr_table"  # Commande passée directement par le client via QR code
```

Cette distinction est essentielle : les commandes QR en cours avec paiement espèces nécessitent une intervention du serveur avant d'être envoyées en cuisine.

### `StatutTableEnum`

```python
class StatutTableEnum(str, enum.Enum):
    libre    = "libre"     # Table disponible → fond vert
    occupee  = "occupee"   # Table avec commande active → fond rouge
    reservee = "reservee"  # Table réservée → fond bleu
```

### `ModePaiementEnum`

```python
class ModePaiementEnum(str, enum.Enum):
    especes    = "especes"
    carte      = "carte"
    google_pay = "google_pay"
    apple_pay  = "apple_pay"
    en_ligne   = "en_ligne"   # Paiement Stripe via QR
```

### `StatutPaiementEnum`

```python
class StatutPaiementEnum(str, enum.Enum):
    en_attente       = "en_attente"
    valide           = "valide"
    rembourse        = "rembourse"
    rembourse_partiel = "rembourse_partiel"
    impaye           = "impaye"
```

### `EmplacementEnum`

```python
class EmplacementEnum(str, enum.Enum):
    interieur = "interieur"
    terrasse  = "terrasse"
    mezzanine = "mezzanine"
```

---

## 6. Page ServeurTables — Plan des tables

Fichier : `frontend/src/pages/ServeurTables.jsx`

### 6.1 Initialisation et chargement

Au montage du composant, deux appels API sont lancés en parallèle avec `Promise.all` :

```javascript
const [t, c] = await Promise.all([getTables(), toutesCommandes()])
```

- `getTables()` → `GET /api/tables/` : liste de toutes les tables (numéro, capacité, emplacement, statut)
- `toutesCommandes()` → `GET /api/commandes/` : 50 dernières commandes (filtrées ensuite côté frontend)

### 6.2 Filtrage des commandes actives

Seules les commandes pertinentes sont conservées pour l'affichage :

```javascript
c.data.forEach(cmd => {
  if (cmd.statut === 'cloturee' || cmd.statut === 'annulee') return
  // Ignorer les commandes QR en_cours SAUF celles avec paiement espèces en attente
  if (cmd.statut === 'en_cours' && cmd.origine === 'qr_table' && !cmd.especes_en_attente) return
  map[cmd.table_id] = cmd
  actives.push(cmd)
})
```

Un dictionnaire `commandesActives` est construit avec `table_id` comme clé, permettant une association rapide table → commande.

### 6.3 Polling automatique toutes les 8 secondes

```javascript
useEffect(() => {
  load()
  const id = setInterval(load, 8000)
  return () => clearInterval(id)
}, [load])
```

Un intervalle de **8 secondes** recharge automatiquement l'état des tables et des commandes. L'utilisateur peut également forcer un rechargement via le bouton "Actualiser" en haut à droite.

### 6.4 Code couleur des tables

```javascript
const STATUT_TABLE = {
  libre:    { label: 'Libre',    bg: 'bg-green-50 border-green-300',  text: 'text-green-700',  dot: 'bg-green-400'  },
  occupee:  { label: 'Occupée',  bg: 'bg-red-50 border-red-300',      text: 'text-red-700',    dot: 'bg-red-400'    },
  reservee: { label: 'Réservée', bg: 'bg-blue-50 border-blue-300',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
}
```

| Statut | Couleur de fond | Couleur de bordure | Couleur du texte | Point indicateur |
|---|---|---|---|---|
| `libre` | Vert clair `bg-green-50` | `border-green-300` | `text-green-700` | `bg-green-400` |
| `occupee` | Rouge clair `bg-red-50` | `border-red-300` | `text-red-700` | `bg-red-400` |
| `reservee` | Bleu clair `bg-blue-50` | `border-blue-300` | `text-blue-700` | `bg-blue-400` |

Lorsqu'une commande est à l'état `prete` (tous les plats prêts), la carte de la table reçoit en plus un anneau vert (`ring-2 ring-green-400`) et une icône de cloche.

### 6.5 Affichage des tables par emplacement

Les tables sont regroupées par emplacement (`interieur`, `terrasse`, `mezzanine`) :

```javascript
const emplacements = [...new Set(tables.map(t => t.emplacement))]

emplacements.map(emp => (
  <div key={emp} className="mb-8">
    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 capitalize">{emp}</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {tables.filter(t => t.emplacement === emp).map(table => { ... })}
    </div>
  </div>
))
```

La grille est responsive : 2 colonnes sur mobile, 3 sur tablette, 4-5 sur grand écran.

### 6.6 Contenu d'une carte de table

Chaque carte affiche :
- Le numéro de la table : `T{table.numero}` en grand et gras
- La capacité : `{table.capacite} pers.`
- Le statut de la commande active (si existante) : badge coloré
- Le badge `QR` si la commande provient d'un QR code
- Sur table libre : le texte d'invitation `Appuyer pour commander`

```javascript
const STATUT_CMD = {
  en_cours:       { label: 'En cours',           badge: 'bg-gray-100 text-gray-600'    },
  envoyee:        { label: 'En attente cuisine', badge: 'bg-blue-100 text-blue-700'  },
  en_preparation: { label: 'En préparation',     badge: 'bg-amber-100 text-amber-700'  },
  prete:          { label: 'Prête !',            badge: 'bg-green-100 text-green-700'  },
}
```

### 6.7 Comportement au clic sur une table

```javascript
function handleTableClick(table) {
  const cmdActive = commandesActives[table.id]
  if (table.statut === 'libre' && !cmdActive) {
    // Table libre → naviguer vers la prise de commande
    navigate(`/serveur/commande?table_id=${table.id}&table_num=${table.numero}`)
  } else {
    // Table occupée ou commande active → ouvrir le panel d'action
    setSelected(s => s?.id === table.id ? null : table)
  }
}
```

- **Table libre sans commande** : navigation immédiate vers `ServeurCommande` avec les paramètres de la table
- **Table occupée / commande active** : affichage d'un panel d'action en haut de la page

### 6.8 Panel d'action (table sélectionnée)

Lorsqu'une table est sélectionnée (clic sur une table occupée ou réservée), un panneau s'affiche avec :

- Le numéro, le statut, la capacité et l'emplacement de la table
- Bouton "Libérer la table" (si statut non libre) → appel `changerStatutTable(tableId, 'libre')`
- Bouton "Voir commande →" (si commande active) → navigation vers `ServeurCommande` en mode suivi

```javascript
async function libererTable(tableId) {
  await changerStatutTable(tableId, 'libre')
  setSelected(null)
  load()
}
```

### 6.9 Section commandes en cuisine

En haut de la page, avant le plan des tables, une section liste les commandes dont le statut est `envoyee`, `en_preparation` ou `prete`. Chaque carte affiche :

- Le code unique de la commande et le numéro de table
- Le badge QR si applicable
- Le statut coloré (bleu=en attente, ambre=en préparation, vert=prête)
- Un bouton "Suivre →" qui navigue vers le détail de la commande

Les commandes prêtes sont entourées d'une bordure verte et affichent une cloche.

### 6.10 Section commandes QR espèces en attente

Une section orange dédiée liste les commandes QR dont le mode de paiement est espèces et qui sont encore en `en_cours` (le serveur doit valider avant envoi en cuisine) :

- Badge "Espèces" orange
- Montant en Dh
- Bouton "Modifier & envoyer →" qui navigue en mode `edit_qr=1`

---

## 7. Page ServeurCommande — Prise de commande complète

Fichier : `frontend/src/pages/ServeurCommande.jsx`

Cette page gère trois étapes distinctes :

| Étape (`step`) | Description |
|---|---|
| `select` | Parcours du menu et sélection des plats |
| `view` | Récapitulatif de la commande créée, avant envoi en cuisine |
| `suivi` | Suivi en temps réel de l'avancement de la commande en cuisine |

### 7.1 Détermination de l'étape initiale

```javascript
const [step, setStep] = useState(commandeIdParam && !isEditQR ? 'suivi' : 'select')
```

- Si `commande_id` est présent et `edit_qr` est absent → étape `suivi` (on suit une commande existante)
- Sinon → étape `select` (nouvelle commande ou modification QR)

### 7.2 Étape SELECT — Parcours du menu

Le menu est chargé via `getMenu()` → `GET /api/plats/categories`. Il renvoie les catégories avec leurs plats (uniquement les plats ayant `disponible=true` et `statut=valide`).

Structure de la réponse :
```json
[
  {
    "id": 1,
    "nom": "Entrées",
    "plats": [
      { "id": 12, "nom": "Salade César", "prix": 45, "description": "...", "disponible": true }
    ]
  }
]
```

#### Affichage du menu par catégorie

Chaque catégorie est affichée avec son nom en titre (gris majuscule), suivi des cartes de plats. Les plats non disponibles (`disponible=false`) sont filtrés et n'apparaissent pas.

Chaque carte de plat contient :
- Le nom du plat
- La description (tronquée à une ligne avec `line-clamp-1`)
- Le prix en Dh
- Un champ de saisie "Note" (visible uniquement si le plat est sélectionné)
- Les boutons +/- pour ajuster la quantité

#### Gestion des quantités et notes

```javascript
function addPlat(platId) {
  setLignes(prev => ({
    ...prev,
    [platId]: { quantite: (prev[platId]?.quantite ?? 0) + 1, note: prev[platId]?.note ?? '' }
  }))
}

function removePlat(platId) {
  setLignes(prev => {
    const updated = { ...prev }
    if (updated[platId]?.quantite > 1)
      updated[platId] = { ...updated[platId], quantite: updated[platId].quantite - 1 }
    else
      delete updated[platId]
    return updated
  })
}

function setNote(platId, note) {
  setLignes(prev => ({ ...prev, [platId]: { ...prev[platId], note } }))
}
```

L'état `lignes` est un objet où la clé est l'`id` du plat et la valeur est `{ quantite, note }`.

#### Panneau récapitulatif (panier)

À droite du menu (colonne fixe de 256px), un panier affiche :
- La liste des plats sélectionnés avec leurs quantités
- Le nombre total d'articles
- Le bouton "Créer la commande" (désactivé si aucun plat sélectionné)

En mode `edit_qr`, le bouton devient orange et intitulé "Valider & envoyer en cuisine".

### 7.3 Création de la commande

#### Appel API

```javascript
async function handleCreer() {
  setSending(true)
  try {
    if (isEditQR && commandeIdParam) {
      // Mode édition QR : modifier puis envoyer directement
      await modifierCommande(commandeIdParam, lignesArr())
      await envoyerCuisine(commandeIdParam)
      navigate('/serveur')
    } else {
      const res = await creerCommande({ table_id: tableId, lignes: lignesArr() })
      setCommande(res.data)
      setStep('view')
    }
  } finally {
    setSending(false)
  }
}
```

#### Payload envoyé au backend

```javascript
const lignesArr = () => Object.entries(lignes).map(([plat_id, l]) => ({
  plat_id: parseInt(plat_id),
  quantite: l.quantite,
  note: l.note || '',
}))

// Exemple :
{
  "table_id": 3,
  "lignes": [
    { "plat_id": 12, "quantite": 2, "note": "sans oignon" },
    { "plat_id": 7,  "quantite": 1, "note": "" }
  ]
}
```

#### Traitement backend (`POST /api/commandes/`)

```python
@router.post("/")
def creer_commande(data: CommandeCreate, db: Session = Depends(get_db),
                   user=Depends(require_role("serveur", "gerant"))):
    commande = Commande(
        code_unique=generer_code_unique(),   # CMD-20260621-4782
        table_id=data.table_id,
        employe_id=user.id,
        origine=OrigineCommandeEnum(data.origine),
        statut=StatutCommandeEnum.en_cours
    )
    db.add(commande)
    db.flush()

    total = 0
    for ligne_data in data.lignes:
        plat = db.query(Plat).filter(Plat.id == ligne_data.plat_id).first()
        ligne = LigneCommande(
            commande_id=commande.id,
            plat_id=plat.id,
            quantite=ligne_data.quantite,
            prix_unitaire=plat.prix,    # prix capturé à la création
            note=ligne_data.note
        )
        db.add(ligne)
        total += plat.prix * ligne_data.quantite

    commande.montant_total = total

    if data.table_id:
        table = db.query(Table).filter(Table.id == data.table_id).first()
        if table:
            table.statut = "occupee"   # La table passe automatiquement en "occupée"

    db.commit()
    db.refresh(commande)
    return commande
```

Points importants :
- Le `code_unique` est généré avec la date du jour + 4 chiffres aléatoires
- Le `prix_unitaire` de chaque ligne est capturé au moment de la commande
- La table est automatiquement passée en statut `occupee`
- L'`employe_id` est le serveur connecté (extrait du token JWT)

### 7.4 Étape VIEW — Récapitulatif avant envoi

Après la création, la page passe en mode `view` affichant :
- Le code unique de la commande (`CMD-YYYYMMDD-XXXX`)
- Un badge de statut coloré
- La liste des lignes avec plat, note et quantité
- Deux boutons : "Envoyer en cuisine" et "Annuler"

### 7.5 Envoi en cuisine

```javascript
async function handleEnvoyer() {
  setSending(true)
  await envoyerCuisine(commande.id)
  setSending(false)
  setStep('suivi')
  startPolling(commande.id)
}
```

#### Appel API

```
POST /api/commandes/{commande_id}/envoyer-cuisine
```

Backend :
```python
@router.post("/{commande_id}/envoyer-cuisine")
def envoyer_cuisine(commande_id: int, ...):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    commande.statut = StatutCommandeEnum.envoyee
    db.commit()
    return {"message": "Commande envoyée en cuisine", "code": commande.code_unique}
```

La commande passe de `en_cours` à `envoyee`. Elle apparaît immédiatement dans l'interface cuisinier (`GET /api/commandes/cuisine`).

Après l'envoi, le frontend passe en mode `suivi` et démarre le polling.

### 7.6 Étape SUIVI — Suivi en temps réel

#### Démarrage du polling

```javascript
const startPolling = useCallback((commandeId) => {
  if (pollingRef.current) clearInterval(pollingRef.current)
  const poll = async () => {
    try {
      const r = await suiviCommande(commandeId)
      setSuivi(r.data)
    } catch { /* silent */ }
  }
  poll()
  pollingRef.current = setInterval(poll, 5000)
}, [])
```

Un polling de **5 secondes** interroge l'endpoint de suivi. Les erreurs sont silencieuses (pas de message d'erreur affiché si une requête échoue).

#### Endpoint de suivi

```
GET /api/commandes/{commande_id}/suivi
```

Réponse :
```json
{
  "id": 42,
  "code_unique": "CMD-20260621-4782",
  "statut": "en_preparation",
  "all_pret": false,
  "cuisinier": "Jean Martin",
  "lignes": [
    { "id": 101, "plat_nom": "Salade César", "quantite": 2, "note": "sans oignon", "statut": "prete" },
    { "id": 102, "plat_nom": "Entrecôte",    "quantite": 1, "note": "",             "statut": "en_preparation" }
  ]
}
```

Le champ `all_pret` est `true` lorsque toutes les lignes ont le statut `prete`.

#### Affichage du cuisinier assigné

```jsx
{suivi.cuisinier && (
  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
    <span>👨‍🍳</span>
    <span>Pris en charge par <strong>{suivi.cuisinier}</strong></span>
  </div>
)}
{!suivi.cuisinier && suivi.statut === 'envoyee' && (
  <div className="... bg-amber-50 ...">
    <span>⏳</span>
    <span>En attente qu'un cuisinier prenne en charge…</span>
  </div>
)}
```

#### Code couleur des lignes en suivi

```javascript
const STATUT_LIGNE_LABEL = {
  en_cours:       { label: 'En attente',     cls: 'bg-gray-100 text-gray-500' },
  en_preparation: { label: 'En préparation', cls: 'bg-amber-100 text-amber-700' },
  prete:          { label: 'Prêt ✓',         cls: 'bg-green-100 text-green-700' },
}
```

La légende en bas de la liste rappelle : "Modifiable | En préparation | Prêt"

#### Alerte "Tout est prêt"

Quand `all_pret` est `true`, une bannière verte s'affiche :

```jsx
{suivi.all_pret && (
  <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
    <span className="text-2xl">🔔</span>
    <div>
      <p className="font-bold text-green-800">Tout est prêt !</p>
      <p className="text-sm text-green-600">La commande peut être servie.</p>
    </div>
  </div>
)}
```

Le bouton de clôture passe également de gris à vert quand `all_pret=true`.

### 7.7 Modification en cours de suivi

Le serveur peut modifier la commande pendant les statuts `envoyee` et `en_preparation`. Les lignes au statut `en_cours` (pas encore prises par la cuisine) sont modifiables ; les lignes `en_preparation` ou `prete` sont en lecture seule.

#### Modification de quantité d'une ligne

Uniquement si `ligne.statut === 'en_cours'` :

```javascript
async function handleModifierQty(cmdId, ligneId, newQty) {
  if (newQty < 1) return
  setModifyingLigne(ligneId)
  try {
    await modifierQuantiteLigne(cmdId, ligneId, newQty)
    const r = await suiviCommande(cmdId)
    setSuivi(r.data)
  } catch (err) {
    alert(err.response?.data?.detail || 'Impossible de modifier')
  } finally { setModifyingLigne(null) }
}
```

Appel : `PUT /api/commandes/{cmdId}/ligne/{ligneId}/quantite` avec `{ quantite: newQty }`

Backend : vérifie que `ligne.statut === 'en_cours'`, refuse si en préparation, recalcule `montant_total`.

#### Suppression d'une ligne

```javascript
async function handleSupprimerLigne(cmdId, ligneId) {
  if (!window.confirm('Supprimer ce plat de la commande ?')) return
  await supprimerLigne(cmdId, ligneId)
  const r = await suiviCommande(cmdId)
  setSuivi(r.data)
}
```

Appel : `DELETE /api/commandes/{cmdId}/ligne/{ligneId}`

Backend : refuse si `ligne.statut !== 'en_cours'`, recalcule le total.

#### Ajout d'un plat à la commande existante

Disponible pendant `envoyee` et `en_preparation` :

```jsx
{['envoyee', 'en_preparation'].includes(suivi.statut) && (
  <button onClick={() => setShowAjouterMenu(true)}>
    + Ajouter un plat
  </button>
)}
```

Le formulaire d'ajout permet de :
1. Rechercher un plat par nom (filtre sur la liste complète du menu)
2. Sélectionner un plat
3. Définir la quantité avec les boutons +/-
4. Ajouter une note optionnelle
5. Confirmer l'ajout

```javascript
async function handleAjouterPlat(cmdId) {
  await ajouterPlatCommande(cmdId, platSelectionne.id, ajouterQty, ajouterNote)
  const r = await suiviCommande(cmdId)
  setSuivi(r.data)
  annulerAjouter()
}
```

Appel : `POST /api/commandes/{cmdId}/ajouter-plat` avec `{ plat_id, quantite, note }`

La nouvelle ligne est créée avec `statut=en_cours` et est immédiatement visible dans l'interface cuisine.

---

## 8. Cycle de vie complet d'une commande

### 8.1 Diagramme des transitions de statut

```
[Création par serveur]
        │
        ▼
   EN_COURS ──────────────────────────────────────────► ANNULEE
        │                                              (annuler avant envoi)
        │ envoyerCuisine()
        ▼
    ENVOYEE ──────────────────────────────────────────► ANNULEE
        │                                              (annuler pendant attente)
        │ cuisinier prend en charge (majStatutCommande)
        ▼
  EN_PREPARATION ────────────────────────────────────► ANNULEE
        │                                              (annuler pendant préparation)
        │ toutes les lignes marquées prêtes
        ▼
     PRETE ─────────────────────────────────────────► (pas d'annulation possible ici)
        │
        │ cloturerCommande()
        ▼
   CLOTUREE (terminale)
```

### 8.2 Transitions par ligne de commande

Chaque ligne suit son propre cycle (indépendant des autres lignes) :

```
EN_COURS → EN_PREPARATION → PRETE
```

Quand **toutes** les lignes passent en `prete`, la commande passe automatiquement en `prete` :

```python
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

### 8.3 Déduction des ingrédients

Lorsqu'un cuisinier marque un plat comme `prete`, les stocks d'ingrédients sont automatiquement déduits :

```python
if nouveau_statut == StatutCommandeEnum.prete and ligne.statut != StatutCommandeEnum.prete:
    liens = db.query(PlatIngredient).filter(PlatIngredient.plat_id == ligne.plat_id).all()
    for lien in liens:
        ingredient = db.query(Ingredient).filter(Ingredient.id == lien.ingredient_id).first()
        if ingredient:
            ingredient.quantite_stock = max(0, ingredient.quantite_stock - lien.quantite * ligne.quantite)
```

Le stock ne peut pas devenir négatif (plancher à 0).

---

## 9. Endpoints API utilisés par le serveur

### 9.1 Récapitulatif de tous les endpoints

| Méthode | Endpoint | Description | Rôles |
|---|---|---|---|
| `GET` | `/api/tables/` | Liste toutes les tables | public |
| `PUT` | `/api/tables/{id}/statut` | Changer le statut d'une table | `serveur`, `gerant` |
| `GET` | `/api/plats/categories` | Menu groupé par catégorie | public |
| `GET` | `/api/commandes/` | 50 dernières commandes | `serveur`, `gerant` |
| `POST` | `/api/commandes/` | Créer une commande | `serveur`, `gerant` |
| `POST` | `/api/commandes/{id}/envoyer-cuisine` | Envoyer la commande en cuisine | `serveur`, `gerant` |
| `GET` | `/api/commandes/{id}/suivi` | Suivi en temps réel d'une commande | `serveur`, `gerant` |
| `PUT` | `/api/commandes/{id}/modifier` | Remplacer toutes les lignes (mode QR) | `serveur`, `gerant` |
| `PUT` | `/api/commandes/{id}/ligne/{ligne_id}/quantite` | Modifier la quantité d'une ligne | `serveur`, `gerant` |
| `DELETE` | `/api/commandes/{id}/ligne/{ligne_id}` | Supprimer une ligne | `serveur`, `gerant` |
| `POST` | `/api/commandes/{id}/ajouter-plat` | Ajouter un plat à une commande existante | `serveur`, `gerant` |
| `POST` | `/api/commandes/{id}/cloturer` | Clôturer une commande | `serveur`, `gerant` |
| `POST` | `/api/commandes/{id}/annuler` | Annuler une commande | `serveur`, `gerant` |
| `GET` | `/api/commandes/client-prizes` | Réductions disponibles d'un client | `serveur`, `gerant` |
| `POST` | `/api/commandes/{id}/appliquer-reduction` | Appliquer une réduction fidélité | `serveur`, `gerant` |

### 9.2 Détail des schemas Pydantic

**Création de commande :**
```python
class LigneIn(BaseModel):
    plat_id: int
    quantite: int = 1
    note: Optional[str] = None

class CommandeCreate(BaseModel):
    table_id: Optional[int] = None
    lignes: List[LigneIn]
    origine: str = "serveur"
```

**Clôture :**
```python
class CloturerSchema(BaseModel):
    client_identifiant: Optional[str] = None  # email ou téléphone
```

**Modifier quantité d'une ligne :**
```python
class ModifierQuantiteSchema(BaseModel):
    quantite: int
```

**Ajouter un plat :**
```python
class AjouterPlatSchema(BaseModel):
    plat_id: int
    quantite: int = 1
    note: str = ""
```

**Annulation :**
```python
class AnnulerSchema(BaseModel):
    raison: Optional[str] = None
```

**Appliquer réduction :**
```python
class AppliquerReductionSchema(BaseModel):
    gain_id: int
```

---

## 10. Clôture et intégration fidélité

### 10.1 Déclenchement

Le bouton de clôture est disponible dès que le statut de la commande est dans `['envoyee', 'en_preparation', 'prete']`. Il ne nécessite pas que tous les plats soient prêts (clôture anticipée possible).

Aspect visuel du bouton selon l'état :
- Tous les plats prêts (`all_pret=true`) → bouton vert "✓ Servir et clôturer"
- Plats pas tous prêts → bouton gris "Clôturer la commande"

### 10.2 Modal de clôture

Un modal s'ouvre permettant de :

1. Saisir l'identifiant du client (email ou téléphone) — champ optionnel
2. Rechercher ses réductions disponibles (bouton loupe)
3. Sélectionner une réduction à appliquer
4. Confirmer la clôture

```jsx
<input
  type="text"
  placeholder="email ou téléphone"
  value={clientIdentifiant}
  onChange={e => { setClientIdentifiant(e.target.value); setClientPrizes([]); setSelectedGain(null) }}
  onKeyDown={e => e.key === 'Enter' && rechercherPrizesClient()}
/>
```

La touche Entrée déclenche la recherche.

### 10.3 Recherche des réductions client

```javascript
async function rechercherPrizesClient() {
  const id = clientIdentifiant.trim()
  if (!id) return
  setPrizeLookupLoading(true)
  try {
    const r = await getClientPrizesServeur(id)
    setClientPrizes(r.data.prizes || [])
  } catch { setClientPrizes([]) }
  finally { setPrizeLookupLoading(false) }
}
```

Appel : `GET /api/commandes/client-prizes?identifiant={email_ou_telephone}`

Retourne la liste des gains de type `reduction` non utilisés du client.

### 10.4 Application de la réduction

Si une réduction est sélectionnée, elle est appliquée juste avant la clôture :

```javascript
async function confirmerCloturer() {
  setCloturerLoading(true)
  try {
    if (selectedGain) {
      try {
        await appliquerReductionServeur(cloturerModal, selectedGain.gain_id)
      } catch { /* silencieux */ }
    }
    const res = await cloturerCommande(cloturerModal, clientIdentifiant.trim() || null)
    const { points_gagnes, client_prenom } = res.data
    if (points_gagnes > 0) {
      setCloturerResult({ prenom: client_prenom, points: points_gagnes })
      setTimeout(() => {
        setCloturerModal(null)
        navigate('/serveur')
      }, 2500)
    } else {
      setCloturerModal(null)
      navigate('/serveur')
    }
  } finally {
    setCloturerLoading(false)
  }
}
```

L'appel `appliquerReductionServeur` (`POST /api/commandes/{id}/appliquer-reduction`) :
- Vérifie que le gain existe et n'est pas déjà utilisé
- Calcule le nouveau total : `nouveau_total = ancien_total * (1 - pct / 100)`
- Marque le gain comme `utilise`

### 10.5 Traitement de la clôture backend

```python
@router.post("/{commande_id}/cloturer")
def cloturer_commande(commande_id: int, data: CloturerSchema, ...):
    commande.statut = StatutCommandeEnum.cloturee
    if commande.table:
        commande.table.statut = "libre"   # La table est libérée automatiquement

    points_gagnes = 0
    client_prenom = None
    if data.client_identifiant:
        client = db.query(ClientFidelite).filter(
            (ClientFidelite.email == identifiant) |
            (ClientFidelite.telephone == identifiant)
        ).first()
        if client:
            points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
            commande.client_fidelite_id = client.id
            client_prenom = client.prenom
            if points_gagnes > 0 and client.telephone:
                _notifier_n8n(...)   # Notification WhatsApp via n8n (asynchrone)

    db.commit()
    return {
        "message": "Commande clôturée",
        "code": commande.code_unique,
        "total": commande.montant_total,
        "points_gagnes": points_gagnes,
        "client_prenom": client_prenom,
    }
```

**Effets de la clôture :**
- Statut commande → `cloturee`
- Statut table associée → `libre` (automatique)
- Points fidélité crédités sur le compte client (si identifiant fourni)
- Notification WhatsApp envoyée via n8n (appel webhook en arrière-plan, non bloquant)

### 10.6 Notification de points fidélité

Après clôture avec points gagnés, le modal affiche une animation de célébration :

```jsx
{cloturerResult ? (
  <div className="text-center py-2">
    <div className="text-4xl mb-3">🎉</div>
    <p className="font-bold text-gray-900 text-lg">{cloturerResult.prenom} gagne</p>
    <p className="text-3xl font-black text-green-600 my-1">+{cloturerResult.points} pts</p>
    <p className="text-sm text-gray-400">Crédités sur son compte fidélité</p>
  </div>
) : ( ... )}
```

Le modal se ferme automatiquement après 2,5 secondes et redirige vers `/serveur`.

### 10.7 Notification WhatsApp via n8n

La clôture déclenche (si le client a un numéro de téléphone) un appel webhook vers n8n :

```python
def _notifier_n8n(prenom, telephone, points_gagnes, solde_total, montant, restaurant="SKY07"):
    def _send():
        payload = _json.dumps({
            "prenom":              prenom,
            "telephone":           telephone,
            "points_gagnes":       points_gagnes,
            "solde_total":         solde_total,
            "montant_transaction": montant,
            "lien_compte":         f"{FRONTEND_URL}/client/dashboard",
            "restaurant":          restaurant,
        }).encode()
        req = urllib.request.Request(N8N_WEBHOOK, data=payload, ...)
        urllib.request.urlopen(req, timeout=5)
    threading.Thread(target=_send, daemon=True).start()
```

L'appel est effectué dans un thread daemon séparé et ne bloque pas la réponse HTTP. En cas d'indisponibilité du webhook n8n, l'erreur est seulement loggée.

---

## 11. Annulation de commande

### 11.1 Quand annuler

Le bouton d'annulation est disponible pour les statuts `envoyee` et `en_preparation`. Une commande en cours (`en_cours`) peut aussi être annulée (depuis l'étape `view`).

### 11.2 Modal d'annulation avec raison obligatoire

Une liste de raisons prédéfinies est proposée :

```javascript
const RAISONS_ANNULATION = [
  'Client parti sans commander',
  'Erreur de saisie',
  'Rupture de stock en cuisine',
  'Client a changé d\'avis',
  'Problème de paiement',
  'Commande en double',
  'Table libérée (fin de service)',
  'Autre',
]
```

La raison est obligatoire (le bouton "Confirmer" est désactivé si aucune raison n'est sélectionnée).

### 11.3 Traitement backend de l'annulation

```python
@router.post("/{commande_id}/annuler")
def annuler_commande(commande_id: int, data: AnnulerSchema, ...):
    if commande.statut == StatutCommandeEnum.cloturee:
        raise HTTPException(400, "Commande déjà clôturée")
    if commande.statut == StatutCommandeEnum.annulee:
        raise HTTPException(400, "Commande déjà annulée")

    if commande.table:
        commande.table.statut = "libre"   # Table libérée automatiquement
    commande.statut = StatutCommandeEnum.annulee

    notif = Notification(
        message=f"Commande {code} (Table {table_num}) annulée par {user.prenom} {user.nom} — Raison : {raison}",
        type="annulation"
    )
    db.add(notif)
    db.commit()
```

**Effets de l'annulation :**
- Statut commande → `annulee`
- Table libérée automatiquement
- Notification créée pour le gérant (visible dans la cloche de notifications)

---

## 12. Commandes QR depuis table — Cas particulier

### 12.1 Origine `qr_table`

Les clients peuvent passer commande directement depuis leur smartphone en scannant le QR code de la table. Ces commandes ont `origine='qr_table'`.

### 12.2 Flux normal (paiement Stripe en ligne)

Les commandes QR payées en ligne sont automatiquement envoyées en cuisine lors de la confirmation du paiement. Le serveur n'a pas à intervenir pour ces commandes — elles apparaissent directement dans l'interface cuisinier.

### 12.3 Flux espèces (intervention serveur requise)

Quand un client choisit "paiement espèces" lors d'une commande QR, un enregistrement `Paiement` avec `mode=especes` et `statut=en_attente` est créé. La commande reste en `en_cours`.

**Détection côté backend :**

```python
# Dans toutes_commandes()
pending_cash_ids = set()
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

# Dans la liste retournée :
"especes_en_attente": c.id in pending_cash_ids,
```

**Détection côté frontend :**

```javascript
// ServeurTables.jsx
const commandesEspecesEnAttente = commandesList.filter(c => c.especes_en_attente)
```

Ces commandes apparaissent dans la section orange "Paiement espèces — à envoyer en cuisine".

### 12.4 Traitement par le serveur (mode edit_qr)

Le serveur clique "Modifier & envoyer →" et est redirigé vers `ServeurCommande` avec `edit_qr=1`. Les lignes existantes de la commande QR sont pré-chargées :

```javascript
if (commandeIdParam && isEditQR) {
  const r = await suiviCommande(commandeIdParam)
  const existingLignes = {}
  r.data.lignes?.forEach(l => {
    const plat = m.data.flatMap(c => c.plats ?? []).find(p => p.nom === l.plat_nom)
    if (plat) existingLignes[plat.id] = { quantite: l.quantite, note: l.note || '' }
  })
  setLignes(existingLignes)
  setCommande({ id: commandeIdParam, code_unique: r.data.code_unique })
}
```

Le serveur peut modifier les quantités, ajouter ou supprimer des plats, puis cliquer "Valider & envoyer en cuisine" qui appelle :

```javascript
await modifierCommande(commandeIdParam, lignesArr())   // PUT /{id}/modifier
await envoyerCuisine(commandeIdParam)                  // POST /{id}/envoyer-cuisine
navigate('/serveur')
```

### 12.5 Badge QR dans l'interface

Les commandes d'origine `qr_table` sont distinguées visuellement par un badge ambre "QR" dans les cartes de commande et sur les cartes de table :

```jsx
{cmdActive.origine === 'qr_table' && (
  <span className="text-xs bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">QR</span>
)}
```

---

## 13. Mécanisme de mise à jour en temps réel (polling)

MangerManger utilise exclusivement du **polling HTTP** (pas de WebSocket ni de Server-Sent Events).

### 13.1 Polling dans ServeurTables (8 secondes)

```javascript
useEffect(() => {
  load()
  const id = setInterval(load, 8000)
  return () => clearInterval(id)
}, [load])
```

À chaque cycle de 8 secondes, deux requêtes sont émises en parallèle :
- `GET /api/tables/`
- `GET /api/commandes/`

Le nettoyage du `setInterval` est effectué dans le retour du `useEffect` (prévention des fuites mémoire lors du démontage du composant).

### 13.2 Polling dans ServeurCommande — suivi (5 secondes)

```javascript
const startPolling = useCallback((commandeId) => {
  if (pollingRef.current) clearInterval(pollingRef.current)
  const poll = async () => {
    try {
      const r = await suiviCommande(commandeId)
      setSuivi(r.data)
    } catch { /* silent */ }
  }
  poll()
  pollingRef.current = setInterval(poll, 5000)
}, [])
```

Le `useRef` (`pollingRef`) est utilisé plutôt qu'un état React pour stocker l'ID de l'intervalle, évitant des re-renders inutiles. Le polling est nettoyé :
- Lors du démontage du composant (`useEffect` cleanup)
- Lors de la navigation après clôture ou annulation (`clearInterval(pollingRef.current)`)

### 13.3 Actualisation manuelle

Dans `ServeurTables`, un bouton "Actualiser" permet un rafraîchissement immédiat indépendamment du cycle de polling automatique :

```jsx
<button onClick={load} className="...">
  Actualiser
</button>
```

### 13.4 Polling des notifications gérant (15 secondes)

Le composant `NotifBell` dans `Layout.jsx` maintient son propre polling à 15 secondes pour les notifications du gérant. Ce polling est actif quel que soit la page affichée dans l'interface gérant :

```javascript
useEffect(() => {
  load()
  const id = setInterval(load, 15000)
  return () => clearInterval(id)
}, [])
```

---

## 14. Notifications et alertes

### 14.1 Notifications gérant via `Notification`

Lors d'une annulation de commande, une notification est créée en base de données :

```python
notif = Notification(
    message=f"Commande {code} (Table {table_num}) annulée par {user.prenom} {user.nom} — Raison : {raison}",
    type="annulation"
)
db.add(notif)
```

Types de notification : `info`, `alerte`, `annulation`.

Ces notifications sont visibles uniquement dans la cloche du gérant (`NotifBell`), pas dans l'interface serveur.

### 14.2 Signaux visuels pour le serveur

Le serveur est informé de l'état de la cuisine exclusivement via des signaux visuels dans l'interface :

| Signal | Déclencheur | Affichage |
|---|---|---|
| Anneau vert + cloche sur carte table | Commande `prete` | `ring-2 ring-green-400` + icône cloche |
| Bannière verte "Tout est prêt !" | `suivi.all_pret === true` | Bandeau avec cloche en mode suivi |
| Badge statut coloré sur carte table | Changement de statut de la commande | Rafraîchi toutes les 8s |
| Cuisinier assigné affiché | `suivi.cuisinier !== null` | Affiché en mode suivi, rafraîchi toutes les 5s |

---

## 15. Gestion des erreurs et cas limites

### 15.1 Erreurs HTTP gérées par Axios

L'intercepteur de réponse dans `api.js` gère les erreurs 401 :

```javascript
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const raw = _storageGet('user')
      const user = raw ? JSON.parse(raw) : {}
      const isClient = user.role === 'client' || window.location.pathname.startsWith('/client')
      _storageRemove('token')
      _storageRemove('user')
      window.location.href = isClient ? '/client/login' : '/login'
    }
    return Promise.reject(err)
  }
)
```

En cas d'expiration du token (401), l'utilisateur est automatiquement redirigé vers la page de connexion.

### 15.2 Erreurs lors de la modification de lignes

```javascript
async function handleModifierQty(cmdId, ligneId, newQty) {
  ...
  try {
    await modifierQuantiteLigne(cmdId, ligneId, newQty)
    ...
  } catch (err) {
    alert(err.response?.data?.detail || 'Impossible de modifier')
  }
}
```

Les erreurs métier du backend (plat déjà en préparation, quantité invalide) sont affichées via `alert()` avec le message de détail de l'erreur.

### 15.3 Erreurs silencieuses du polling

Les erreurs de polling sont silencieuses pour éviter de perturber l'utilisateur avec des messages répétitifs lors de problèmes réseau temporaires :

```javascript
const poll = async () => {
  try {
    const r = await suiviCommande(commandeId)
    setSuivi(r.data)
  } catch { /* silent */ }
}
```

### 15.4 Validations backend

| Opération | Condition d'erreur | Code HTTP |
|---|---|---|
| Créer commande | Plat introuvable | 404 |
| Envoyer en cuisine | Commande introuvable | 404 |
| Clôturer | Commande introuvable | 404 |
| Annuler | Déjà clôturée ou annulée | 400 |
| Modifier quantité ligne | Ligne en préparation ou prête | 400 |
| Modifier quantité ligne | Quantité < 1 | 400 |
| Supprimer ligne | Ligne en préparation ou prête | 400 |
| Ajouter plat | Commande non en `envoyee`/`en_preparation` | 400 |
| Appliquer réduction | Gain déjà utilisé | 404 |
| Appliquer réduction | Commande déjà clôturée | 400 |
| Modifier commande QR | Commande pas en `en_cours` | 400 |
| Modifier commande QR | Liste de lignes vide | 400 |

### 15.5 Cas particuliers des tables

- **Table réservée + commande active** : les deux états peuvent coexister. L'affichage montre les deux informations (badge réservée + badge commande).
- **Libération manuelle** : le serveur peut libérer une table manuellement via le panel d'action sans clôturer la commande associée. La commande reste active mais la table devient libre.
- **Commandes QR ignorées** : les commandes QR `en_cours` sans paiement espèces en attente sont filtrées du plan des tables (le serveur n'a pas à s'en occuper).

---

## 16. Fonctions API — référence complète (api.js)

Extrait des fonctions liées au flux serveur depuis `frontend/src/services/api.js` :

```javascript
// Instance Axios configurée
const api = axios.create({ baseURL: '', timeout: 30000 })

// Intercepteur : ajout automatique du token Bearer
api.interceptors.request.use((config) => {
  const token = _storageGet('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Tables
export const getTables          = ()        => api.get('/api/tables/')
export const changerStatutTable = (id, s)   => api.put(`/api/tables/${id}/statut?statut=${s}`)

// Menu
export const getMenu            = ()        => api.get('/api/plats/categories')

// Commandes — serveur
export const creerCommande         = (data)      => api.post('/api/commandes/', data)
export const envoyerCuisine        = (id)        => api.post(`/api/commandes/${id}/envoyer-cuisine`)
export const cloturerCommande      = (id, clientIdentifiant)
                                               => api.post(`/api/commandes/${id}/cloturer`,
                                                           { client_identifiant: clientIdentifiant || null })
export const toutesCommandes       = ()          => api.get('/api/commandes/')
export const suiviCommande         = (id)        => api.get(`/api/commandes/${id}/suivi`)
export const annulerCommande       = (id, raison)
                                               => api.post(`/api/commandes/${id}/annuler`,
                                                           { raison: raison || null })
export const modifierCommande      = (id, lignes)
                                               => api.put(`/api/commandes/${id}/modifier`, { lignes })
export const modifierQuantiteLigne = (cmdId, ligneId, qty)
                                               => api.put(`/api/commandes/${cmdId}/ligne/${ligneId}/quantite`,
                                                          { quantite: qty })
export const supprimerLigne        = (cmdId, ligneId)
                                               => api.delete(`/api/commandes/${cmdId}/ligne/${ligneId}`)
export const ajouterPlatCommande   = (cmdId, plat_id, quantite, note)
                                               => api.post(`/api/commandes/${cmdId}/ajouter-plat`,
                                                           { plat_id, quantite, note: note || '' })

// Fidélité — serveur
export const getClientPrizesServeur  = (identifiant)
                                     => api.get(`/api/commandes/client-prizes?identifiant=${encodeURIComponent(identifiant)}`)
export const appliquerReductionServeur = (commandeId, gain_id)
                                       => api.post(`/api/commandes/${commandeId}/appliquer-reduction`, { gain_id })
```

---

## 17. Sécurité et authentification

### 17.1 Génération du token JWT

Lors du login (`POST /api/auth/login`), le backend génère un token JWT signé avec `SECRET_KEY` (algorithme HS256 par défaut) :

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

Le payload du token contient `{ "sub": identifiant_employe, "exp": timestamp }`.

### 17.2 Vérification du token

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.models import Employe
    payload = decode_token(token)
    identifiant = payload.get("sub")
    if not identifiant:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(Employe).filter(Employe.identifiant == identifiant).first()
    if not user or not user.actif:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user
```

Deux vérifications : le token est valide ET l'employé est toujours actif en base de données. Un compte désactivé par le gérant (`actif=False`) ne peut plus se connecter même avec un token encore valide.

### 17.3 Stockage du token côté frontend

Le token et les données utilisateur sont stockés via les fonctions `storageGet`/`storageRemove` importées depuis `../utils/storage`. Ces fonctions encapsulent probablement `localStorage`.

L'utilisateur connecté est accessible via le hook `useAuth` :

```javascript
import { useAuth } from '../hooks/useAuth'
const { user, login, logout } = useAuth()
// user = { role, nom, prenom, identifiant, access_token }
```

### 17.4 Protection des routes frontend

Le composant `ProtectedRoute` vérifie que l'utilisateur est connecté et a le bon rôle avant d'afficher la page. Si non authentifié, il redirige vers `/login`. Si mauvais rôle, comportement défini dans `ProtectedRoute`.

---

*Documentation générée le 2026-06-21 — MangerManger v1 (branche feature/aymane-fidelite-qr)*
