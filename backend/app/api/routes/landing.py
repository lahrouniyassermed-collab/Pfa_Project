from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, uuid, shutil
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import (
    RestaurantInfo, SallePrivee, OffreEmploi, Candidature,
    AvisClient, StatutAvisEnum, SentimentEnum, Employe
)

CV_DIR = "uploads/cv"
os.makedirs(CV_DIR, exist_ok=True)

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

    equipe = db.query(Employe).filter(
        Employe.afficher_landing == True,
        Employe.actif == True
    ).all()
    equipe_data = [
        {"id": e.id, "prenom": e.prenom, "nom": e.nom,
         "role": e.role.value, "photo_url": e.photo_url or ""}
        for e in equipe
    ]

    return {
        "info": info,
        "salles_privees": salles,
        "offres_emploi": emplois,
        "avis_clients": avis,
        "equipe": equipe_data,
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

class CandidatureOut(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    telephone: str
    message: str
    cv_url: str
    lue: bool
    offre_id: int
    class Config:
        from_attributes = True

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
async def postuler(
    offre_id: int,
    nom: str = Form(...),
    prenom: str = Form(...),
    email: str = Form(...),
    telephone: str = Form(""),
    message: str = Form(""),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id, OffreEmploi.active == True).first()
    if not offre:
        raise HTTPException(404, "Offre introuvable ou fermée.")

    cv_url = ""
    if cv and cv.filename:
        ext = os.path.splitext(cv.filename)[1].lower()
        if ext not in (".pdf", ".doc", ".docx"):
            raise HTTPException(400, "Format CV accepté : PDF, DOC, DOCX")
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(CV_DIR, filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(cv.file, f)
        cv_url = f"/uploads/cv/{filename}"

    candidature = Candidature(
        nom=nom, prenom=prenom, email=email,
        telephone=telephone, message=message,
        cv_url=cv_url, offre_id=offre_id,
    )
    db.add(candidature)
    db.commit()
    return {"message": "Candidature envoyée avec succès."}

@router_emplois.get("/candidatures")
def liste_candidatures(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    candidatures = db.query(Candidature).order_by(Candidature.date_depot.desc()).all()
    result = []
    for c in candidatures:
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == c.offre_id).first()
        result.append({
            "id": c.id,
            "nom": c.nom,
            "prenom": c.prenom,
            "email": c.email,
            "telephone": c.telephone,
            "message": c.message,
            "cv_url": c.cv_url or "",
            "lue": c.lue,
            "offre_id": c.offre_id,
            "offre_titre": offre.titre if offre else "",
            "date_depot": c.date_depot.isoformat() if c.date_depot else "",
        })
    return result

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

    # Analyse sentiment automatique → validation automatique
    sentiment = None
    statut = StatutAvisEnum.en_attente
    try:
        from app.services.ia_service import analyser_sentiment
        if data.commentaire:
            label = analyser_sentiment(data.commentaire)
            sentiment = SentimentEnum(label)
            if label == "positif":
                statut = StatutAvisEnum.valide
            else:
                statut = StatutAvisEnum.rejete
    except Exception as e:
        print(f"[Avis] Sentiment échoué : {e}")

    avis = AvisClient(
        nom=data.nom,
        note=data.note,
        commentaire=data.commentaire,
        sentiment=sentiment,
        statut=statut,
        restaurant_id=info.id,
    )
    db.add(avis)
    db.commit()

    # Max 6 avis validés : supprimer le plus ancien si dépassé
    if statut == StatutAvisEnum.valide:
        avis_valides = db.query(AvisClient).filter(
            AvisClient.restaurant_id == info.id,
            AvisClient.statut == StatutAvisEnum.valide
        ).order_by(AvisClient.date_depot.asc()).all()
        if len(avis_valides) > 6:
            db.delete(avis_valides[0])
            db.commit()
        return {"message": "Merci pour votre avis ! Il est maintenant visible sur la page."}
    elif statut == StatutAvisEnum.rejete:
        return {"message": "Merci pour votre retour. Votre avis a été pris en compte."}
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
