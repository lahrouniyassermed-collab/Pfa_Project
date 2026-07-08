"""
Routes post-validation — modification/annulation de commandes après envoi en cuisine.

POST /api/modifications/commandes/{id}/annuler
POST /api/modifications/commandes/{id}/lignes/{lid}/annuler
POST /api/modifications/commandes/{id}/lignes/ajouter
PUT  /api/modifications/commandes/{id}/lignes/{lid}/note
POST /api/modifications/commandes/{id}/lignes/{lid}/remplacer
PUT  /api/modifications/lignes/{lid}/annuler_prete
PUT  /api/modifications/lignes/{lid}/rupture
GET  /api/modifications/commandes/{id}/historique
GET  /api/modifications/kds/alertes
PUT  /api/modifications/kds/alertes/{aid}/acquitter
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json, stripe

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.models.models import (
    Commande, LigneCommande, Plat, Paiement,
    StatutCommandeEnum, StatutPaiementEnum, ModePaiementEnum,
    ModificationCommande, KDSAlerte,
)

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/modifications", tags=["Modifications commandes"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(db, commande_id, type_, effectue_par, description, montant_delta=0, stripe_action=None, ligne_id=None):
    db.add(ModificationCommande(
        commande_id=commande_id,
        ligne_id=ligne_id,
        type=type_,
        effectue_par=effectue_par,
        description=description,
        montant_delta=montant_delta,
        stripe_action=stripe_action,
    ))
    cmd = db.query(Commande).filter(Commande.id == commande_id).first()
    if cmd:
        cmd.modifications_count = (cmd.modifications_count or 0) + 1


def _alerte(db, type_, message, commande_id=None, ligne_id=None):
    db.add(KDSAlerte(
        commande_id=commande_id,
        ligne_id=ligne_id,
        type=type_,
        message=message,
    ))


def _remboursement_stripe(paiement: Paiement, montant: float) -> Optional[str]:
    """Effectue un remboursement Stripe partiel ou total. Retourne le refund_id ou None."""
    if not paiement or paiement.mode != ModePaiementEnum.carte:
        return None
    if not paiement.reference_transaction or paiement.reference_transaction.startswith("ESPECES"):
        return None
    try:
        pi = stripe.PaymentIntent.retrieve(paiement.reference_transaction)
        if pi.status != "succeeded":
            return None
        refund = stripe.Refund.create(
            payment_intent=paiement.reference_transaction,
            amount=int(montant * 100),
        )
        # Stocker l'id du remboursement
        existing = json.loads(paiement.stripe_refund_ids or "[]")
        existing.append(refund.id)
        paiement.stripe_refund_ids = json.dumps(existing)
        paiement.montant_rembourse = (paiement.montant_rembourse or 0) + montant
        montant_restant = paiement.montant - paiement.montant_rembourse
        if montant_restant <= 0.01:
            paiement.statut = StatutPaiementEnum.rembourse
        else:
            paiement.statut = StatutPaiementEnum.rembourse_partiel
        return refund.id
    except stripe.error.StripeError:
        return None


def _get_commande_or_404(db, commande_id):
    c = db.query(Commande).filter(Commande.id == commande_id).first()
    if not c:
        raise HTTPException(404, "Commande introuvable")
    return c


def _get_ligne_or_404(db, ligne_id, commande_id=None):
    q = db.query(LigneCommande).filter(LigneCommande.id == ligne_id)
    if commande_id:
        q = q.filter(LigneCommande.commande_id == commande_id)
    l = q.first()
    if not l:
        raise HTTPException(404, "Ligne introuvable")
    return l


def _recalc_statut_commande(db, commande):
    """Recalcule le statut global d'une commande selon ses lignes."""
    actives = [l for l in commande.lignes if l.statut not in (
        StatutCommandeEnum.annulee, StatutCommandeEnum.rupture, StatutCommandeEnum.remplacee
    )]
    if not actives:
        commande.statut = StatutCommandeEnum.annulee
        return
    annulees = [l for l in commande.lignes if l.statut in (
        StatutCommandeEnum.annulee, StatutCommandeEnum.rupture
    )]
    if annulees:
        commande.statut = StatutCommandeEnum.annulee_partielle


