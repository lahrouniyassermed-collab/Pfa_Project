from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Reservation, TypeReservationEnum, StatutReservationEnum
from app.core.config import settings
import random, string, stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/reservations", tags=["Réservations"])

def generer_code_acces(db: Session = None):
    """Génère un code LOCAL-YYYY-XXXX garanti unique en base."""
    year = datetime.now().year
    for _ in range(20):  # max 20 tentatives
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"LOCAL-{year}-{suffix}"
        if db is None:
            return code
        existe = db.query(Reservation).filter(Reservation.code_acces == code).first()
        if not existe:
            return code
    # Fallback ultra-unique
    import uuid
    return f"LOCAL-{year}-{uuid.uuid4().hex[:8].upper()}"

class ReservationCreate(BaseModel):
    # Champs envoyés par le frontend ReservationClient.jsx
    nom_complet: Optional[str] = None      # frontend
    nom_client:  Optional[str] = None      # compat backend direct
    telephone: str
    date: Optional[str] = None             # "2026-05-10"
    heure: Optional[str] = None            # "19:00"
    date_heure: Optional[datetime] = None  # compat backend direct
    nb_personnes: int
    zone: Optional[str] = None             # "salle" | "t1" | "t2" | "priv"
    table_id: Optional[int] = None
    message: Optional[str] = None
    mode_paiement: Optional[str] = None    # frontend
    mode_paiement_local: Optional[str] = None  # compat
    montant_acompte: Optional[float] = None

# ── Public : créer une réservation ───────────────────────
@router.post("/")
def creer_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    # Normaliser nom
    nom = data.nom_complet or data.nom_client or "Client"

    # Normaliser date_heure
    if data.date_heure:
        dh = data.date_heure
    elif data.date and data.heure:
        try:
            dh = datetime.strptime(f"{data.date} {data.heure}", "%Y-%m-%d %H:%M")
        except ValueError:
            dh = datetime.strptime(data.date, "%Y-%m-%d")
    else:
        raise HTTPException(400, "Date et heure obligatoires")

    # Normaliser type depuis zone
    zone_to_type = {"priv": "local_prive"}
    type_resa = zone_to_type.get(data.zone or "", "standard")

    # Normaliser mode paiement
    mode_paiement = data.mode_paiement or data.mode_paiement_local

    resa = Reservation(
        nom_client=nom,
        telephone=data.telephone,
        date_heure=dh,
        nb_personnes=data.nb_personnes,
        table_id=data.table_id,
        type=TypeReservationEnum(type_resa),
        montant_acompte=data.montant_acompte,
    )

    # Stocker zone et message si les colonnes existent (migration ci-dessous)
    try:
        resa.zone    = data.zone
        resa.message = data.message
    except Exception:
        pass

    # Mode paiement local (salle privée)
    if mode_paiement:
        try:
            from app.models.models import ModePaiementEnum
            resa.mode_paiement_local = ModePaiementEnum(mode_paiement)
        except Exception:
            pass

    # Salle privée payée en ligne (Stripe) → code unique + auto-confirmée
    if type_resa == "local_prive" and mode_paiement == "en_ligne":
        resa.code_acces = generer_code_acces(db)
        resa.statut = StatutReservationEnum.confirmee  # pas besoin de validation manuelle

    db.add(resa)
    db.commit()
    db.refresh(resa)
    return {
        "id":         resa.id,
        "message":    "Réservation créée et confirmée automatiquement" if resa.statut == StatutReservationEnum.confirmee else "Réservation créée, en attente de confirmation",
        "code_acces": resa.code_acces,
        "code":       resa.code_acces,
    }

# ── Gérant : gérer les réservations ──────────────────────
@router.get("/")
def liste_reservations(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    resas = db.query(Reservation).order_by(Reservation.date_heure).all()
    return [
        {
            "id":                  r.id,
            "nom_client":          r.nom_client,
            "telephone":           r.telephone,
            "date_heure":          r.date_heure,
            "nb_personnes":        r.nb_personnes,
            "statut":              r.statut,
            "type":                r.type,
            "code_acces":          r.code_acces,
            "montant_acompte":     r.montant_acompte,
            "mode_paiement_local": r.mode_paiement_local,
            "zone":                getattr(r, "zone", None),
            "message":             getattr(r, "message", None),
        }
        for r in resas
    ]

@router.put("/{resa_id}/confirmer")
def confirmer(resa_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    resa = db.query(Reservation).filter(Reservation.id == resa_id).first()
    if not resa:
        raise HTTPException(404, "Réservation introuvable")
    resa.statut = StatutReservationEnum.confirmee
    # Si local privé paiement sur place → générer code unique maintenant
    if resa.type == TypeReservationEnum.local_prive and not resa.code_acces:
        resa.code_acces = generer_code_acces(db)
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

@router.post("/{resa_id}/paiement-intent")
def paiement_reservation_en_ligne(resa_id: int, db: Session = Depends(get_db)):
    resa = db.query(Reservation).filter(Reservation.id == resa_id).first()
    if not resa:
        raise HTTPException(404, "Réservation introuvable")
    if resa.type != TypeReservationEnum.local_prive:
        raise HTTPException(400, "Paiement en ligne uniquement pour la salle privée")
    montant = int((resa.montant_acompte or 500) * 100)  # centimes
    try:
        intent = stripe.PaymentIntent.create(
            amount=montant,
            currency="eur",
            metadata={"reservation_id": str(resa_id), "nom_client": resa.nom_client},
            automatic_payment_methods={"enabled": True},
        )
        return {
            "client_secret": intent.client_secret,
            "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
            "montant": montant / 100,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e.user_message))

class ConfirmerPaiementData(BaseModel):
    payment_intent_id: str

@router.post("/{resa_id}/confirmer-paiement")
def confirmer_paiement_reservation(resa_id: int, data: ConfirmerPaiementData, db: Session = Depends(get_db)):
    resa = db.query(Reservation).filter(Reservation.id == resa_id).first()
    if not resa:
        raise HTTPException(404, "Réservation introuvable")
    try:
        intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e.user_message))
    if intent.status != "succeeded":
        raise HTTPException(400, f"Paiement non validé (statut: {intent.status})")
    resa.statut = StatutReservationEnum.confirmee
    if not resa.code_acces:
        resa.code_acces = generer_code_acces(db)
    db.commit()
    return {"message": "Paiement confirmé", "code_acces": resa.code_acces}

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
