from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

# ============================================================
# ENUMS
# ============================================================

class RoleEnum(str, enum.Enum):
    gerant = "gerant"
    serveur = "serveur"
    cuisinier = "cuisinier"

class StatutPlatEnum(str, enum.Enum):
    valide = "valide"
    en_attente = "en_attente"
    refuse = "refuse"

class StatutCommandeEnum(str, enum.Enum):
    en_cours = "en_cours"
    envoyee = "envoyee"
    en_preparation = "en_preparation"
    prete = "prete"
    cloturee = "cloturee"

class OrigineCommandeEnum(str, enum.Enum):
    serveur = "serveur"
    qr_table = "qr_table"

class StatutTableEnum(str, enum.Enum):
    libre = "libre"
    occupee = "occupee"
    reservee = "reservee"

class EmplacementEnum(str, enum.Enum):
    interieur = "interieur"
    terrasse = "terrasse"
    mezzanine = "mezzanine"

class TypeReservationEnum(str, enum.Enum):
    standard = "standard"
    local_prive = "local_prive"

class StatutReservationEnum(str, enum.Enum):
    en_attente = "en_attente"
    confirmee = "confirmee"
    annulee = "annulee"

class ModePaiementEnum(str, enum.Enum):
    especes = "especes"
    carte = "carte"
    google_pay = "google_pay"
    apple_pay = "apple_pay"
    en_ligne = "en_ligne"

class StatutPaiementEnum(str, enum.Enum):
    en_attente = "en_attente"
    valide = "valide"
    rembourse = "rembourse"

class StatutAvisEnum(str, enum.Enum):
    en_attente = "en_attente"
    valide = "valide"
    rejete = "rejete"

class SentimentEnum(str, enum.Enum):
    positif = "positif"
    neutre = "neutre"
    negatif = "negatif"

# ============================================================
# MODÈLES
# ============================================================

class Employe(Base):
    __tablename__ = "employes"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    identifiant = Column(String(20), unique=True, nullable=False, index=True)  # ex: GER001
    code_passe = Column(String(255), nullable=False)
    telephone = Column(String(20))
    role = Column(Enum(RoleEnum), nullable=False)
    date_embauche = Column(DateTime, server_default=func.now())
    actif = Column(Boolean, default=True)

    commandes = relationship("Commande", back_populates="employe")
    plats_proposes = relationship("Plat", back_populates="propose_par")


class Categorie(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    ordre = Column(Integer, default=0)

    plats = relationship("Plat", back_populates="categorie")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    quantite_stock = Column(Float, default=0)
    seuil_alerte = Column(Float, default=0)
    unite = Column(String(20))  # kg, L, pièces...

    plats = relationship("PlatIngredient", back_populates="ingredient")


class Plat(Base):
    __tablename__ = "plats"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False)
    description = Column(Text)
    prix = Column(Float, nullable=False)
    image = Column(String(500))
    disponible = Column(Boolean, default=True)
    # Nouveau v2
    statut = Column(Enum(StatutPlatEnum), default=StatutPlatEnum.valide)
    propose_par_id = Column(Integer, ForeignKey("employes.id"), nullable=True)
    motif_refus = Column(Text, nullable=True)

    categorie_id = Column(Integer, ForeignKey("categories.id"))
    categorie = relationship("Categorie", back_populates="plats")
    propose_par = relationship("Employe", back_populates="plats_proposes")
    ingredients = relationship("PlatIngredient", back_populates="plat")
    lignes = relationship("LigneCommande", back_populates="plat")


class PlatIngredient(Base):
    """Table de liaison Plat <-> Ingredient avec quantité nécessaire"""
    __tablename__ = "plat_ingredients"

    id = Column(Integer, primary_key=True)
    plat_id = Column(Integer, ForeignKey("plats.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    quantite = Column(Float, nullable=False)

    plat = relationship("Plat", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="plats")


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True, nullable=False)
    capacite = Column(Integer, nullable=False)
    emplacement = Column(Enum(EmplacementEnum), default=EmplacementEnum.interieur)
    statut = Column(Enum(StatutTableEnum), default=StatutTableEnum.libre)
    qr_code_url = Column(String(500))

    commandes = relationship("Commande", back_populates="table")
    reservations = relationship("Reservation", back_populates="table")


class Commande(Base):
    __tablename__ = "commandes"

    id = Column(Integer, primary_key=True, index=True)
    code_unique = Column(String(30), unique=True, index=True)  # CMD-20260411-0042
    date_heure = Column(DateTime, server_default=func.now())
    origine = Column(Enum(OrigineCommandeEnum), default=OrigineCommandeEnum.serveur)
    statut = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)
    montant_total = Column(Float, default=0)

    employe_id = Column(Integer, ForeignKey("employes.id"), nullable=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)

    employe = relationship("Employe", back_populates="commandes")
    table = relationship("Table", back_populates="commandes")
    lignes = relationship("LigneCommande", back_populates="commande")
    paiement = relationship("Paiement", back_populates="commande", uselist=False)


class LigneCommande(Base):
    __tablename__ = "lignes_commande"

    id = Column(Integer, primary_key=True, index=True)
    quantite = Column(Integer, nullable=False, default=1)
    prix_unitaire = Column(Float, nullable=False)
    note = Column(Text)  # "sans oignon"
    statut = Column(Enum(StatutCommandeEnum), default=StatutCommandeEnum.en_cours)

    commande_id = Column(Integer, ForeignKey("commandes.id"))
    plat_id = Column(Integer, ForeignKey("plats.id"))

    commande = relationship("Commande", back_populates="lignes")
    plat = relationship("Plat", back_populates="lignes")


