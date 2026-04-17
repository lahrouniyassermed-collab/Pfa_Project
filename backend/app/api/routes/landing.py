from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import (
    RestaurantInfo, SallePrivee, OffreEmploi, Candidature,
    AvisClient, StatutAvisEnum, SentimentEnum
)

router_landing = APIRouter(prefix="/api/landing", tags=["Landing"])
router_salles = APIRouter(prefix="/api/salles", tags=["Salles privées"])
router_emplois = APIRouter(prefix="/api/emplois", tags=["Offres emploi"])
router_avis_clients = APIRouter(prefix="/api/avis-clients", tags=["Avis clients"])


# ══════════════════════════════════════════════════════════
# LANDING — config publique complète
# ══════════════════════════════════════════════════════════

@router_landing.get("/")
def get_landing(db: Session = Depends(get_db)):
    """Retourne toutes les données publiques de la landing page."""
    info = db.query(RestaurantInfo).first()
    if not info:
        raise HTTPException(404, "Restaurant non configuré.")

    salles = db.query(SallePrivee).filter(
        SallePrivee.restaurant_id == info.id,
        SallePrivee.disponible == True
    ).all()

    emplois = db.query(OffreEmploi).filter(
        OffreEmploi.restaurant_id == info.id,
        OffreEmploi.active == True
    ).all()

    avis = db.query(AvisClient).filter(
        AvisClient.restaurant_id == info.id,
        AvisClient.statut == StatutAvisEnum.valide
    ).order_by(AvisClient.date_depot.desc()).limit(10).all()

    return {
        "info": info,
        "salles_privees": salles,
        "offres_emploi": emplois,
        "avis_clients": avis,
    }


# ══════════════════════════════════════════════════════════
# SALLES PRIVÉES
# ══════════════════════════════════════════════════════════

class SalleCreate(BaseModel):
    nom: str
    description: str = ""
    capacite: int
    prix_location: float
    photo_url: str = ""

class SalleUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    capacite: Optional[int] = None
    prix_location: Optional[float] = None
    photo_url: Optional[str] = None
    disponible: Optional[bool] = None

@router_salles.get("/")
def liste_salles(db: Session = Depends(get_db)):
    info = db.query(RestaurantInfo).first()
    if not info:
        return []
    return db.query(SallePrivee).filter(SallePrivee.restaurant_id == info.id).all()

