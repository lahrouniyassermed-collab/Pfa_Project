from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Commande, LigneCommande, Plat, Table, StatutCommandeEnum, OrigineCommandeEnum, Employe, Notification
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

# ── Serveur : suivi en temps réel d'une commande ─────────
@router.get("/{commande_id}/suivi")
def suivi_commande(commande_id: int, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    """Polling endpoint — le serveur suit l'avancement de sa commande"""
    commande = db.query(Commande).options(
        joinedload(Commande.lignes).joinedload(LigneCommande.plat),
        joinedload(Commande.cuisinier)
    ).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")

    lignes = [{
        "id": l.id,
        "plat_nom": l.plat.nom if l.plat else f"Plat #{l.plat_id}",
        "quantite": l.quantite,
        "note": l.note,
        "statut": l.statut.value,
    } for l in commande.lignes]

    all_pret = len(lignes) > 0 and all(l["statut"] == "prete" for l in lignes)

    return {
        "id": commande.id,
        "code_unique": commande.code_unique,
        "statut": commande.statut.value,
        "all_pret": all_pret,
        "cuisinier": f"{commande.cuisinier.prenom} {commande.cuisinier.nom}" if commande.cuisinier else None,
        "lignes": lignes,
    }

# ── Cuisinier : voir et gérer les commandes ───────────────
@router.get("/cuisine")
def commandes_cuisine(db: Session = Depends(get_db), user=Depends(require_role("cuisinier", "gerant"))):
    """Commandes en cuisine :
    - statut 'envoyee' (non prises en charge) → visibles par tous
    - statut 'en_preparation' → visible uniquement par le cuisinier qui l'a prise
    """
    commandes = db.query(Commande).options(
        joinedload(Commande.lignes).joinedload(LigneCommande.plat),
        joinedload(Commande.table),
        joinedload(Commande.cuisinier)
    ).filter(
        # Nouvelles commandes OU mes commandes en préparation
        (Commande.statut == StatutCommandeEnum.envoyee) |
        ((Commande.statut == StatutCommandeEnum.en_preparation) & (Commande.cuisinier_id == user.id))
    ).order_by(Commande.date_heure).all()

    return [{
        "id": c.id,
        "code_unique": c.code_unique,
        "date_heure": c.date_heure.isoformat() if c.date_heure else None,
        "statut": c.statut.value,
        "origine": c.origine.value if c.origine else "serveur",
        "cuisinier": f"{c.cuisinier.prenom} {c.cuisinier.nom}" if c.cuisinier else None,
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
    db: Session = Depends(get_db), user=Depends(require_role("cuisinier", "gerant"))
):
    """Cuisinier prend en charge (en_preparation) ou marque prête une commande"""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    try:
        new_statut = StatutCommandeEnum(statut)
    except ValueError:
        raise HTTPException(400, f"Statut invalide : {statut}")

    # Quand un cuisinier prend en charge → on l'assigne
    if new_statut == StatutCommandeEnum.en_preparation and commande.cuisinier_id is None:
        commande.cuisinier_id = user.id

    commande.statut = new_statut
    db.commit()
    db.refresh(commande)

    cuisinier_nom = None
    if commande.cuisinier_id:
        cui = db.query(Employe).filter(Employe.id == commande.cuisinier_id).first()
        cuisinier_nom = f"{cui.prenom} {cui.nom}" if cui else None

    return {
        "message": f"Commande {commande.code_unique} → {statut}",
        "cuisinier": cuisinier_nom
    }

@router.put("/ligne/{ligne_id}/statut")
def maj_statut_ligne(ligne_id: int, statut: str, db: Session = Depends(get_db), _=Depends(require_role("cuisinier", "gerant"))):
    """Cuisinier marque un plat En préparation ou Prêt"""
    ligne = db.query(LigneCommande).filter(LigneCommande.id == ligne_id).first()
    if not ligne:
        raise HTTPException(404, "Ligne introuvable")
    ligne.statut = StatutCommandeEnum(statut)
    db.commit()
    return {"message": f"Plat marqué : {statut}"}

# ── Serveur : annuler une commande ───────────────────────
@router.post("/{commande_id}/annuler")
def annuler_commande(commande_id: int, db: Session = Depends(get_db), user=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).options(
        joinedload(Commande.table)
    ).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.statut == StatutCommandeEnum.cloturee:
        raise HTTPException(400, "Commande déjà clôturée")
    if commande.statut == StatutCommandeEnum.annulee:
        raise HTTPException(400, "Commande déjà annulée")

    table_num = commande.table.numero if commande.table else "?"
    code = commande.code_unique

    # Libérer la table
    if commande.table:
        commande.table.statut = "libre"

    commande.statut = StatutCommandeEnum.annulee

    # Notification pour le gérant
    notif = Notification(
        message=f"Commande {code} (Table {table_num}) annulée par {user.prenom} {user.nom}",
        type="annulation"
    )
    db.add(notif)
    db.commit()
    return {"message": f"Commande {code} annulée"}

# ── Notifications gérant ──────────────────────────────────
@router.get("/notifications/non-lues")
def notifs_non_lues(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    notifs = db.query(Notification).filter(Notification.lu == False).order_by(Notification.date_heure.desc()).all()
    return [{"id": n.id, "message": n.message, "type": n.type, "date_heure": n.date_heure.isoformat()} for n in notifs]

@router.put("/notifications/{notif_id}/lue")
def marquer_lue(notif_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if n:
        n.lu = True
        db.commit()
    return {"ok": True}

@router.put("/notifications/tout-lire")
def tout_lire(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    db.query(Notification).filter(Notification.lu == False).update({"lu": True})
    db.commit()
    return {"ok": True}

# ── Gérant / Serveur : voir toutes les commandes ─────────
@router.get("/")
def toutes_commandes(db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commandes = db.query(Commande).order_by(Commande.date_heure.desc()).limit(50).all()
    return [{
        "id": c.id,
        "code_unique": c.code_unique,
        "table_id": c.table_id,
        "statut": c.statut.value,
        "origine": c.origine.value if c.origine else "serveur",
        "montant_total": c.montant_total,
        "date_heure": c.date_heure.isoformat() if c.date_heure else None,
    } for c in commandes]

@router.get("/{commande_id}")
def detail_commande(commande_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    return commande
