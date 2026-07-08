from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import ClientFidelite, GainSpin, ConfigFidelite, PrixRoue, StatutGainEnum
from pydantic import BaseModel

router = APIRouter(prefix="/api/gerant", tags=["Gérant Fidélité"])

class ConfigUpdate(BaseModel):
    seuil_minimum_mad: float
    points_par_tranche: int
    tranche_mad: int
    cout_spin_points: int
    points_avis_google: int

@router.get("/clients")
def get_clients(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    clients = db.query(ClientFidelite).all()
    return clients

@router.get("/spins")
def get_all_spins(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    spins = db.query(GainSpin).order_by(GainSpin.date_gain.desc()).all()
    res = []
    for s in spins:
        client = db.query(ClientFidelite).filter(ClientFidelite.id == s.client_id).first()
        prix = db.query(PrixRoue).filter(PrixRoue.id == s.prix_id).first()
        res.append({
            "id": s.id,
            "client_nom": f"{client.prenom} {client.nom}" if client else "Inconnu",
            "prix_nom": prix.nom if prix else "Inconnu",
            "date": s.date_gain,
            "statut": s.statut,
            "points_avant": s.points_avant,
            "points_apres": s.points_apres
        })
    return res

@router.get("/config-fidelite")
def get_config(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    config = db.query(ConfigFidelite).first()
    return config

@router.put("/config-fidelite")
def update_config(data: ConfigUpdate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    config = db.query(ConfigFidelite).first()
    if not config:
        config = ConfigFidelite()
        db.add(config)

    config.seuil_minimum_mad = data.seuil_minimum_mad
    config.points_par_tranche = data.points_par_tranche
    config.tranche_mad = data.tranche_mad
    config.cout_spin_points = data.cout_spin_points
    config.points_avis_google = data.points_avis_google

    db.commit()
    return {"message": "Configuration mise à jour"}

@router.put("/spins/{gain_id}/utiliser")
def marquer_gain_utilise(gain_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    gain = db.query(GainSpin).filter(GainSpin.id == gain_id).first()
    if not gain:
        raise HTTPException(status_code=404, detail="Gain introuvable")
    if gain.statut == StatutGainEnum.utilise:
        raise HTTPException(status_code=400, detail="Déjà marqué comme utilisé")
    gain.statut = StatutGainEnum.utilise
    db.commit()
    return {"message": "Gain marqué comme utilisé"}

@router.put("/clients/{client_id}/valider-telephone")
def valider_telephone(client_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    client = db.query(ClientFidelite).filter(ClientFidelite.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    if client.telephone_valide:
        raise HTTPException(status_code=400, detail="Téléphone déjà validé")
    if not client.telephone:
        raise HTTPException(status_code=400, detail="Aucun numéro enregistré")
    config = db.query(ConfigFidelite).first()
    points_bonus = config.points_avis_google if config else 50
    client.telephone_valide = True
    client.points_solde += points_bonus
    db.commit()
    return {"message": f"Téléphone validé — {points_bonus} points crédités", "points": client.points_solde}
