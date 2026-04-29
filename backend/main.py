from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

# Démarrage / arrêt du scheduler automatique
@app.on_event("startup")
def startup():
    demarrer_scheduler()
    # Migration : colonne client_fidelite_id sur commandes (idempotent)
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE commandes ADD COLUMN client_fidelite_id INTEGER "
                "REFERENCES clients_fidelite(id)"
            ))
            conn.commit()
        except Exception:
            pass  # colonne déjà présente

@app.on_event("shutdown")
def shutdown():
    arreter_scheduler()

@app.get("/")
def root():
    return {"message": "MangerManger API v2.0 — Docs : /docs"}
