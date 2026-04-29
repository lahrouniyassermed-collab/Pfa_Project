"""
Routes clients fidélité :
  POST /api/clients/inscrire          — inscription (public)
  GET  /api/clients/confirmer/{token} — confirmation email (public)
  GET  /api/clients/profil/{qr_token} — profil via QR scan (public)
  POST /api/clients/scan/{qr_token}   — enregistrer une visite (serveur/gerant)
  GET  /api/clients/                  — liste tous les clients (gerant)
  POST /api/clients/notifier-plat     — email nouveau plat à tous (gerant)
  POST /api/clients/notifier-menu     — email nouveau menu à tous (gerant)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_role, hash_password
from app.models.models import ClientFidelite, TokenConfirmationEmail, RestaurantInfo, Commande, ConfigFidelite
from app.services.email_service import (
    envoyer_confirmation_email,
    envoyer_email_nouveau_plat,
    envoyer_email_nouveau_menu,
)

router_clients = APIRouter(prefix="/api/clients", tags=["Clients fidélité"])


# ── Schemas ──────────────────────────────────────────────────────────────

class ClientInscription(BaseModel):
    prenom: str
    nom: str = ""
    telephone: str
    email: str
    mot_de_passe: str
    accept_emails: bool = False
    date_naissance: str = ""    # format MM-DD  ex: "03-15" = 15 mars
    commande_id: Optional[int] = None


class NotifPlatSchema(BaseModel):
    nom_plat: str
    prix: float


class NotifMenuSchema(BaseModel):
    message: str


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_nom_resto(db: Session) -> str:
    info = db.query(RestaurantInfo).first()
    return info.nom if info else settings.RESTAURANT_NAME


def _crediter_points(db: Session, client: ClientFidelite, montant: float) -> int:
    """Calcule et crédite les points fidélité selon ConfigFidelite. Retourne les points gagnés."""
    config = db.query(ConfigFidelite).first()
    seuil  = config.seuil_minimum_mad if config else 80
    tranche = config.tranche_mad if config else 20

    if montant < seuil:
        return 0

    points = int(montant / tranche)
    client.points_solde    = (client.points_solde or 0) + points
    client.nb_visites      = (client.nb_visites or 0) + 1
    client.montant_total   = (client.montant_total or 0) + montant
    client.derniere_activite = datetime.now()
    return points


# ── Routes publiques ─────────────────────────────────────────────────────

@router_clients.post("/inscrire")
def inscrire_client(data: ClientInscription, db: Session = Depends(get_db)):
    # Vérifier doublons
    if db.query(ClientFidelite).filter(ClientFidelite.telephone == data.telephone).first():
        raise HTTPException(400, "Ce numéro de téléphone est déjà inscrit.")
    if db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first():
        raise HTTPException(400, "Cet email est déjà utilisé.")

    qr_token = uuid.uuid4().hex + uuid.uuid4().hex

    client = ClientFidelite(
        prenom=data.prenom,
        nom=data.nom,
        telephone=data.telephone,
        email=data.email,
        mot_de_passe=hash_password(data.mot_de_passe),
        accept_emails=data.accept_emails,
        date_naissance=data.date_naissance,
        qr_token=qr_token,
        email_confirme=False,
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    # Lier la commande et créditer les points si commande_id fourni
    points_gagnes = 0
    if data.commande_id:
        commande = db.query(Commande).filter(
            Commande.id == data.commande_id,
            Commande.client_fidelite_id == None,
        ).first()
        if commande:
            commande.client_fidelite_id = client.id
            points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
            db.commit()

    # Envoyer email de confirmation si email fourni
    if data.email and data.accept_emails:
        token = uuid.uuid4().hex
        db.add(TokenConfirmationEmail(
            token=token,
            client_id=client.id,
            expire_at=datetime.now() + timedelta(hours=24),
        ))
        db.commit()

        lien = f"{settings.BACKEND_URL}/api/clients/confirmer/{token}"
        nom_resto = _get_nom_resto(db)
        envoyer_confirmation_email(client.prenom, client.email, lien, nom_resto)

    return {
        "message": "Compte créé avec succès.",
        "qr_token": qr_token,
        "email_confirmation_envoye": bool(data.email and data.accept_emails),
        "points_gagnes": points_gagnes,
        "points_solde": client.points_solde,
    }


@router_clients.get("/confirmer/{token}", response_class=HTMLResponse)
def confirmer_email(token: str, db: Session = Depends(get_db)):
    record = db.query(TokenConfirmationEmail).filter(
        TokenConfirmationEmail.token == token,
        TokenConfirmationEmail.utilise == False,
    ).first()

    if not record:
        return HTMLResponse("""
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#e53e3e">Lien invalide ou expiré.</h2>
        <p>Ce lien a déjà été utilisé ou n'existe pas.</p>
        </body></html>
        """, status_code=400)

    if record.expire_at < datetime.now():
        return HTMLResponse("""
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#e53e3e">Lien expiré.</h2>
        <p>Votre lien de confirmation a expiré (24h). Réinscrivez-vous.</p>
        </body></html>
        """, status_code=400)

    # Confirmer
    client = db.query(ClientFidelite).filter(ClientFidelite.id == record.client_id).first()
    client.email_confirme = True
    record.utilise = True
    db.commit()

    return HTMLResponse(f"""
    <html><body style="font-family:sans-serif;text-align:center;padding:60px">
    <h2 style="color:#38a169">Email confirmé ✓</h2>
    <p>Bonjour {client.prenom}, votre compte fidélité est activé.</p>
    <p style="color:#999;margin-top:40px">Vous pouvez fermer cette page.</p>
    </body></html>
    """)


@router_clients.get("/profil/{qr_token}")
def profil_client(qr_token: str, db: Session = Depends(get_db)):
    client = db.query(ClientFidelite).filter(ClientFidelite.qr_token == qr_token).first()
    if not client:
        raise HTTPException(404, "QR code invalide.")
    return {
        "id": client.id,
        "prenom": client.prenom,
        "nom": client.nom,
        "telephone": client.telephone,
        "nb_visites": client.nb_visites,
        "montant_total": client.montant_total,
        "derniere_visite": client.derniere_visite.isoformat() if client.derniere_visite else None,
        "email_confirme": client.email_confirme,
    }


# ── Routes protégées (serveur / gérant) ─────────────────────────────────

@router_clients.post("/scan/{qr_token}")
def enregistrer_visite(
    qr_token: str,
    montant: float = 0,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    """Appelé quand le serveur scanne le QR du client à l'arrivée ou à la caisse."""
    client = db.query(ClientFidelite).filter(ClientFidelite.qr_token == qr_token).first()
    if not client:
        raise HTTPException(404, "QR code invalide.")

    client.nb_visites += 1
    client.montant_total += montant
    client.derniere_visite = datetime.now()
    db.commit()

    return {
        "message": f"Visite enregistrée — {client.prenom} {client.nom}",
        "nb_visites": client.nb_visites,
        "peut_participer_tombola": client.montant_total >= 200 or montant >= 200,
    }


