from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from collections import defaultdict
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Commande, LigneCommande, Plat, Table, StatutCommandeEnum, OrigineCommandeEnum, Employe, Notification, ClientFidelite, PlatIngredient, Ingredient, Paiement, StatutPaiementEnum, ModePaiementEnum, GainSpin, PrixRoue, TypePrixEnum, StatutGainEnum
from app.api.routes.clients import _crediter_points
import random, string, threading, urllib.request, json as _json

N8N_WEBHOOK = "http://localhost:5678/webhook/points-fidelite"
FRONTEND_URL = "http://localhost:5173"

def _notifier_n8n(prenom: str, telephone: str, points_gagnes: int, solde_total: int, montant: float, restaurant: str = "SKY07"):
    """Appelle le webhook n8n en arrière-plan — ne bloque pas la réponse FastAPI."""
    def _send():
        try:
            payload = _json.dumps({
                "prenom":              prenom,
                "telephone":           telephone,
                "points_gagnes":       points_gagnes,
                "solde_total":         solde_total,
                "montant_transaction": montant,
                "lien_compte":         f"{FRONTEND_URL}/client/dashboard",
                "restaurant":          restaurant,
            }).encode()
            req = urllib.request.Request(N8N_WEBHOOK, data=payload,
                                         headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=5)
            print(f"[N8N] WhatsApp envoyé à {prenom} ({telephone})")
        except Exception as e:
            print(f"[N8N] Webhook indisponible: {e}")
    threading.Thread(target=_send, daemon=True).start()

N8N_WEBHOOK_ANNULATION = "http://localhost:5678/webhook/annulation-commande"

def _notifier_n8n_annulation(code_commande: str, table_numero, raison: str, annule_par: str, date_annulation: str, montant_total: float):
    """Envoie un webhook n8n en arrière-plan lors de l'annulation d'une commande."""
    def _send():
        try:
            payload = _json.dumps({
                "code_commande":   code_commande,
                "table_numero":    table_numero,
                "raison":          raison,
                "annule_par":      annule_par,
                "date_annulation": date_annulation,
                "montant_total":   montant_total,
            }).encode()
            req = urllib.request.Request(N8N_WEBHOOK_ANNULATION, data=payload,
                                         headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=5)
            print(f"[N8N] Annulation envoyée pour commande {code_commande}")
        except Exception as e:
            print(f"[N8N] Webhook annulation indisponible: {e}")
    threading.Thread(target=_send, daemon=True).start()

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

    if data.table_id:
        table = db.query(Table).filter(Table.id == data.table_id).first()
        if table:
            table.statut = "occupee"

    db.commit()
    db.refresh(commande)
    return commande

class ModifierCommandeSchema(BaseModel):
    lignes: List[LigneIn]

