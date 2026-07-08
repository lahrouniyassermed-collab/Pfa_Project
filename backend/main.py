from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
load_dotenv()

from app.core.database import engine, Base
from sqlalchemy import text
from app.api.routes.auth import router as auth_router
from app.api.routes.plats import router as plats_router
from app.api.routes.commandes import router as commandes_router
from app.api.routes.reservations import router as reservations_router
from app.api.routes.tombola import router as tombola_router
from app.api.routes.tables_employes import router_tables, router_employes, router_dashboard
from app.api.routes.restaurant import router_restaurant, router_setup
from app.api.routes.landing import router_landing, router_salles, router_emplois, router_avis_clients
from app.api.routes.ingredients_categories import router_ingredients, router_categories
from app.api.routes.clients import router_clients
from app.api.routes.documents import router_documents
from app.api.routes.qr_commande import router_qr
from app.api.routes.client_fidelite import router as client_fidelite_router
from app.api.routes.gerant_fidelite import router as gerant_fidelite_router
from app.api.routes.modifications_commande import router as modifications_router
from app.api.routes.nutrition import router as nutrition_router
from app.services.scheduler import demarrer_scheduler, arreter_scheduler


# Créer toutes les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MangerManger API",
    description="API REST du système de gestion de restaurant MangerManger",
    version="2.0.0",
)

# CORS — autorise le frontend React (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dossier uploads accessible publiquement
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routes
app.include_router(auth_router)
app.include_router(plats_router)
app.include_router(commandes_router)
app.include_router(reservations_router)
app.include_router(tombola_router)
app.include_router(router_tables)
app.include_router(router_employes)
app.include_router(router_dashboard)
app.include_router(router_restaurant)
app.include_router(router_setup)
app.include_router(router_landing)
app.include_router(router_salles)
app.include_router(router_emplois)
app.include_router(router_avis_clients)
app.include_router(router_ingredients)
app.include_router(router_categories)
app.include_router(router_clients)
app.include_router(router_documents)
app.include_router(router_qr)
app.include_router(client_fidelite_router)
app.include_router(gerant_fidelite_router)
app.include_router(modifications_router)
app.include_router(nutrition_router)

# Démarrage / arrêt du scheduler automatique
@app.on_event("startup")
def startup():
    demarrer_scheduler()
    # Migration : colonne client_fidelite_id sur commandes (idempotent)
    with engine.connect() as conn:
        for migration in [
            "ALTER TABLE commandes ADD COLUMN client_fidelite_id INTEGER REFERENCES clients_fidelite(id)",
            "ALTER TABLE employes ADD COLUMN email VARCHAR(200)",
            # Phase 3 — nutrition + trending
            "ALTER TABLE ingredients ADD COLUMN calories_par_100g REAL",
            "ALTER TABLE ingredients ADD COLUMN proteines_par_100g REAL",
            "ALTER TABLE ingredients ADD COLUMN glucides_par_100g REAL",
            "ALTER TABLE ingredients ADD COLUMN lipides_par_100g REAL",
            "ALTER TABLE ingredients ADD COLUMN fibres_par_100g REAL",
            "ALTER TABLE plats ADD COLUMN vegetarien INTEGER DEFAULT 0",
            "ALTER TABLE plats ADD COLUMN sans_gluten INTEGER DEFAULT 0",
            "ALTER TABLE plats ADD COLUMN allergenes TEXT",
            """CREATE TABLE IF NOT EXISTS nutrition_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plat_id INTEGER UNIQUE NOT NULL,
                taille_portion REAL DEFAULT 100,
                calories REAL DEFAULT 0,
                proteines REAL DEFAULT 0,
                glucides REAL DEFAULT 0,
                lipides REAL DEFAULT 0,
                fibres REAL DEFAULT 0,
                sucre REAL DEFAULT 0,
                sodium REAL DEFAULT 0,
                calcul_auto INTEGER DEFAULT 0
            )""",
            # Phase 2 — post-validation order management
            "ALTER TABLE commandes ADD COLUMN motif_annulation TEXT",
            "ALTER TABLE commandes ADD COLUMN modifications_count INTEGER DEFAULT 0",
            "ALTER TABLE commandes ADD COLUMN flag_urgent INTEGER DEFAULT 0",
            "ALTER TABLE lignes_commande ADD COLUMN motif_annulation TEXT",
            "ALTER TABLE lignes_commande ADD COLUMN remplace_par_id INTEGER",
            "ALTER TABLE reservations ADD COLUMN zone TEXT",
            "ALTER TABLE reservations ADD COLUMN message TEXT",
            "ALTER TABLE paiements ADD COLUMN montant_rembourse REAL DEFAULT 0",
            "ALTER TABLE paiements ADD COLUMN stripe_refund_ids TEXT DEFAULT '[]'",
            "ALTER TABLE clients_fidelite ADD COLUMN reset_code VARCHAR(6)",
            "ALTER TABLE clients_fidelite ADD COLUMN reset_code_expiry DATETIME",
            """CREATE TABLE IF NOT EXISTS modifications_commande (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                commande_id INTEGER NOT NULL,
                ligne_id INTEGER,
                type TEXT NOT NULL,
                effectue_par TEXT NOT NULL,
                description TEXT,
                montant_delta REAL DEFAULT 0,
                stripe_action TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS kds_alertes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                commande_id INTEGER,
                ligne_id INTEGER,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                acquittee INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
        ]:
            try:
                conn.execute(text(migration))
                conn.commit()
            except Exception:
                pass

    # Seed prix_roue — toujours forcer les 8 prix officiels
    from app.core.database import SessionLocal
    from app.models.models import PrixRoue, ConfigFidelite, TypePrixEnum, GainSpin
    PRIX_OFFICIELS = [
        {"nom": "20% OFF",         "type": TypePrixEnum.reduction, "valeur": 20,  "validite_jours": 30},
        {"nom": "Repas gratuit",   "type": TypePrixEnum.gratuit,   "valeur": 150, "validite_jours": 30},
        {"nom": "Double Points",   "type": TypePrixEnum.points,    "valeur": 0,   "validite_jours": 30},
        {"nom": "Chef's Table VIP","type": TypePrixEnum.gratuit,   "valeur": 0,   "validite_jours": 60},
        {"nom": "Boisson offerte", "type": TypePrixEnum.gratuit,   "valeur": 0,   "validite_jours": 30},
        {"nom": "Dessert offert",  "type": TypePrixEnum.gratuit,   "valeur": 0,   "validite_jours": 30},
        {"nom": "10% OFF",         "type": TypePrixEnum.reduction, "valeur": 10,  "validite_jours": 30},
        {"nom": "Rejouer",         "type": TypePrixEnum.rejouer,   "valeur": 0,   "validite_jours": 0},
    ]
    with SessionLocal() as db:
        noms_existants = {p.nom for p in db.query(PrixRoue).all()}
        noms_officiels = {p["nom"] for p in PRIX_OFFICIELS}
        # Désactiver les prix non officiels
        for p in db.query(PrixRoue).all():
            if p.nom not in noms_officiels:
                p.actif = False
        # Ajouter les prix manquants
        for p in PRIX_OFFICIELS:
            if p["nom"] not in noms_existants:
                db.add(PrixRoue(**p, actif=True))
        db.commit()
        if not db.query(ConfigFidelite).first():
            db.add(ConfigFidelite())
            db.commit()

@app.on_event("shutdown")
def shutdown():
    arreter_scheduler()

@app.get("/")
def root():
    return {"message": "MangerManger API v2.0 — Docs : /docs"}