@router_salles.post("/")
def creer_salle(data: SalleCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    info = db.query(RestaurantInfo).first()
    salle = SallePrivee(**data.model_dump(), restaurant_id=info.id)
    db.add(salle)
    db.commit()
    db.refresh(salle)
    return salle

@router_salles.put("/{salle_id}")
def modifier_salle(salle_id: int, data: SalleUpdate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    salle = db.query(SallePrivee).filter(SallePrivee.id == salle_id).first()
    if not salle:
        raise HTTPException(404, "Salle introuvable.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(salle, field, value)
    db.commit()
    db.refresh(salle)
    return salle

@router_salles.delete("/{salle_id}")
def supprimer_salle(salle_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    salle = db.query(SallePrivee).filter(SallePrivee.id == salle_id).first()
    if not salle:
        raise HTTPException(404, "Salle introuvable.")
    db.delete(salle)
    db.commit()
    return {"message": "Salle supprimée."}


# ══════════════════════════════════════════════════════════
# OFFRES D'EMPLOI
# ══════════════════════════════════════════════════════════

class OffreCreate(BaseModel):
    titre: str
    description: str
    type_contrat: str = "CDI"

class OffreUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    type_contrat: Optional[str] = None
    active: Optional[bool] = None

class CandidatureCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    telephone: str = ""
    message: str = ""

@router_emplois.get("/")
def liste_offres(db: Session = Depends(get_db)):
    info = db.query(RestaurantInfo).first()
    if not info:
        return []
    return db.query(OffreEmploi).filter(
        OffreEmploi.restaurant_id == info.id,
        OffreEmploi.active == True
    ).order_by(OffreEmploi.date_publication.desc()).all()

@router_emplois.post("/")
def creer_offre(data: OffreCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    info = db.query(RestaurantInfo).first()
    offre = OffreEmploi(**data.model_dump(), restaurant_id=info.id)
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre

@router_emplois.put("/{offre_id}")
def modifier_offre(offre_id: int, data: OffreUpdate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
    if not offre:
        raise HTTPException(404, "Offre introuvable.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(offre, field, value)
    db.commit()
    db.refresh(offre)
    return offre

@router_emplois.delete("/{offre_id}")
def supprimer_offre(offre_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
    if not offre:
        raise HTTPException(404, "Offre introuvable.")
    db.delete(offre)
    db.commit()
    return {"message": "Offre supprimée."}

@router_emplois.post("/{offre_id}/postuler")
def postuler(offre_id: int, data: CandidatureCreate, db: Session = Depends(get_db)):
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id, OffreEmploi.active == True).first()
    if not offre:
        raise HTTPException(404, "Offre introuvable ou fermée.")
    candidature = Candidature(**data.model_dump(), offre_id=offre_id)
    db.add(candidature)
    db.commit()
    return {"message": "Candidature envoyée avec succès."}

@router_emplois.get("/candidatures")
def liste_candidatures(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    return db.query(Candidature).order_by(Candidature.date_depot.desc()).all()

@router_emplois.put("/candidatures/{cand_id}/lue")
def marquer_lue(cand_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    c = db.query(Candidature).filter(Candidature.id == cand_id).first()
    if not c:
        raise HTTPException(404, "Candidature introuvable.")
    c.lue = True
    db.commit()
    return {"message": "Marquée comme lue."}


# ══════════════════════════════════════════════════════════
# AVIS CLIENTS
# ══════════════════════════════════════════════════════════

class AvisClientCreate(BaseModel):
    nom: str
    note: int        # 1-5
    commentaire: str = ""

@router_avis_clients.get("/")
def liste_avis_publics(db: Session = Depends(get_db)):
    info = db.query(RestaurantInfo).first()
    if not info:
        return []
    return db.query(AvisClient).filter(
        AvisClient.restaurant_id == info.id,
        AvisClient.statut == StatutAvisEnum.valide
    ).order_by(AvisClient.date_depot.desc()).all()

@router_avis_clients.post("/")
def deposer_avis(data: AvisClientCreate, db: Session = Depends(get_db)):
    if not 1 <= data.note <= 5:
        raise HTTPException(400, "La note doit être entre 1 et 5.")
    info = db.query(RestaurantInfo).first()
    if not info:
        raise HTTPException(404, "Restaurant non configuré.")

    # Analyse sentiment automatique
    sentiment = None
    try:
        from app.services.ia_service import analyser_sentiment
        if data.commentaire:
            res = analyser_sentiment(data.commentaire)
            sentiment = SentimentEnum(res["sentiment"])
    except Exception:
        pass

    avis = AvisClient(
        nom=data.nom,
        note=data.note,
        commentaire=data.commentaire,
        sentiment=sentiment,
        restaurant_id=info.id,
    )
    db.add(avis)
    db.commit()
    return {"message": "Avis envoyé, en attente de validation."}

@router_avis_clients.get("/admin")
def liste_avis_admin(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    info = db.query(RestaurantInfo).first()
    return db.query(AvisClient).filter(AvisClient.restaurant_id == info.id).order_by(AvisClient.date_depot.desc()).all()

@router_avis_clients.put("/{avis_id}/valider")
def valider_avis_client(avis_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    avis = db.query(AvisClient).filter(AvisClient.id == avis_id).first()
    if not avis:
        raise HTTPException(404, "Avis introuvable.")
    avis.statut = StatutAvisEnum.valide
    db.commit()
    return {"message": "Avis validé."}

@router_avis_clients.put("/{avis_id}/rejeter")
def rejeter_avis_client(avis_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    avis = db.query(AvisClient).filter(AvisClient.id == avis_id).first()
    if not avis:
        raise HTTPException(404, "Avis introuvable.")
    avis.statut = StatutAvisEnum.rejete
    db.commit()
    return {"message": "Avis rejeté."}