@router_clients.get("/")
def liste_clients(db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    clients = db.query(ClientFidelite).order_by(ClientFidelite.date_inscription.desc()).all()
    return [{
        "id": c.id,
        "prenom": c.prenom,
        "nom": c.nom,
        "telephone": c.telephone,
        "email": c.email,
        "email_confirme": c.email_confirme,
        "accept_emails": c.accept_emails,
        "nb_visites": c.nb_visites,
        "montant_total": c.montant_total,
        "derniere_visite": c.derniere_visite.isoformat() if c.derniere_visite else None,
        "date_inscription": c.date_inscription.isoformat() if c.date_inscription else None,
    } for c in clients]


@router_clients.post("/notifier-plat")
def notifier_nouveau_plat(
    data: NotifPlatSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    """Envoie un email 'nouveau plat' à tous les clients abonnés."""
    nom_resto = _get_nom_resto(db)
    clients = db.query(ClientFidelite).filter(
        ClientFidelite.email_confirme == True,
        ClientFidelite.accept_emails == True,
    ).all()

    envoyes = 0
    for c in clients:
        if envoyer_email_nouveau_plat(c.prenom, c.email, data.nom_plat, data.prix, nom_resto):
            envoyes += 1

    return {"message": f"Email envoyé à {envoyes} client(s)."}


@router_clients.post("/notifier-menu")
def notifier_nouveau_menu(
    data: NotifMenuSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    """Envoie un email personnalisé à tous les clients abonnés."""
    nom_resto = _get_nom_resto(db)
    clients = db.query(ClientFidelite).filter(
        ClientFidelite.email_confirme == True,
        ClientFidelite.accept_emails == True,
    ).all()

    envoyes = 0
    for c in clients:
        if envoyer_email_nouveau_menu(c.prenom, c.email, data.message, nom_resto):
            envoyes += 1

    return {"message": f"Email envoyé à {envoyes} client(s)."}