# ── Schemas ───────────────────────────────────────────────────────────────────

class AnnulerCommandeSchema(BaseModel):
    motif: str
    lignes_ids: Optional[List[int]] = None   # None = tout annuler
    effectue_par: str = "serveur"            # client | serveur | gerant

class AnnulerLigneSchema(BaseModel):
    motif: str
    effectue_par: str = "serveur"

class AjouterLigneSchema(BaseModel):
    plat_id: int
    quantite: int = 1
    note: Optional[str] = None
    effectue_par: str = "serveur"

class ModifierNoteSchema(BaseModel):
    note: str
    effectue_par: str = "serveur"

class RemplacerLigneSchema(BaseModel):
    nouveau_plat_id: int
    quantite: int = 1
    note: Optional[str] = None
    effectue_par: str = "serveur"

class AnnulerPreteSchema(BaseModel):
    note: Optional[str] = None


# ── 1. Annulation totale ou partielle ─────────────────────────────────────────

@router.post("/commandes/{commande_id}/annuler")
def annuler_commande(
    commande_id: int,
    data: AnnulerCommandeSchema,
    db: Session = Depends(get_db),
    user=Depends(require_role("serveur", "gerant")),
):
    commande = _get_commande_or_404(db, commande_id)

    if commande.statut in (StatutCommandeEnum.cloturee, StatutCommandeEnum.annulee):
        raise HTTPException(400, "Commande déjà clôturée ou annulée.")

    lignes_a_annuler = (
        [_get_ligne_or_404(db, lid, commande_id) for lid in data.lignes_ids]
        if data.lignes_ids
        else [l for l in commande.lignes if l.statut not in (
            StatutCommandeEnum.annulee, StatutCommandeEnum.prete,
            StatutCommandeEnum.rupture, StatutCommandeEnum.remplacee,
        )]
    )

    if not lignes_a_annuler:
        raise HTTPException(400, "Aucune ligne annulable.")

    # Vérifier qu'aucune ligne ciblée n'est déjà prête
    for l in lignes_a_annuler:
        if l.statut == StatutCommandeEnum.prete:
            raise HTTPException(400, f"Le plat '{l.plat.nom if l.plat else l.id}' est déjà prêt — impossible d'annuler.")

    # Calcul remboursement
    montant_a_rembourser = sum(l.prix_unitaire * l.quantite for l in lignes_a_annuler)
    refund_id = None
    if commande.paiement and montant_a_rembourser > 0:
        refund_id = _remboursement_stripe(commande.paiement, montant_a_rembourser)

    # Annuler les lignes
    for l in lignes_a_annuler:
        l.statut = StatutCommandeEnum.annulee
        l.motif_annulation = data.motif

    # Recalculer statut commande
    _recalc_statut_commande(db, commande)
    commande.motif_annulation = data.motif
    commande.flag_urgent = 1

    # Mettre à jour montant
    commande.montant_total = max(0, (commande.montant_total or 0) - montant_a_rembourser)

    # Alerte KDS
    noms = ", ".join(l.plat.nom for l in lignes_a_annuler if l.plat)
    _alerte(db, "annulation", f"Annulation [{noms}] — {data.motif}", commande_id=commande_id)
    _log(db, commande_id, "annulation", data.effectue_par,
         f"Annulé: {noms} | Motif: {data.motif}",
         montant_delta=-montant_a_rembourser, stripe_action=refund_id)

    db.commit()
    return {
        "ok": True,
        "montant_rembourse": montant_a_rembourser,
        "refund_id": refund_id,
        "statut_commande": commande.statut.value,
    }


# ── 2. Annulation d'une seule ligne ──────────────────────────────────────────

