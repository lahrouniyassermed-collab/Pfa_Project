from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Tombola, Avis, StatutAvisEnum, SentimentEnum
from app.services.ia_service import analyser_screenshot, analyser_sentiment
import aiofiles, os, uuid

router = APIRouter(prefix="/api/tombola", tags=["Tombola"])
UPLOAD_DIR = "uploads/screenshots"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class TombolaCreate(BaseModel):
    titre: str
    lot: str
    date_debut: str
    date_fin: str

# ── Public : participer à la tombola ─────────────────────
@router.post("/participer")
async def participer(
    nom: str = Form(...),
    prenom: str = Form(...),
    email: str = Form(...),
    code_commande: str = Form(...),
    tombola_id: int = Form(...),
    screenshot: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ext = screenshot.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{UPLOAD_DIR}/{filename}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await screenshot.read())

    score_ia, valide_ia = await analyser_screenshot(path)
    sentiment = await analyser_sentiment(f"{nom} {prenom}")

    avis = Avis(
        nom=nom, prenom=prenom, email=email,
        code_commande=code_commande,
        screenshot=path,
        tombola_id=tombola_id,
        score_ia=score_ia,
        validee_par_ia=valide_ia,
        sentiment=SentimentEnum(sentiment),
    )
    db.add(avis)
    db.commit()
    db.refresh(avis)
    return {"message": "Participation enregistrée, en attente de validation", "id": avis.id}

# ── Gérant : gérer les tombolas ───────────────────────────
@router.get("/")
def liste_tombolas(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Liste toutes les tombolas triées par date de début décroissante"""
    tombolas = db.query(Tombola).order_by(Tombola.date_debut.desc()).all()
    return [{
        "id": t.id,
        "titre": t.titre,
        "lot": t.lot,
        "date_debut": t.date_debut.isoformat() if t.date_debut else None,
        "date_fin": t.date_fin.isoformat() if t.date_fin else None,
        "active": t.active,
        "nb_participations": len(t.participations),
        "nb_valides": sum(1 for p in t.participations if p.statut == StatutAvisEnum.valide),
    } for t in tombolas]

@router.post("/creer")
def creer_tombola(data: TombolaCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    from datetime import datetime
    tombola = Tombola(
        titre=data.titre, lot=data.lot,
        date_debut=datetime.fromisoformat(data.date_debut),
        date_fin=datetime.fromisoformat(data.date_fin),
    )
    db.add(tombola)
    db.commit()
    db.refresh(tombola)
    return tombola

@router.get("/participations")
def voir_participations(tombola_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Gérant voit les participations avec le résultat IA, filtrables par tombola"""
    query = db.query(Avis)
    if tombola_id:
        query = query.filter(Avis.tombola_id == tombola_id)
    avis = query.order_by(Avis.date_depot.desc()).all()
    return [{
        "id": a.id,
        "nom": a.nom,
        "prenom": a.prenom,
        "email": a.email,
        "code_commande": a.code_commande,
        "screenshot": a.screenshot,
        "statut": a.statut.value,
        "date_depot": a.date_depot.isoformat() if a.date_depot else None,
        "score_ia": a.score_ia,
        "sentiment": a.sentiment.value if a.sentiment else None,
        "validee_par_ia": a.validee_par_ia,
        "tombola_id": a.tombola_id,
    } for a in avis]

@router.put("/avis/{avis_id}/valider")
def valider_avis(avis_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    avis = db.query(Avis).filter(Avis.id == avis_id).first()
    if not avis:
        raise HTTPException(404, "Participation introuvable")
    avis.statut = StatutAvisEnum.valide
    db.commit()
    return {"message": "Participation validée"}

@router.put("/avis/{avis_id}/rejeter")
def rejeter_avis(avis_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    avis = db.query(Avis).filter(Avis.id == avis_id).first()
    if not avis:
        raise HTTPException(404, "Participation introuvable")
    avis.statut = StatutAvisEnum.rejete
    db.commit()
    return {"message": "Participation rejetée"}

@router.post("/{tombola_id}/tirage")
def tirage_au_sort(tombola_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    import random
    gagnants = db.query(Avis).filter(
        Avis.tombola_id == tombola_id,
        Avis.statut == StatutAvisEnum.valide
    ).all()
    if not gagnants:
        raise HTTPException(400, "Aucune participation validée pour cette tombola")
    gagnant = random.choice(gagnants)
    return {
        "gagnant": f"{gagnant.prenom} {gagnant.nom}",
        "email": gagnant.email,
        "code_commande": gagnant.code_commande,
    }
