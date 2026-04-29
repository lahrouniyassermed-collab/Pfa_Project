"""
Routes publiques QR table — aucune authentification requise.

  GET  /api/qr/table/{table_id}                  — infos table + menu
  POST /api/qr/commande                           — créer commande depuis QR
  POST /api/qr/create-payment-intent/{commande_id}— crée un PaymentIntent Stripe
  POST /api/qr/confirmer-paiement/{commande_id}  — confirme paiement + envoie cuisine
  GET  /api/qr/commande/{commande_id}             — statut commande (suivi)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    Table, Commande, LigneCommande, Plat, Paiement, Categorie,
    StatutCommandeEnum, OrigineCommandeEnum, ModePaiementEnum, StatutPaiementEnum,
    ClientFidelite,
)
from app.api.routes.clients import _crediter_points
import random, string, stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router_qr = APIRouter(prefix="/api/qr", tags=["QR Commande (public)"])


def _generer_code():
    today = datetime.now().strftime("%Y%m%d")
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"CMD-{today}-{suffix}"


# ── Schemas ──────────────────────────────────────────────────────────────

class LigneQR(BaseModel):
    plat_id: int
    quantite: int = 1
    note: Optional[str] = None

class CommandeQRCreate(BaseModel):
    table_id: int
    lignes: List[LigneQR]
    client_fidelite_id: Optional[int] = None

class ConfirmerPaiement(BaseModel):
    payment_intent_id: str
    mode: str = "carte"   # carte | google_pay | apple_pay | especes


# ── Routes ───────────────────────────────────────────────────────────────

@router_qr.get("/table/{table_id}")
def info_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(404, "Table introuvable.")

    categories = db.query(Categorie).order_by(Categorie.ordre).all()
    menu = []
    for cat in categories:
        plats = db.query(Plat).filter(
            Plat.categorie_id == cat.id,
            Plat.disponible == True,
            Plat.statut == "valide",
        ).all()
        if plats:
            menu.append({
                "id": cat.id,
                "nom": cat.nom,
                "plats": [{
                    "id": p.id,
                    "nom": p.nom,
                    "description": p.description,
                    "prix": p.prix,
                    "image": p.image,
                } for p in plats]
            })

    return {
        "table": {
            "id": table.id,
            "numero": table.numero,
            "capacite": table.capacite,
            "emplacement": table.emplacement.value,
        },
        "menu": menu,
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        "nom_restaurant": settings.RESTAURANT_NAME,
    }


@router_qr.post("/commande")
def creer_commande_qr(data: CommandeQRCreate, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == data.table_id).first()
    if not table:
        raise HTTPException(404, "Table introuvable.")
    if not data.lignes:
        raise HTTPException(400, "La commande est vide.")

    commande = Commande(
        code_unique=_generer_code(),
        table_id=data.table_id,
        origine=OrigineCommandeEnum.qr_table,
        statut=StatutCommandeEnum.en_cours,
        client_fidelite_id=data.client_fidelite_id,
    )
    db.add(commande)
    db.flush()

    total = 0
    for l in data.lignes:
        plat = db.query(Plat).filter(Plat.id == l.plat_id, Plat.disponible == True).first()
        if not plat:
            raise HTTPException(404, f"Plat {l.plat_id} introuvable.")
        ligne = LigneCommande(
            commande_id=commande.id,
            plat_id=plat.id,
            quantite=l.quantite,
            prix_unitaire=plat.prix,
            note=l.note,
        )
        db.add(ligne)
        total += plat.prix * l.quantite

    commande.montant_total = total
    db.commit()
    db.refresh(commande)

    return {
        "commande_id": commande.id,
        "code_unique": commande.code_unique,
        "montant_total": commande.montant_total,
    }


@router_qr.post("/create-payment-intent/{commande_id}")
def create_payment_intent(commande_id: int, db: Session = Depends(get_db)):
    """Crée un PaymentIntent Stripe pour la commande."""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable.")
    if commande.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Cette commande a déjà été payée.")

    # Montant en centimes (Stripe travaille en centimes)
    montant_centimes = int(commande.montant_total * 100)

    try:
        intent = stripe.PaymentIntent.create(
            amount=montant_centimes,
            currency="eur",   # EUR pour tests Stripe (MAD non supporté en test)
            metadata={
                "commande_id": str(commande.id),
                "code_unique": commande.code_unique,
            },
            automatic_payment_methods={"enabled": True},
        )
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e.user_message))

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "montant": commande.montant_total,
    }


@router_qr.post("/confirmer-paiement/{commande_id}")
def confirmer_paiement(
    commande_id: int,
    data: ConfirmerPaiement,
    db: Session = Depends(get_db),
):
    """Appelé après confirmation Stripe côté frontend — enregistre et envoie en cuisine."""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable.")
    if commande.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Commande déjà traitée.")

    # Vérifier le paiement auprès de Stripe
    try:
        intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)
        if intent.status != "succeeded":
            raise HTTPException(400, f"Paiement non confirmé (statut: {intent.status})")
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e.user_message))

    try:
        mode = ModePaiementEnum(data.mode)
    except ValueError:
        mode = ModePaiementEnum.carte

    paiement = Paiement(
        commande_id=commande.id,
        montant=commande.montant_total,
        mode=mode,
        statut=StatutPaiementEnum.valide,
        reference_transaction=data.payment_intent_id,
    )
    db.add(paiement)
    commande.statut = StatutCommandeEnum.envoyee
    if commande.table:
        commande.table.statut = "occupee"

    # Créditer les points si un client fidélité est déjà lié
    points_gagnes = 0
    if commande.client_fidelite_id:
        client = db.query(ClientFidelite).filter(ClientFidelite.id == commande.client_fidelite_id).first()
        if client:
            points_gagnes = _crediter_points(db, client, commande.montant_total or 0)

    db.commit()

    return {
        "message": "Paiement validé. Votre commande est en cuisine.",
        "code_unique": commande.code_unique,
        "montant": commande.montant_total,
        "reference": data.payment_intent_id,
        "peut_participer_tombola": commande.montant_total >= 200,
        "points_gagnes": points_gagnes,
    }


@router_qr.post("/paiement-especes/{commande_id}")
def payer_especes(commande_id: int, db: Session = Depends(get_db)):
    """Paiement en espèces — pas de Stripe, envoie directement en cuisine."""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable.")
    if commande.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Commande déjà traitée.")

    paiement = Paiement(
        commande_id=commande.id,
        montant=commande.montant_total,
        mode=ModePaiementEnum.especes,
        statut=StatutPaiementEnum.en_attente,   # sera validé à la caisse
        reference_transaction=f"ESPECES-{commande.code_unique}",
    )
    db.add(paiement)
    commande.statut = StatutCommandeEnum.envoyee
    if commande.table:
        commande.table.statut = "occupee"

    # Créditer les points si un client fidélité est déjà lié
    points_gagnes = 0
    if commande.client_fidelite_id:
        client = db.query(ClientFidelite).filter(ClientFidelite.id == commande.client_fidelite_id).first()
        if client:
            points_gagnes = _crediter_points(db, client, commande.montant_total or 0)

    db.commit()

    return {
        "message": "Commande envoyée en cuisine. Paiement en espèces à la caisse.",
        "code_unique": commande.code_unique,
        "montant": commande.montant_total,
        "peut_participer_tombola": commande.montant_total >= 200,
        "points_gagnes": points_gagnes,
    }


@router_qr.get("/commande/{commande_id}")
def statut_commande_qr(commande_id: int, db: Session = Depends(get_db)):
    commande = db.query(Commande).options(
        joinedload(Commande.lignes).joinedload(LigneCommande.plat)
    ).filter(Commande.id == commande_id).first()

    if not commande:
        raise HTTPException(404, "Commande introuvable.")

    statut_label = {
        "envoyee":        "En attente de préparation",
        "en_preparation": "En préparation",
        "prete":          "Prête — le serveur arrive !",
        "cloturee":       "Terminée",
    }.get(commande.statut.value, "En cours")

    return {
        "statut": commande.statut.value,
        "statut_label": statut_label,
        "code_unique": commande.code_unique,
        "montant_total": commande.montant_total,
        "lignes": [{
            "nom": l.plat.nom if l.plat else "?",
            "quantite": l.quantite,
            "statut": l.statut.value,
        } for l in commande.lignes],
    }
