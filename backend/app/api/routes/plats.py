from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Plat, Categorie, Ingredient, PlatIngredient, StatutPlatEnum, RoleEnum
import aiofiles, os, uuid

router = APIRouter(prefix="/api/plats", tags=["Plats"])
UPLOAD_DIR = "uploads/plats"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Schemas ──────────────────────────────────────────────
class IngredientQuantite(BaseModel):
    ingredient_id: int
    quantite: float

class PlatCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    prix: float
    categorie_id: int
    ingredients: List[IngredientQuantite] = []

class PlatUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    prix: Optional[float] = None
    disponible: Optional[bool] = None
    categorie_id: Optional[int] = None

class ValidationPlat(BaseModel):
    statut: str        # "valide" ou "refuse"
    motif_refus: Optional[str] = None

# ── Routes publiques ──────────────────────────────────────
@router.get("/")
def get_menu_public(db: Session = Depends(get_db)):
    """Menu public : uniquement les plats validés et disponibles"""
    plats = db.query(Plat).filter(
        Plat.statut == StatutPlatEnum.valide,
        Plat.disponible == True
    ).all()
    return plats

@router.get("/categories")
def get_menu_par_categorie(db: Session = Depends(get_db)):
    """Menu groupé par catégorie pour la landing page"""
    categories = db.query(Categorie).order_by(Categorie.ordre).all()
    result = []
    for cat in categories:
        plats = db.query(Plat).filter(
            Plat.categorie_id == cat.id,
            Plat.statut == StatutPlatEnum.valide,
            Plat.disponible == True
        ).all()
        result.append({"categorie": cat, "plats": plats})
    return result

# ── Gérant : gestion complète ─────────────────────────────
@router.get("/admin/tous")
def get_tous_plats(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Tous les plats incluant en attente et refusés"""
    return db.query(Plat).all()

@router.get("/admin/propositions")
def get_propositions(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Propositions de plats par les cuisiniers (en attente de validation)"""
    return db.query(Plat).filter(Plat.statut == StatutPlatEnum.en_attente).all()

@router.post("/admin/creer")
def creer_plat_gerant(plat_data: PlatCreate, db: Session = Depends(get_db), user=Depends(require_role("gerant"))):
    """Gérant crée directement un plat validé"""
    plat = Plat(**plat_data.model_dump(exclude={"ingredients"}), statut=StatutPlatEnum.valide)
    db.add(plat)
    db.flush()
    for ing in plat_data.ingredients:
        db.add(PlatIngredient(plat_id=plat.id, ingredient_id=ing.ingredient_id, quantite=ing.quantite))
    db.commit()
    db.refresh(plat)
    return plat

@router.put("/admin/{plat_id}/valider")
def valider_proposition(plat_id: int, validation: ValidationPlat, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Gérant valide ou refuse une proposition du cuisinier"""
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")
    if validation.statut == "valide":
        plat.statut = StatutPlatEnum.valide
        plat.motif_refus = None
    elif validation.statut == "refuse":
        plat.statut = StatutPlatEnum.refuse
        plat.motif_refus = validation.motif_refus
    else:
        raise HTTPException(400, "Statut invalide (valide ou refuse)")
    db.commit()
    return {"message": f"Plat {validation.statut}", "plat_id": plat_id}

@router.put("/admin/{plat_id}")
def modifier_plat(plat_id: int, updates: PlatUpdate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")
    for k, v in updates.model_dump(exclude_none=True).items():
        setattr(plat, k, v)
    db.commit()
    return plat

@router.delete("/admin/{plat_id}")
def supprimer_plat(plat_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")
    db.delete(plat)
    db.commit()
    return {"message": "Plat supprimé"}

# ── Cuisinier : proposer un nouveau plat ──────────────────
@router.post("/proposer")
def proposer_plat(plat_data: PlatCreate, db: Session = Depends(get_db), user=Depends(require_role("cuisinier"))):
    """Cuisinier propose un nouveau plat — statut EN_ATTENTE jusqu'à validation gérant"""
    plat = Plat(
        **plat_data.model_dump(exclude={"ingredients"}),
        statut=StatutPlatEnum.en_attente,
        propose_par_id=user.id
    )
    db.add(plat)
    db.flush()
    for ing in plat_data.ingredients:
        db.add(PlatIngredient(plat_id=plat.id, ingredient_id=ing.ingredient_id, quantite=ing.quantite))
    db.commit()
    db.refresh(plat)
    return {"message": "Proposition envoyée au gérant", "plat_id": plat.id}

@router.get("/mes-propositions")
def mes_propositions(db: Session = Depends(get_db), user=Depends(require_role("cuisinier"))):
    """Cuisinier voit l'état de ses propositions"""
    return db.query(Plat).filter(Plat.propose_par_id == user.id).all()

# ── Upload image ──────────────────────────────────────────
@router.post("/{plat_id}/image")
async def upload_image(plat_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
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