@router.post("/commandes/{commande_id}/lignes/{ligne_id}/annuler")
def annuler_ligne(
    commande_id: int,
    ligne_id: int,
    data: AnnulerLigneSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    commande = _get_commande_or_404(db, commande_id)
    ligne = _get_ligne_or_404(db, ligne_id, commande_id)

    if ligne.statut == StatutCommandeEnum.prete:
        raise HTTPException(400, "Ce plat est déjà prêt — impossible d'annuler.")
    if ligne.statut == StatutCommandeEnum.annulee:
        raise HTTPException(400, "Cette ligne est déjà annulée.")

    montant = ligne.prix_unitaire * ligne.quantite
    refund_id = None
    if commande.paiement:
        refund_id = _remboursement_stripe(commande.paiement, montant)

    ligne.statut = StatutCommandeEnum.annulee
    ligne.motif_annulation = data.motif
    commande.montant_total = max(0, (commande.montant_total or 0) - montant)
    commande.flag_urgent = 1
    _recalc_statut_commande(db, commande)

    nom = ligne.plat.nom if ligne.plat else f"Ligne #{ligne_id}"
    _alerte(db, "annulation", f"Ligne annulée: {nom} — {data.motif}", commande_id=commande_id, ligne_id=ligne_id)
    _log(db, commande_id, "suppression", data.effectue_par,
         f"Ligne annulée: {nom} | {data.motif}", montant_delta=-montant, stripe_action=refund_id, ligne_id=ligne_id)

    db.commit()
    return {"ok": True, "montant_rembourse": montant, "refund_id": refund_id}


# ── 3. Ajouter un plat à une commande déjà envoyée ───────────────────────────

@router.post("/commandes/{commande_id}/lignes/ajouter")
def ajouter_ligne(
    commande_id: int,
    data: AjouterLigneSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    commande = _get_commande_or_404(db, commande_id)

    if commande.statut in (StatutCommandeEnum.prete, StatutCommandeEnum.cloturee, StatutCommandeEnum.annulee):
        raise HTTPException(400, "Impossible d'ajouter un plat à cette commande.")

    plat = db.query(Plat).filter(Plat.id == data.plat_id, Plat.disponible == True).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable ou indisponible.")

    nouvelle_ligne = LigneCommande(
        commande_id=commande_id,
        plat_id=plat.id,
        quantite=data.quantite,
        prix_unitaire=plat.prix,
        note=data.note,
        statut=StatutCommandeEnum.en_cours,
    )
    db.add(nouvelle_ligne)
    db.flush()

    delta = plat.prix * data.quantite
    commande.montant_total = (commande.montant_total or 0) + delta
    commande.flag_urgent = 1

    # Si commande déjà payée par carte → nouveau PaymentIntent pour le delta
    stripe_client_secret = None
    if commande.paiement and commande.paiement.mode == ModePaiementEnum.carte and delta > 0:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(delta * 100),
                currency="eur",
                metadata={"commande_id": str(commande_id), "type": "supplement"},
                automatic_payment_methods={"enabled": True},
            )
            stripe_client_secret = intent.client_secret
            _log(db, commande_id, "ajout", data.effectue_par,
                 f"Ajout: {data.quantite}× {plat.nom} (+{delta} Dh)",
                 montant_delta=delta, stripe_action=intent.id, ligne_id=nouvelle_ligne.id)
        except stripe.error.StripeError:
            pass
    else:
        _log(db, commande_id, "ajout", data.effectue_par,
             f"Ajout: {data.quantite}× {plat.nom} (+{delta} Dh)", montant_delta=delta, ligne_id=nouvelle_ligne.id)

    _alerte(db, "ajout", f"[AJOUT] {data.quantite}× {plat.nom}", commande_id=commande_id, ligne_id=nouvelle_ligne.id)

    db.commit()
    db.refresh(nouvelle_ligne)
    return {
        "ok": True,
        "ligne_id": nouvelle_ligne.id,
        "delta": delta,
        "stripe_client_secret": stripe_client_secret,
    }


# ── 4. Modifier la note d'un plat ────────────────────────────────────────────

@router.put("/commandes/{commande_id}/lignes/{ligne_id}/note")
def modifier_note(
    commande_id: int,
    ligne_id: int,
    data: ModifierNoteSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    ligne = _get_ligne_or_404(db, ligne_id, commande_id)

    if ligne.statut == StatutCommandeEnum.prete:
        raise HTTPException(400, "Ce plat est déjà prêt.")

    ancienne_note = ligne.note or ""
    ligne.note = data.note
    ligne.commande.flag_urgent = 1

    nom = ligne.plat.nom if ligne.plat else f"Ligne #{ligne_id}"
    _alerte(db, "note_modifiee", f"⚠ NOTE MODIFIÉE: {nom} → {data.note}", commande_id=commande_id, ligne_id=ligne_id)
    _log(db, commande_id, "note", data.effectue_par,
         f"Note modifiée: {nom} | '{ancienne_note}' → '{data.note}'", ligne_id=ligne_id)

    db.commit()
    return {"ok": True}


# ── 5. Remplacer une ligne ────────────────────────────────────────────────────

@router.post("/commandes/{commande_id}/lignes/{ligne_id}/remplacer")
def remplacer_ligne(
    commande_id: int,
    ligne_id: int,
    data: RemplacerLigneSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    commande = _get_commande_or_404(db, commande_id)
    ancienne = _get_ligne_or_404(db, ligne_id, commande_id)

    if ancienne.statut not in (StatutCommandeEnum.en_cours, StatutCommandeEnum.envoyee):
        raise HTTPException(400, "Remplacement uniquement possible avant que la préparation commence.")

    nouveau_plat = db.query(Plat).filter(Plat.id == data.nouveau_plat_id, Plat.disponible == True).first()
    if not nouveau_plat:
        raise HTTPException(404, "Nouveau plat introuvable.")

    # Créer la nouvelle ligne
    nouvelle = LigneCommande(
        commande_id=commande_id,
        plat_id=nouveau_plat.id,
        quantite=data.quantite,
        prix_unitaire=nouveau_plat.prix,
        note=data.note,
        statut=StatutCommandeEnum.en_cours,
    )
    db.add(nouvelle)
    db.flush()

    ancienne.statut = StatutCommandeEnum.remplacee
    ancienne.remplace_par_id = nouvelle.id
    ancienne.motif_annulation = f"Remplacé par {nouveau_plat.nom}"

    # Calcul delta
    delta = (nouveau_plat.prix * data.quantite) - (ancienne.prix_unitaire * ancienne.quantite)
    commande.montant_total = max(0, (commande.montant_total or 0) + delta)
    commande.flag_urgent = 1

    # Stripe si nécessaire
    refund_id = stripe_cs = None
    if commande.paiement and commande.paiement.mode == ModePaiementEnum.carte:
        if delta < 0:
            refund_id = _remboursement_stripe(commande.paiement, abs(delta))
        elif delta > 0:
            try:
                intent = stripe.PaymentIntent.create(
                    amount=int(delta * 100), currency="eur",
                    automatic_payment_methods={"enabled": True},
                )
                stripe_cs = intent.client_secret
            except stripe.error.StripeError:
                pass

    ancien_nom = ancienne.plat.nom if ancienne.plat else f"#{ligne_id}"
    _alerte(db, "ajout", f"[REMPLACEMENT] {ancien_nom} → {nouveau_plat.nom}", commande_id=commande_id, ligne_id=nouvelle.id)
    _log(db, commande_id, "remplacement", data.effectue_par,
         f"{ancien_nom} → {nouveau_plat.nom} | delta: {delta:+.0f} Dh",
         montant_delta=delta, stripe_action=refund_id or (stripe_cs and "pi_nouveau"), ligne_id=nouvelle.id)

    db.commit()
    db.refresh(nouvelle)
    return {
        "ok": True,
        "nouvelle_ligne_id": nouvelle.id,
        "delta": delta,
        "stripe_client_secret": stripe_cs,
        "refund_id": refund_id,
    }


# ── 6. Undo "prêt" mauvaise table ────────────────────────────────────────────

@router.put("/lignes/{ligne_id}/annuler_prete")
def annuler_prete(
    ligne_id: int,
    data: AnnulerPreteSchema,
    db: Session = Depends(get_db),
    _=Depends(require_role("cuisinier", "serveur", "gerant")),
):
    ligne = _get_ligne_or_404(db, ligne_id)
    if ligne.statut != StatutCommandeEnum.prete:
        raise HTTPException(400, "Cette ligne n'est pas marquée prête.")

    ligne.statut = StatutCommandeEnum.en_preparation
    ligne.commande.flag_urgent = 1

    nom = ligne.plat.nom if ligne.plat else f"Ligne #{ligne_id}"
    _alerte(db, "mauvaise_table", f"⚠ À VÉRIFIER: {nom} re-ouvert", commande_id=ligne.commande_id, ligne_id=ligne_id)
    _log(db, ligne.commande_id, "mauvaise_table", "cuisinier",
         f"Prêt annulé: {nom} | {data.note or 'mauvaise table'}", ligne_id=ligne_id)

    db.commit()
    return {"ok": True}


# ── 7. Rupture de stock ───────────────────────────────────────────────────────

@router.put("/lignes/{ligne_id}/rupture")
def rupture_stock(
    ligne_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("cuisinier", "serveur", "gerant")),
):
    ligne = _get_ligne_or_404(db, ligne_id)

    if ligne.statut == StatutCommandeEnum.prete:
        raise HTTPException(400, "Ce plat est déjà prêt.")

    montant = ligne.prix_unitaire * ligne.quantite
    ligne.statut = StatutCommandeEnum.rupture
    ligne.motif_annulation = "Rupture de stock"
    ligne.commande.flag_urgent = 1

    # Remboursement automatique Stripe
    refund_id = None
    if ligne.commande.paiement:
        refund_id = _remboursement_stripe(ligne.commande.paiement, montant)

    ligne.commande.montant_total = max(0, (ligne.commande.montant_total or 0) - montant)
    _recalc_statut_commande(db, ligne.commande)

    nom = ligne.plat.nom if ligne.plat else f"Ligne #{ligne_id}"
    _alerte(db, "rupture", f"RUPTURE: {nom}", commande_id=ligne.commande_id, ligne_id=ligne_id)
    _log(db, ligne.commande_id, "rupture", "cuisinier",
         f"Rupture: {nom}", montant_delta=-montant, stripe_action=refund_id, ligne_id=ligne_id)

    db.commit()
    return {"ok": True, "montant_rembourse": montant, "refund_id": refund_id}


# ── 8. Historique modifications d'une commande ───────────────────────────────

@router.get("/commandes/{commande_id}/historique")
def historique(
    commande_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("serveur", "gerant")),
):
    mods = db.query(ModificationCommande).filter(
        ModificationCommande.commande_id == commande_id
    ).order_by(ModificationCommande.created_at.desc()).all()

    return [{
        "id": m.id,
        "type": m.type,
        "effectue_par": m.effectue_par,
        "description": m.description,
        "montant_delta": m.montant_delta,
        "stripe_action": m.stripe_action,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in mods]


# ── 9. Alertes KDS ────────────────────────────────────────────────────────────

@router.get("/kds/alertes")
def get_alertes_kds(
    db: Session = Depends(get_db),
    _=Depends(require_role("cuisinier", "serveur", "gerant")),
):
    alertes = db.query(KDSAlerte).filter(
        KDSAlerte.acquittee == False
    ).order_by(KDSAlerte.created_at.desc()).limit(20).all()

    return [{
        "id": a.id,
        "type": a.type,
        "message": a.message,
        "commande_id": a.commande_id,
        "ligne_id": a.ligne_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in alertes]


@router.put("/kds/alertes/{alerte_id}/acquitter")
def acquitter_alerte(
    alerte_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("cuisinier", "serveur", "gerant")),
):
    a = db.query(KDSAlerte).filter(KDSAlerte.id == alerte_id).first()
    if not a:
        raise HTTPException(404, "Alerte introuvable")
    a.acquittee = True
    db.commit()
    return {"ok": True}
