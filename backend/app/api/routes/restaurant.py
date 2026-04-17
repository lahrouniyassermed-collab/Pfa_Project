from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import RestaurantInfo, Employe, RoleEnum
from app.core.security import hash_password

router_restaurant = APIRouter(prefix="/api/restaurant", tags=["Restaurant"])
router_setup = APIRouter(prefix="/api/setup", tags=["Setup"])


# ── Schemas ──────────────────────────────────────────────────

class RestaurantInfoOut(BaseModel):
    id: int
    nom: str
    slogan: str
    description: str
    adresse: str
    telephone: str
    email_contact: str
    horaires: str
    logo_url: str
    theme: str
    couleur_principale: str
    section_menu: bool
    section_reservations: bool
    section_tombola: bool
    section_recrutement: bool
    section_avis: bool
    instagram_url: str
    facebook_url: str

    class Config:
        from_attributes = True


class RestaurantInfoUpdate(BaseModel):
    nom: Optional[str] = None
    slogan: Optional[str] = None
    description: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email_contact: Optional[str] = None
    horaires: Optional[str] = None
    couleur_principale: Optional[str] = None
    theme: Optional[str] = None
    section_menu: Optional[bool] = None
    section_reservations: Optional[bool] = None
    section_tombola: Optional[bool] = None
    section_recrutement: Optional[bool] = None
    section_avis: Optional[bool] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None


class SetupRequest(BaseModel):
    # Infos restaurant
    nom_restaurant: str
    slogan: str = ""
    description: str = ""
    adresse: str = ""
    telephone: str = ""
    horaires: str = ""
    # Compte gérant
    prenom: str
    nom: str
    identifiant: str
    code_passe: str


# ── Setup ─────────────────────────────────────────────────────

@router_setup.get("/status")
def setup_status(db: Session = Depends(get_db)):
    """Retourne si le restaurant est déjà configuré."""
    gerant = db.query(Employe).filter(Employe.role == RoleEnum.gerant).first()
    return {"configured": gerant is not None}


@router_setup.post("/")
def setup(data: SetupRequest, db: Session = Depends(get_db)):
    """Initialise le restaurant + crée le compte gérant. Accessible une seule fois."""
    gerant_existant = db.query(Employe).filter(Employe.role == RoleEnum.gerant).first()
    if gerant_existant:
        raise HTTPException(status_code=400, detail="Le restaurant est déjà configuré.")

    # Créer RestaurantInfo
    info = RestaurantInfo(
        nom=data.nom_restaurant,
        slogan=data.slogan,
        description=data.description,
        adresse=data.adresse,
        telephone=data.telephone,
        horaires=data.horaires,
    )
    db.add(info)

    # Créer le gérant
    gerant = Employe(
        nom=data.nom,
        prenom=data.prenom,
        identifiant=data.identifiant,
        code_passe=hash_password(data.code_passe),
        role=RoleEnum.gerant,
        actif=True,
    )
    db.add(gerant)
    db.commit()

    return {"message": "Restaurant configuré avec succès."}


# ── Restaurant Info ───────────────────────────────────────────

@router_restaurant.get("/", response_model=RestaurantInfoOut)
def get_restaurant_info(db: Session = Depends(get_db)):
    """Retourne les infos publiques du restaurant."""
    info = db.query(RestaurantInfo).first()
    if not info:
        raise HTTPException(status_code=404, detail="Restaurant non configuré.")
    return info


@router_restaurant.put("/", response_model=RestaurantInfoOut)
def update_restaurant_info(
    data: RestaurantInfoUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    """Modifie les infos du restaurant. Gérant seulement."""
    info = db.query(RestaurantInfo).first()
    if not info:
        raise HTTPException(status_code=404, detail="Restaurant non configuré.")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(info, field, value)

    db.commit()
    db.refresh(info)
    return info
