from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Commande, LigneCommande, Plat, Table, StatutCommandeEnum, OrigineCommandeEnum
import random, string

router = APIRouter(prefix="/api/commandes", tags=["Commandes"])

def generer_code_unique():
    today = datetime.now().strftime("%Y%m%d")
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"CMD-{today}-{suffix}"

class LigneIn(BaseModel):
    plat_id: int
    quantite: int = 1
    note: Optional[str] = None

class CommandeCreate(BaseModel):
    table_id: Optional[int] = None
    lignes: List[LigneIn]
    origine: str = "serveur"

# ── Serveur : prendre une commande ───────────────────────
@router.post("/")
def creer_commande(data: CommandeCreate, db: Session = Depends(get_db), user=Depends(require_role("serveur", "gerant"))):
    commande = Commande(
        code_unique=generer_code_unique(),
        table_id=data.table_id,
        employe_id=user.id,
        origine=OrigineCommandeEnum(data.origine),
        statut=StatutCommandeEnum.en_cours
    )
    db.add(commande)
    db.flush()

    total = 0
    for ligne_data in data.lignes:
        plat = db.query(Plat).filter(Plat.id == ligne_data.plat_id).first()
        if not plat:
            raise HTTPException(404, f"Plat {ligne_data.plat_id} introuvable")
        ligne = LigneCommande(
            commande_id=commande.id,
            plat_id=plat.id,
            quantite=ligne_data.quantite,
            prix_unitaire=plat.prix,
            note=ligne_data.note
        )
        db.add(ligne)
        total += plat.prix * ligne_data.quantite

    commande.montant_total = total
    db.commit()
    db.refresh(commande)
    return commande

@router.post("/{commande_id}/envoyer-cuisine")
def envoyer_cuisine(commande_id: int, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    commande.statut = StatutCommandeEnum.envoyee
    db.commit()
    return {"message": "Commande envoyée en cuisine", "code": commande.code_unique}

@router.post("/{commande_id}/cloturer")
def cloturer_commande(commande_id: int, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    commande.statut = StatutCommandeEnum.cloturee
    if commande.table:
        commande.table.statut = "libre"
    db.commit()
    return {"message": "Commande clôturée", "code": commande.code_unique, "total": commande.montant_total}

# ── Cuisinier : voir et gérer les commandes ───────────────
@router.get("/cuisine")
def commandes_cuisine(db: Session = Depends(get_db), _=Depends(require_role("cuisinier", "gerant"))):
    """Commandes en attente cuisine — retourne les lignes avec noms des plats"""
    commandes = db.query(Commande).options(
        joinedload(Commande.lignes).joinedload(LigneCommande.plat),
        joinedload(Commande.table)
    ).filter(
        Commande.statut.in_([StatutCommandeEnum.envoyee, StatutCommandeEnum.en_preparation])
    ).order_by(Commande.date_heure).all()

    return [{
        "id": c.id,
        "code_unique": c.code_unique,
        "date_heure": c.date_heure.isoformat() if c.date_heure else None,
        "statut": c.statut.value,
        "table": {"id": c.table.id, "numero": c.table.numero} if c.table else None,
        "lignes": [{
            "id": l.id,
            "quantite": l.quantite,
            "note": l.note,
            "statut": l.statut.value,
            "plat_id": l.plat_id,
            "plat_nom": l.plat.nom if l.plat else "Plat supprimé",
        } for l in c.lignes]
    } for c in commandes]

@router.put("/{commande_id}/statut")
def maj_statut_commande(
    commande_id: int, statut: str,
    db: Session = Depends(get_db), _=Depends(require_role("cuisinier", "gerant"))
):
    """Cuisinier marque une commande entière comme en_preparation ou prete"""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    try:
        commande.statut = StatutCommandeEnum(statut)
    except ValueError:
        raise HTTPException(400, f"Statut invalide : {statut}")
    db.commit()
    return {"message": f"Commande {commande.code_unique} → {statut}"}

@router.put("/ligne/{ligne_id}/statut")
def maj_statut_ligne(ligne_id: int, statut: str, db: Session = Depends(get_db), _=Depends(require_role("cuisinier", "gerant"))):
    """Cuisinier marque un plat En préparation ou Prêt"""
    ligne = db.query(LigneCommande).filter(LigneCommande.id == ligne_id).first()
    if not ligne:
        raise HTTPException(404, "Ligne introuvable")
    ligne.statut = StatutCommandeEnum(statut)
    db.commit()
    return {"message": f"Plat marqué : {statut}"}

# ── Gérant / Serveur : voir toutes les commandes ─────────
@router.get("/")
def toutes_commandes(db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    return db.query(Commande).order_by(Commande.date_heure.desc()).limit(50).all()

@router.get("/{commande_id}")
def detail_commande(commande_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    return commande
