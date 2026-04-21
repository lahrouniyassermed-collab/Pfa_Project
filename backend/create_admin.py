"""
Crée le compte gérant + les infos du restaurant.
À lancer UNE SEULE FOIS après avoir lancé le backend.
    python create_admin.py
"""
from app.core.database import engine, Base
from app.core.security import hash_password
from app.models.models import Employe, RoleEnum, RestaurantInfo
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

# ── Configurer ici ──────────────────────────────────────────
NOM_RESTAURANT = "MangerManger"
SLOGAN        = "Le goût avant tout"
ADRESSE       = "12 Rue de la Gastronomie, Casablanca"
TELEPHONE     = "+212 6 00 00 00 00"
HORAIRES      = "Lun-Sam : 12h-15h / 19h-23h"

PRENOM        = "Admin"
NOM           = "Gerant"
IDENTIFIANT   = "GER001"
MOT_DE_PASSE  = "admin123"
# ────────────────────────────────────────────────────────────

with Session(engine) as db:
    existing_info = db.query(RestaurantInfo).first()
    if not existing_info:
        info = RestaurantInfo(
            nom=NOM_RESTAURANT, slogan=SLOGAN,
            adresse=ADRESSE, telephone=TELEPHONE, horaires=HORAIRES,
        )
        db.add(info)
        db.commit()
        print(f"Restaurant '{NOM_RESTAURANT}' cree")
    else:
        print("Restaurant deja configure — ignore")

    existing = db.query(Employe).filter(Employe.identifiant == IDENTIFIANT).first()
    if not existing:
        gerant = Employe(
            nom=NOM, prenom=PRENOM, identifiant=IDENTIFIANT,
            code_passe=hash_password(MOT_DE_PASSE),
            role=RoleEnum.gerant, actif=True,
        )
        db.add(gerant)
        db.commit()
        print(f"Gerant cree — login: {IDENTIFIANT} / mdp: {MOT_DE_PASSE}")
    else:
        print(f"Identifiant '{IDENTIFIANT}' deja utilise — ignore")

print("\nPret ! Lance maintenant : python create_seed.py")
