"""
Valeurs nutritionnelles dynamiques + plats tendances de la semaine.

GET  /api/nutrition/{plat_id}           — valeurs nutritionnelles d'un plat
PUT  /api/nutrition/{plat_id}           — saisie manuelle [gerant]
POST /api/nutrition/{plat_id}/calculer  — calcul auto depuis ingrédients [gerant]
GET  /api/plats/tendances               — top 5 plats de la semaine (public)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import (
    Plat, Ingredient, PlatIngredient, NutritionFact,
    Commande, LigneCommande, StatutCommandeEnum, StatutPlatEnum,
)

router = APIRouter(tags=["Nutrition & Tendances"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class NutritionSchema(BaseModel):
    taille_portion: Optional[float] = 100
    calories:   Optional[float] = 0
    proteines:  Optional[float] = 0
    glucides:   Optional[float] = 0
    lipides:    Optional[float] = 0
    fibres:     Optional[float] = 0
    sucre:      Optional[float] = 0
    sodium:     Optional[float] = 0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _lundi_semaine():
    today = datetime.now().date()
    return datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())


def _serialize_nutrition(n: NutritionFact) -> dict:
    return {
        "plat_id":       n.plat_id,
        "taille_portion": n.taille_portion,
        "calories":      round(n.calories, 1),
        "proteines":     round(n.proteines, 1),
        "glucides":      round(n.glucides, 1),
        "lipides":       round(n.lipides, 1),
        "fibres":        round(n.fibres, 1),
        "sucre":         round(n.sucre, 1),
        "sodium":        round(n.sodium, 1),
        "calcul_auto":   n.calcul_auto,
    }


# ── GET nutrition ─────────────────────────────────────────────────────────────

@router.get("/api/nutrition/{plat_id}")
def get_nutrition(plat_id: int, db: Session = Depends(get_db)):
    n = db.query(NutritionFact).filter(NutritionFact.plat_id == plat_id).first()
    if not n:
        raise HTTPException(404, "Aucune donnée nutritionnelle pour ce plat.")
    return _serialize_nutrition(n)


# ── PUT nutrition (saisie manuelle) ──────────────────────────────────────────

@router.put("/api/nutrition/{plat_id}")
def set_nutrition(
    plat_id: int,
    data: NutritionSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")

    n = db.query(NutritionFact).filter(NutritionFact.plat_id == plat_id).first()
    if not n:
        n = NutritionFact(plat_id=plat_id)
        db.add(n)

    for field, val in data.model_dump().items():
        setattr(n, field, val)
    n.calcul_auto = False
    db.commit()
    db.refresh(n)
    return _serialize_nutrition(n)


# ── POST calculer auto depuis ingrédients ─────────────────────────────────────

@router.post("/api/nutrition/{plat_id}/calculer")
def calculer_nutrition(
    plat_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    """
    Calcule les valeurs nutritionnelles à partir des ingrédients du plat.
    Chaque ingrédient doit avoir ses valeurs nutritionnelles pour 100g.
    La quantité dans plat_ingredients est en grammes.
    """
    plat = db.query(Plat).filter(Plat.id == plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")

    liaisons = db.query(PlatIngredient).filter(PlatIngredient.plat_id == plat_id).all()
    if not liaisons:
        raise HTTPException(400, "Ce plat n'a aucun ingrédient lié — ajoutez des ingrédients d'abord.")

    cal = prot = gluc = lip = fib = 0.0
    manquants = []

    for l in liaisons:
        ing = db.query(Ingredient).filter(Ingredient.id == l.ingredient_id).first()
        if not ing:
            continue
        if ing.calories_par_100g is None:
            manquants.append(ing.nom)
            continue
        # quantite est en grammes → diviser par 100 pour avoir la proportion
        ratio = l.quantite / 100.0
        cal  += (ing.calories_par_100g  or 0) * ratio
        prot += (ing.proteines_par_100g or 0) * ratio
        gluc += (ing.glucides_par_100g  or 0) * ratio
        lip  += (ing.lipides_par_100g   or 0) * ratio
        fib  += (ing.fibres_par_100g    or 0) * ratio

    n = db.query(NutritionFact).filter(NutritionFact.plat_id == plat_id).first()
    if not n:
        n = NutritionFact(plat_id=plat_id)
        db.add(n)

    n.calories  = round(cal, 1)
    n.proteines = round(prot, 1)
    n.glucides  = round(gluc, 1)
    n.lipides   = round(lip, 1)
    n.fibres    = round(fib, 1)
    n.calcul_auto = True
    db.commit()
    db.refresh(n)

    result = _serialize_nutrition(n)
    if manquants:
        result["avertissement"] = f"Ingrédients sans données nutritionnelles : {', '.join(manquants)}"
    return result


# ── GET tendances semaine ─────────────────────────────────────────────────────

@router.get("/api/plats/tendances")
def get_tendances(db: Session = Depends(get_db)):
    """
    Top 5 plats les plus commandés depuis le lundi de la semaine en cours.
    Exclut les commandes annulées et les lignes en rupture/annulées.
    """
    depuis = _lundi_semaine()

    rows = (
        db.query(
            LigneCommande.plat_id,
            func.sum(LigneCommande.quantite).label("nb_commandes"),
        )
        .join(Commande, Commande.id == LigneCommande.commande_id)
        .filter(
            Commande.date_heure >= depuis,
            Commande.statut.notin_([StatutCommandeEnum.annulee]),
            LigneCommande.statut.notin_(["annulee", "rupture", "remplacee"]),
        )
        .group_by(LigneCommande.plat_id)
        .order_by(func.sum(LigneCommande.quantite).desc())
        .limit(5)
        .all()
    )

    result = []
    for rank, (plat_id, nb) in enumerate(rows, start=1):
        plat = db.query(Plat).filter(
            Plat.id == plat_id,
            Plat.disponible == True,
            Plat.statut == StatutPlatEnum.valide,
        ).first()
        if not plat:
            continue
        result.append({
            "rank":         rank,
            "nb_commandes": int(nb),
            "id":           plat.id,
            "nom":          plat.nom,
            "description":  plat.description,
            "prix":         plat.prix,
            "image":        plat.image,
            "vegetarien":   plat.vegetarien,
            "sans_gluten":  plat.sans_gluten,
        })

    return result
