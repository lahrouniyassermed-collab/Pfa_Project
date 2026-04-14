from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role, hash_password
from app.models.models import Table, Employe, RoleEnum, EmplacementEnum, StatutTableEnum
import qrcode, os, io, base64

router_tables = APIRouter(prefix="/api/tables", tags=["Tables"])
router_employes = APIRouter(prefix="/api/employes", tags=["Employés"])
router_dashboard = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ══════════════════════════════════════════════════════════
# TABLES
# ══════════════════════════════════════════════════════════

class TableCreate(BaseModel):
    numero: int
    capacite: int
    emplacement: str = "interieur"

@router_tables.get("/")
def liste_tables(db: Session = Depends(get_db)):
    return db.query(Table).order_by(Table.numero).all()

@router_tables.post("/")
def creer_table(data: TableCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    table = Table(
        numero=data.numero,
        capacite=data.capacite,
        emplacement=EmplacementEnum(data.emplacement)
    )
    db.add(table)
    db.flush()
    # Générer QR code
    qr_url = f"https://mangermanger.app/commande?table={table.id}"
    qr = qrcode.make(qr_url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    table.qr_code_url = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"
    db.commit()
    return table

@router_tables.put("/{table_id}/statut")
def changer_statut(table_id: int, statut: str, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table introuvable")
    table.statut = StatutTableEnum(statut)
    db.commit()
    return table

@router_tables.delete("/{table_id}")
def supprimer_table(table_id: int, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table introuvable")
    db.delete(table)
    db.commit()
    return {"message": "Table supprimée"}

# ══════════════════════════════════════════════════════════
# EMPLOYÉS (Gérant seulement)
# ══════════════════════════════════════════════════════════

class EmployeCreate(BaseModel):
    nom: str
    prenom: str
    identifiant: str
    code_passe: str
    role: str
    telephone: Optional[str] = None

@router_employes.get("/")
def liste_employes(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    return db.query(Employe).all()

@router_employes.post("/")
def creer_employe(data: EmployeCreate, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    existing = db.query(Employe).filter(Employe.identifiant == data.identifiant).first()
    if existing:
        raise HTTPException(400, "Identifiant déjà utilisé")
    emp = Employe(
        nom=data.nom, prenom=data.prenom,
        identifiant=data.identifiant,
        code_passe=hash_password(data.code_passe),
        role=RoleEnum(data.role),
        telephone=data.telephone,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return {"message": f"Compte {data.identifiant} créé", "id": emp.id}

@router_employes.put("/{emp_id}/actif")
def toggle_actif(emp_id: int, actif: bool, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    emp = db.query(Employe).filter(Employe.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employé introuvable")
    emp.actif = actif
    db.commit()
    return {"message": f"Compte {'activé' if actif else 'désactivé'}"}

# ══════════════════════════════════════════════════════════
# DASHBOARD GÉRANT
# ══════════════════════════════════════════════════════════

@router_dashboard.get("/")
def dashboard(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    from app.models.models import Commande, Plat, Avis, StatutCommandeEnum, SentimentEnum
    from sqlalchemy import func

    # Chiffre d'affaires aujourd'hui
    from datetime import date
    today = date.today()
    ca_today = db.query(func.sum(Commande.montant_total)).filter(
        func.date(Commande.date_heure) == today,
        Commande.statut == StatutCommandeEnum.cloturee
    ).scalar() or 0

    # Plats les plus commandés
    from app.models.models import LigneCommande
    top_plats = db.query(
        Plat.nom, func.sum(LigneCommande.quantite).label("total")
    ).join(LigneCommande).group_by(Plat.id).order_by(func.sum(LigneCommande.quantite).desc()).limit(5).all()

    # Avis en attente
    avis_en_attente = db.query(Avis).filter(Avis.statut == "en_attente").count()

    # Répartition sentiments
    sentiments = {
        "positif": db.query(Avis).filter(Avis.sentiment == SentimentEnum.positif).count(),
        "neutre": db.query(Avis).filter(Avis.sentiment == SentimentEnum.neutre).count(),
        "negatif": db.query(Avis).filter(Avis.sentiment == SentimentEnum.negatif).count(),
    }

    # Propositions cuisinier en attente
    from app.models.models import StatutPlatEnum
    propositions = db.query(Plat).filter(Plat.statut == StatutPlatEnum.en_attente).count()

    return {
        "ca_aujourd_hui": round(ca_today, 2),
        "top_plats": [{"nom": p.nom, "total_commandes": p.total} for p in top_plats],
        "avis_en_attente": avis_en_attente,
        "sentiments": sentiments,
        "propositions_cuisinier_en_attente": propositions,
    }