@router.put("/{commande_id}/modifier")
def modifier_commande(commande_id: int, data: ModifierCommandeSchema, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    """Modifier les lignes d'une commande encore en_cours (ex: commande QR espèces avant envoi cuisine)."""
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Impossible de modifier une commande déjà envoyée en cuisine.")
    if not data.lignes:
        raise HTTPException(400, "La commande ne peut pas être vide.")

    # Supprimer les lignes existantes
    db.query(LigneCommande).filter(LigneCommande.commande_id == commande.id).delete()

    total = 0
    for ligne_data in data.lignes:
        plat = db.query(Plat).filter(Plat.id == ligne_data.plat_id, Plat.disponible == True).first()
        if not plat:
            raise HTTPException(404, f"Plat {ligne_data.plat_id} introuvable")
        ligne = LigneCommande(
            commande_id=commande.id,
            plat_id=plat.id,
            quantite=ligne_data.quantite,
            prix_unitaire=plat.prix,
            note=ligne_data.note,
        )
        db.add(ligne)
        total += plat.prix * ligne_data.quantite

    commande.montant_total = total
    db.commit()
    db.refresh(commande)
    return {"ok": True, "montant_total": commande.montant_total}

@router.post("/{commande_id}/envoyer-cuisine")
def envoyer_cuisine(commande_id: int, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).options(
        joinedload(Commande.lignes)
    ).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    commande.statut = StatutCommandeEnum.envoyee
    db.commit()
    return {"message": "Commande envoyée en cuisine", "code": commande.code_unique}

class CloturerSchema(BaseModel):
    client_identifiant: Optional[str] = None  # email ou téléphone du client fidélité

@router.post("/{commande_id}/cloturer")
def cloturer_commande(commande_id: int, data: CloturerSchema = CloturerSchema(), db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    commande.statut = StatutCommandeEnum.cloturee
    if commande.table:
        commande.table.statut = "libre"

    points_gagnes = 0
    client_prenom = None
    if data.client_identifiant:
        identifiant = data.client_identifiant.strip()
        client = db.query(ClientFidelite).filter(
            (ClientFidelite.email == identifiant) |
            (ClientFidelite.telephone == identifiant)
        ).first()
        if client:
            points_gagnes = _crediter_points(db, client, commande.montant_total or 0)
            commande.client_fidelite_id = client.id
            client_prenom = client.prenom
            if points_gagnes > 0 and client.telephone:
                _notifier_n8n(
                    prenom=client.prenom,
                    telephone=client.telephone,
                    points_gagnes=points_gagnes,
                    solde_total=client.points_solde,
                    montant=commande.montant_total or 0
                )

    db.commit()
    return {
        "message": "Commande clôturée",
        "code": commande.code_unique,
        "total": commande.montant_total,
        "points_gagnes": points_gagnes,
        "client_prenom": client_prenom,
    }

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

    nouveau_statut = StatutCommandeEnum(statut)

    # Déduire les ingrédients quand le cuisinier marque le plat comme prêt
    if nouveau_statut == StatutCommandeEnum.prete and ligne.statut != StatutCommandeEnum.prete:
        liens = db.query(PlatIngredient).filter(PlatIngredient.plat_id == ligne.plat_id).all()
        for lien in liens:
            ingredient = db.query(Ingredient).filter(Ingredient.id == lien.ingredient_id).first()
            if ingredient:
                ingredient.quantite_stock = max(0, ingredient.quantite_stock - lien.quantite * ligne.quantite)

    ligne.statut = nouveau_statut

    # Si toutes les lignes sont prêtes → commande passe en "prete" (disparaît de la vue cuisine)
    if nouveau_statut == StatutCommandeEnum.prete:
        commande = db.query(Commande).filter(Commande.id == ligne.commande_id).first()
        if commande:
            toutes_prets = all(
                l.statut == StatutCommandeEnum.prete
                for l in commande.lignes
            )
            if toutes_prets:
                commande.statut = StatutCommandeEnum.prete

    db.commit()
    return {"message": f"Plat marqué : {statut}"}

# ── Serveur : modifier quantité d'une ligne (si pas encore commencée) ────────
class ModifierQuantiteSchema(BaseModel):
    quantite: int

@router.put("/{commande_id}/ligne/{ligne_id}/quantite")
def modifier_quantite_ligne(commande_id: int, ligne_id: int, data: ModifierQuantiteSchema,
                             db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    ligne = db.query(LigneCommande).filter(
        LigneCommande.id == ligne_id,
        LigneCommande.commande_id == commande_id
    ).first()
    if not ligne:
        raise HTTPException(404, "Ligne introuvable")
    if ligne.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Ce plat est déjà en préparation — impossible de modifier.")
    if data.quantite < 1:
        raise HTTPException(400, "Quantité minimale : 1")
    ligne.quantite = data.quantite
    # Recalculer le total
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if commande:
        commande.montant_total = sum(
            (l.plat.prix if l.plat else 0) * l.quantite for l in commande.lignes
        )
    db.commit()
    return {"ok": True, "quantite": ligne.quantite}

# ── Serveur : supprimer une ligne (si pas encore commencée) ──────────────────
@router.delete("/{commande_id}/ligne/{ligne_id}")
def supprimer_ligne(commande_id: int, ligne_id: int,
                    db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    ligne = db.query(LigneCommande).filter(
        LigneCommande.id == ligne_id,
        LigneCommande.commande_id == commande_id
    ).first()
    if not ligne:
        raise HTTPException(404, "Ligne introuvable")
    if ligne.statut != StatutCommandeEnum.en_cours:
        raise HTTPException(400, "Ce plat est déjà en préparation — impossible de supprimer.")
    db.delete(ligne)
    commande = db.query(Commande).options(joinedload(Commande.lignes).joinedload(LigneCommande.plat)).filter(Commande.id == commande_id).first()
    if commande:
        commande.montant_total = sum(
            (l.plat.prix if l.plat else 0) * l.quantite for l in commande.lignes if l.id != ligne_id
        )
    db.commit()
    return {"ok": True}

# ── Serveur : ajouter un plat à une commande en cours ────────────────────────
class AjouterPlatSchema(BaseModel):
    plat_id: int
    quantite: int = 1
    note: str = ""

@router.post("/{commande_id}/ajouter-plat")
def ajouter_plat_commande(commande_id: int, data: AjouterPlatSchema,
                           db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).options(joinedload(Commande.lignes).joinedload(LigneCommande.plat)).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.statut not in [StatutCommandeEnum.envoyee, StatutCommandeEnum.en_preparation]:
        raise HTTPException(400, "Commande non modifiable dans cet état.")
    plat = db.query(Plat).filter(Plat.id == data.plat_id).first()
    if not plat:
        raise HTTPException(404, "Plat introuvable")
    nouvelle_ligne = LigneCommande(
        commande_id=commande_id,
        plat_id=data.plat_id,
        quantite=data.quantite,
        note=data.note,
        prix_unitaire=plat.prix,
        statut=StatutCommandeEnum.en_cours,
    )
    db.add(nouvelle_ligne)
    commande.montant_total = (commande.montant_total or 0) + plat.prix * data.quantite
    db.commit()
    return {"ok": True, "plat_nom": plat.nom, "quantite": data.quantite}

class AnnulerSchema(BaseModel):
    raison: Optional[str] = None

# ── Serveur : annuler une commande ───────────────────────
@router.post("/{commande_id}/annuler")
def annuler_commande(commande_id: int, data: AnnulerSchema = Body(default=None), db: Session = Depends(get_db), user=Depends(require_role("serveur", "gerant"))):
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
    raison = (data.raison if data else None) or "Non précisée"

    if commande.table:
        commande.table.statut = "libre"
    commande.statut = StatutCommandeEnum.annulee

    notif = Notification(
        message=f"Commande {code} (Table {table_num}) annulée par {user.prenom} {user.nom} — Raison : {raison}",
        type="annulation"
    )
    db.add(notif)

    # Calculer le montant total depuis les lignes de commande
    montant_total = 0.0
    try:
        lignes = db.query(LigneCommande).filter(LigneCommande.commande_id == commande.id).all()
        montant_total = sum(
            (l.plat.prix if l.plat else 0) * l.quantite for l in lignes
        )
    except Exception:
        montant_total = commande.montant_total or 0.0

    db.commit()

    _notifier_n8n_annulation(
        code_commande=code,
        table_numero=table_num,
        raison=raison,
        annule_par=f"{user.prenom} {user.nom}",
        date_annulation=datetime.now().isoformat(),
        montant_total=float(montant_total),
    )

    return {"message": f"Commande {code} annulée", "raison": raison}

# ── Serveur : trouver les réductions disponibles d'un client ─────────────────
@router.get("/client-prizes")
def get_prizes_par_identifiant(identifiant: str, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    """Retourne les gains réduction non-utilisés d'un client (recherche par email ou téléphone)."""
    client = db.query(ClientFidelite).filter(
        (ClientFidelite.email == identifiant) | (ClientFidelite.telephone == identifiant)
    ).first()
    if not client:
        raise HTTPException(404, "Client fidélité introuvable")
    gains = db.query(GainSpin).filter(
        GainSpin.client_id == client.id,
        GainSpin.statut == StatutGainEnum.non_utilise,
    ).all()
    result = []
    for g in gains:
        prix = db.query(PrixRoue).filter(PrixRoue.id == g.prix_id).first()
        if prix and prix.type == TypePrixEnum.reduction:
            result.append({"gain_id": g.id, "nom": prix.nom, "valeur": prix.valeur})
    return {"client_id": client.id, "prenom": client.prenom, "prizes": result}

# ── Serveur : appliquer réduction d'un gain roue sur une commande ────────────
class AppliquerReductionSchema(BaseModel):
    gain_id: int

@router.post("/{commande_id}/appliquer-reduction")
def appliquer_reduction(commande_id: int, data: AppliquerReductionSchema, db: Session = Depends(get_db), _=Depends(require_role("serveur", "gerant"))):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.statut == StatutCommandeEnum.cloturee:
        raise HTTPException(400, "Commande déjà clôturée")

    gain = db.query(GainSpin).filter(
        GainSpin.id == data.gain_id,
        GainSpin.statut == StatutGainEnum.non_utilise,
    ).first()
    if not gain:
        raise HTTPException(404, "Gain introuvable ou déjà utilisé")

    prix = db.query(PrixRoue).filter(PrixRoue.id == gain.prix_id).first()
    if not prix or prix.type != TypePrixEnum.reduction or prix.valeur <= 0:
        raise HTTPException(400, "Ce gain n'est pas une réduction applicable")

    pct = prix.valeur
    ancien_total = commande.montant_total or 0
    nouveau_total = round(ancien_total * (1 - pct / 100), 2)
    commande.montant_total = nouveau_total
    gain.statut = StatutGainEnum.utilise
    db.commit()

    return {
        "message": f"Réduction {pct}% appliquée",
        "ancien_total": ancien_total,
        "nouveau_total": nouveau_total,
        "montant_remise": round(ancien_total - nouveau_total, 2),
    }

# ── Gérant : revenus historiques ─────────────────────────
@router.get("/revenues")
def get_revenues(annee: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_role("gerant"))):
    query = db.query(Paiement).filter(Paiement.statut == StatutPaiementEnum.valide)
    if annee:
        query = query.filter(func.strftime('%Y', Paiement.date_heure) == str(annee))
    paiements = query.all()

    total_ca      = sum(p.montant for p in paiements)
    nb_commandes  = len(paiements)
    ticket_moyen  = total_ca / nb_commandes if nb_commandes else 0

    ca_by_month = defaultdict(float)
    ca_by_mode  = defaultdict(float)
    for p in paiements:
        if p.date_heure:
            ca_by_month[p.date_heure.strftime('%Y-%m')] += p.montant
        ca_by_mode[p.mode.value if p.mode else 'autre'] += p.montant

    ca_mensuel = [{"mois": k, "ca": round(v, 2)} for k, v in sorted(ca_by_month.items())]
    meilleur_mois = max(ca_mensuel, key=lambda x: x['ca']) if ca_mensuel else None

    all_paiements = db.query(Paiement).filter(Paiement.statut == StatutPaiementEnum.valide).all()
    annees = sorted({p.date_heure.year for p in all_paiements if p.date_heure}, reverse=True)

    return {
        "total_ca":            round(total_ca, 2),
        "nb_commandes":        nb_commandes,
        "ticket_moyen":        round(ticket_moyen, 2),
        "ca_mensuel":          ca_mensuel[-12:],
        "ca_by_mode":          {k: round(v, 2) for k, v in ca_by_mode.items()},
        "meilleur_mois":       meilleur_mois,
        "annees_disponibles":  annees,
    }

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

    # Pré-charger les paiements espèces en attente pour les commandes QR
    pending_cash_ids = set()
    qr_en_cours = [c.id for c in commandes if c.statut == StatutCommandeEnum.en_cours and c.origine and c.origine.value == 'qr_table']
    if qr_en_cours:
        rows = db.query(Paiement.commande_id).filter(
            Paiement.commande_id.in_(qr_en_cours),
            Paiement.mode == ModePaiementEnum.especes,
            Paiement.statut == StatutPaiementEnum.en_attente,
        ).all()
        pending_cash_ids = {r.commande_id for r in rows}

    return [{
        "id": c.id,
        "code_unique": c.code_unique,
        "table_id": c.table_id,
        "statut": c.statut.value,
        "origine": c.origine.value if c.origine else "serveur",
        "montant_total": c.montant_total,
        "date_heure": c.date_heure.isoformat() if c.date_heure else None,
        "especes_en_attente": c.id in pending_cash_ids,
    } for c in commandes]

@router.get("/{commande_id}")
def detail_commande(commande_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    commande = db.query(Commande).filter(Commande.id == commande_id).first()
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    return commande