class Paiement(Base):
    __tablename__ = "paiements"

    id = Column(Integer, primary_key=True, index=True)
    montant = Column(Float, nullable=False)
    date_heure = Column(DateTime, server_default=func.now())
    mode = Column(Enum(ModePaiementEnum), nullable=False)
    statut = Column(Enum(StatutPaiementEnum), default=StatutPaiementEnum.en_attente)
    reference_transaction = Column(String(200))

    commande_id = Column(Integer, ForeignKey("commandes.id"), unique=True)
    commande = relationship("Commande", back_populates="paiement")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    nom_client = Column(String(100), nullable=False)
    telephone = Column(String(20), nullable=False)
    date_heure = Column(DateTime, nullable=False)
    nb_personnes = Column(Integer, nullable=False)
    statut = Column(Enum(StatutReservationEnum), default=StatutReservationEnum.en_attente)
    # Nouveau v2
    type = Column(Enum(TypeReservationEnum), default=TypeReservationEnum.standard)
    code_acces = Column(String(20), nullable=True)       # LOCAL-2026-A3F7
    montant_acompte = Column(Float, nullable=True)
    mode_paiement_local = Column(Enum(ModePaiementEnum), nullable=True)

    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    table = relationship("Table", back_populates="reservations")


class Tombola(Base):
    __tablename__ = "tombolas"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(200), nullable=False)
    lot = Column(String(200), nullable=False)
    date_debut = Column(DateTime, nullable=False)
    date_fin = Column(DateTime, nullable=False)
    active = Column(Boolean, default=True)

    participations = relationship("Avis", back_populates="tombola")


class Avis(Base):
    __tablename__ = "avis"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False)
    screenshot = Column(String(500))           # chemin du fichier uploadé
    code_commande = Column(String(30), nullable=False)
    statut = Column(Enum(StatutAvisEnum), default=StatutAvisEnum.en_attente)
    date_depot = Column(DateTime, server_default=func.now())
    # Nouveau v2 — IA
    score_ia = Column(Float, nullable=True)         # 0.0 → 1.0
    sentiment = Column(Enum(SentimentEnum), nullable=True)
    validee_par_ia = Column(Boolean, nullable=True)

    tombola_id = Column(Integer, ForeignKey("tombolas.id"))
    tombola = relationship("Tombola", back_populates="participations")


class RestaurantInfo(Base):
    __tablename__ = "restaurant_info"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False)
    slogan = Column(String(300), default="")
    description = Column(Text, default="")
    adresse = Column(String(300), default="")
    telephone = Column(String(30), default="")
    email_contact = Column(String(200), default="")
    horaires = Column(String(200), default="")
    logo_url = Column(String(500), default="")
    # Thème & couleurs
    theme = Column(String(20), default="elegant")          # elegant | chaud | moderne
    couleur_principale = Column(String(10), default="#111827")
    # Sections activées (JSON)
    section_menu = Column(Boolean, default=True)
    section_reservations = Column(Boolean, default=True)
    section_tombola = Column(Boolean, default=False)
    section_recrutement = Column(Boolean, default=False)
    section_avis = Column(Boolean, default=True)
    # Réseaux sociaux
    instagram_url = Column(String(300), default="")
    facebook_url = Column(String(300), default="")

    salles_privees = relationship("SallePrivee", back_populates="restaurant")
    offres_emploi = relationship("OffreEmploi", back_populates="restaurant")
    avis_clients = relationship("AvisClient", back_populates="restaurant")


class SallePrivee(Base):
    __tablename__ = "salles_privees"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False)
    description = Column(Text, default="")
    capacite = Column(Integer, nullable=False)
    prix_location = Column(Float, nullable=False)
    photo_url = Column(String(500), default="")
    disponible = Column(Boolean, default=True)

    restaurant_id = Column(Integer, ForeignKey("restaurant_info.id"))
    restaurant = relationship("RestaurantInfo", back_populates="salles_privees")


class OffreEmploi(Base):
    __tablename__ = "offres_emploi"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    type_contrat = Column(String(50), default="CDI")       # CDI | CDD | Stage | Temps partiel
    date_publication = Column(DateTime, server_default=func.now())
    active = Column(Boolean, default=True)

    restaurant_id = Column(Integer, ForeignKey("restaurant_info.id"))
    restaurant = relationship("RestaurantInfo", back_populates="offres_emploi")
    candidatures = relationship("Candidature", back_populates="offre")


class Candidature(Base):
    __tablename__ = "candidatures"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False)
    telephone = Column(String(30), default="")
    message = Column(Text, default="")
    date_depot = Column(DateTime, server_default=func.now())
    lue = Column(Boolean, default=False)

    offre_id = Column(Integer, ForeignKey("offres_emploi.id"))
    offre = relationship("OffreEmploi", back_populates="candidatures")


class AvisClient(Base):
    __tablename__ = "avis_clients"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    note = Column(Integer, nullable=False)                 # 1 à 5
    commentaire = Column(Text, default="")
    statut = Column(Enum(StatutAvisEnum), default=StatutAvisEnum.en_attente)
    sentiment = Column(Enum(SentimentEnum), nullable=True)
    date_depot = Column(DateTime, server_default=func.now())

    restaurant_id = Column(Integer, ForeignKey("restaurant_info.id"))
    restaurant = relationship("RestaurantInfo", back_populates="avis_clients")
