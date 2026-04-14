from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Reservation, TypeReservationEnum, StatutReservationEnum
import random, string

router = APIRouter(prefix="/api/reservations", tags=["Réservations"])

def generer_code_acces():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    year = datetime.now().year
    return f"LOCAL-{year}-{suffix}"

class ReservationCreate(BaseModel):
    nom_client: str
    telephone: str
    date_heure: datetime
    nb_personnes: int
    table_id: Optional[int] = None
    type: str = "standard"
    montant_acompte: Optional[float] = None
    mode_paiement_local: Optional[str] = None

# ── Public : créer une réservation ───────────────────────
@router.post("/")
def creer_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    resa = Reservation(
        nom_client=data.nom_client,
        telephone=data.telephone,
        date_heure=data.date_heure,
        nb_personnes=data.nb_personnes,
        table_id=data.table_id,
        type=TypeReservationEnum(data.type),
        montant_acompte=data.montant_acompte,
        mode_paiement_local=data.mode_paiement_local,
    )
    # Générer code accès si local privé payé en ligne
    if data.type == "local_prive" and data.mode_paiement_local == "en_ligne":
        resa.code_acces = generer_code_acces()

    db.add(resa)
    db.commit()
    db.refresh(resa)
    return {
        "id": resa.id,
        "message": "Réservation créée, en attente de confirmation",
        "code_acces": resa.code_acces,   # None si paiement sur place
    }

# ── Gérant : gérer les réservations ──────────────────────
@router.get("/")
def liste_reservations(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    return db.query(Reservation).order_by(Reservation.date_heure).all()

@router.put("/{resa_id}/confirmer")
def confirmer(resa_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    resa = db.query(Reservation).filter(Reservation.id == resa_id).first()
    if not resa:
        raise HTTPException(404, "Réservation introuvable")
    resa.statut = StatutReservationEnum.confirmee
    # Si local privé paiement sur place → générer code maintenant
    if resa.type == TypeReservationEnum.local_prive and not resa.code_acces:
        resa.code_acces = generer_code_acces()
    db.commit()
    return {"message": "Réservation confirmée", "code_acces": resa.code_acces}

@router.put("/{resa_id}/annuler")
def annuler(resa_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    resa = db.query(Reservation).filter(Reservation.id == resa_id).first()
    if not resa:
        raise HTTPException(404, "Réservation introuvable")
    resa.statut = StatutReservationEnum.annulee
    db.commit()
    return {"message": "Réservation annulée"}

@router.get("/verifier-code/{code}")
def verifier_code_acces(code: str, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    """Gérant scanne/entre le code du client pour lui ouvrir le local"""
    resa = db.query(Reservation).filter(
        Reservation.code_acces == code,
        Reservation.statut == StatutReservationEnum.confirmee
    ).first()
    if not resa:
        raise HTTPException(404, "Code invalide ou réservation non confirmée")
    return {"valide": True, "client": resa.nom_client, "date": resa.date_heure, "nb_personnes": resa.nb_personnes}
