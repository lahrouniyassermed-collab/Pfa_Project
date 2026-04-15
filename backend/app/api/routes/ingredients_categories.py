from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Ingredient, Categorie

router_ingredients = APIRouter(prefix="/api/ingredients", tags=["Ingrédients"])
router_categories = APIRouter(prefix="/api/categories", tags=["Catégories"])


# ── Schemas ───────────────────────────────────────────────
class IngredientCreate(BaseModel):
    nom: str
    quantite_stock: float = 0
    seuil_alerte: float = 0
    unite: Optional[str] = None

class IngredientUpdate(BaseModel):
    nom: Optional[str] = None
    quantite_stock: Optional[float] = None
    seuil_alerte: Optional[float] = None
    unite: Optional[str] = None

class CategorieCreate(BaseModel):
    nom: str
    ordre: int = 0

class CategorieUpdate(BaseModel):
    nom: Optional[str] = None
    ordre: Optional[int] = None


# ══════════════════════════════════════════════════════════
# INGRÉDIENTS
# ══════════════════════════════════════════════════════════

@router_ingredients.get("/alertes")
def alertes_stock(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Ingrédients dont le stock est inférieur ou égal au seuil d'alerte"""
    return db.query(Ingredient).filter(
        Ingredient.seuil_alerte > 0,
        Ingredient.quantite_stock <= Ingredient.seuil_alerte
    ).order_by(Ingredient.nom).all()


@router_ingredients.get("/")
def liste_ingredients(db: Session = Depends(get_db), _=Depends(require_role("gerant", "cuisinier"))):
    return db.query(Ingredient).order_by(Ingredient.nom).all()


@router_ingredients.post("/")
def creer_ingredient(data: IngredientCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    ing = Ingredient(**data.model_dump())
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return ing


@router_ingredients.put("/{ing_id}")
def modifier_ingredient(
    ing_id: int, data: IngredientUpdate,
    db: Session = Depends(get_db), _=Depends(require_role("gerant"))
):
    ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
    if not ing:
        raise HTTPException(404, "Ingrédient introuvable")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ing, k, v)
    db.commit()
    db.refresh(ing)
    return ing


@router_ingredients.delete("/{ing_id}")
def supprimer_ingredient(ing_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
    if not ing:
        raise HTTPException(404, "Ingrédient introuvable")
    db.delete(ing)
    db.commit()
    return {"message": "Ingrédient supprimé"}


# ══════════════════════════════════════════════════════════
# CATÉGORIES
# ══════════════════════════════════════════════════════════

@router_categories.get("/")
def liste_categories(db: Session = Depends(get_db)):
    return db.query(Categorie).order_by(Categorie.ordre).all()


@router_categories.post("/")
def creer_categorie(data: CategorieCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    cat = Categorie(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router_categories.put("/{cat_id}")
def modifier_categorie(
    cat_id: int, data: CategorieUpdate,
    db: Session = Depends(get_db), _=Depends(require_role("gerant"))
):
    cat = db.query(Categorie).filter(Categorie.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Catégorie introuvable")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router_categories.delete("/{cat_id}")
def supprimer_categorie(cat_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    cat = db.query(Categorie).filter(Categorie.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Catégorie introuvable")
    db.delete(cat)
    db.commit()
    return {"message": "Catégorie supprimée"}
