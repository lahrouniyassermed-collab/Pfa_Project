from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import random
import shutil
import uuid
import os

from datetime import timedelta
from collections import defaultdict
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_client
from app.models.models import ClientFidelite, PrixRoue, GainSpin, ConfigFidelite, OTPVerification, TypePrixEnum, StatutGainEnum
from app.services.email_service import envoyer_otp, envoyer_email_parrainage
from app.core.config import settings
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from fastapi import Request
import re

router = APIRouter(prefix="/api/client", tags=["Client Fidélité"])

POINTS_TELEPHONE   = 50
POINTS_PARRAIN     = 100
POINTS_FILLEUL     = 30
MAX_PARRAINAGES    = 3

# Rate limiter simple en mémoire — {ip: [timestamps]}
_rate_store: dict = defaultdict(list)

def _check_rate_limit(ip: str, max_req: int = 10, window_sec: int = 60):
    now = datetime.utcnow().timestamp()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < window_sec]
    if len(_rate_store[ip]) >= max_req:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 1 minute.")
    _rate_store[ip].append(now)

def _generer_code_parrainage(prenom: str, client_id: int) -> str:
    suffix = uuid.uuid4().hex[:4].upper()
    base = re.sub(r'[^A-Z]', '', prenom[:5].upper())
    return f"SKY-{base}-{suffix}"

def _sanitize_code(code: str) -> str:
    return re.sub(r'[^A-Z0-9\-]', '', code.upper().strip())[:20]

class RegisterSchema(BaseModel):
    prenom: str
    nom: str
    email: EmailStr
    password: str
    telephone: Optional[str] = None
    code_parrainage: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# ── AUTH ──────────────────────────────────────────────────

@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    try:
        existing = db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")

        # Vérifier code parrainage
        parrain = None
        if data.code_parrainage:
            code_clean = _sanitize_code(data.code_parrainage)
            if not re.match(r'^SKY-[A-Z]+-[A-Z0-9]{4}$', code_clean):
                raise HTTPException(status_code=400, detail="Format de code invalide")
            parrain = db.query(ClientFidelite).filter(
                ClientFidelite.code_parrainage == code_clean
            ).first()
            if not parrain:
                raise HTTPException(status_code=400, detail="Code de parrainage invalide")
            if parrain.email == data.email:
                raise HTTPException(status_code=400, detail="Vous ne pouvez pas utiliser votre propre code")
            if parrain.nb_parrainages >= MAX_PARRAINAGES:
                raise HTTPException(status_code=400, detail="Ce code a déjà été utilisé 3 fois")

        new_client = ClientFidelite(
            prenom=data.prenom,
            nom=data.nom,
            email=data.email,
            mot_de_passe=hash_password(data.password),
            telephone=data.telephone,
            parrain_id=parrain.id if parrain else None,
            points_solde=POINTS_FILLEUL if parrain else 0,
        )
        db.add(new_client)
        db.flush()

        # Générer le code parrainage unique pour ce nouveau client
        new_client.code_parrainage = _generer_code_parrainage(data.prenom, new_client.id)

        # Créditer le parrain
        if parrain:
            parrain.points_solde += POINTS_PARRAIN
            parrain.nb_parrainages += 1
            envoyer_email_parrainage(
                parrain.prenom, parrain.email,
                data.prenom, POINTS_PARRAIN,
                settings.RESTAURANT_NAME
            )

        db.commit()
        db.refresh(new_client)

        # Envoyer OTP de confirmation email
        code = str(random.randint(100000, 999999))
        expire = datetime.utcnow() + timedelta(minutes=15)
        otp = OTPVerification(client_id=new_client.id, code=code, expire_at=expire)
        db.add(otp)
        db.commit()

        envoye = envoyer_otp(new_client.prenom, new_client.email, code, settings.RESTAURANT_NAME)
        if not envoye:
            print(f"[INSCRIPTION OTP] Code pour {new_client.prenom} ({new_client.email}): {code}")

        return {
            "requires_email_verification": True,
            "email": new_client.email,
            "message": f"Code de vérification envoyé à {new_client.email}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG REGISTER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    client = db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first()
    if not client or not verify_password(data.password, client.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not client.email_confirme:
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    access_token = create_access_token(data={"sub": client.email})
    return {"access_token": access_token, "token_type": "bearer", "client": {
        "id": client.id,
        "prenom": client.prenom,
        "nom": client.nom,
        "email": client.email,
        "points_solde": client.points_solde,
        "telephone_valide": client.telephone_valide,
        "code_parrainage": client.code_parrainage,
    }}

@router.post("/confirmer-email")
def confirmer_email(data: OTPSchema, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(request.client.host, max_req=10, window_sec=60)

    # Trouver le client par le code OTP valide
    otp = db.query(OTPVerification).filter(
        OTPVerification.code == data.code.strip(),
        OTPVerification.utilise == False,
        OTPVerification.expire_at > datetime.utcnow()
    ).order_by(OTPVerification.id.desc()).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    client = db.query(ClientFidelite).filter(ClientFidelite.id == otp.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    otp.utilise = True
    client.email_confirme = True
    db.commit()

    access_token = create_access_token(data={"sub": client.email})
    return {"access_token": access_token, "token_type": "bearer", "client": {
        "id": client.id,
        "prenom": client.prenom,
        "nom": client.nom,
        "email": client.email,
        "points_solde": client.points_solde,
        "telephone_valide": client.telephone_valide,
        "code_parrainage": client.code_parrainage,
    }}

@router.post("/renvoyer-confirmation")
def renvoyer_confirmation(data: LoginSchema, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(request.client.host, max_req=3, window_sec=60)
    client = db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first()
    if not client or not verify_password(data.password, client.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if client.email_confirme:
        raise HTTPException(status_code=400, detail="Email déjà confirmé")

    db.query(OTPVerification).filter(OTPVerification.client_id == client.id, OTPVerification.utilise == False).delete()
    code = str(random.randint(100000, 999999))
    expire = datetime.utcnow() + timedelta(minutes=15)
    db.add(OTPVerification(client_id=client.id, code=code, expire_at=expire))
    db.commit()

    envoye = envoyer_otp(client.prenom, client.email, code, settings.RESTAURANT_NAME)
    if not envoye:
        print(f"[RENVOI OTP] Code: {code}")
    return {"message": f"Nouveau code envoyé à {client.email}"}

# ── DASHBOARD ─────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(client: ClientFidelite = Depends(get_current_client), db: Session = Depends(get_db)):
    # Historique des gains récents
    gains = db.query(GainSpin).filter(GainSpin.client_id == client.id).order_by(GainSpin.date_gain.desc()).limit(10).all()
    
    # Formater les gains pour le frontend
    gains_data = []
    for g in gains:
        prix = db.query(PrixRoue).filter(PrixRoue.id == g.prix_id).first()
        gains_data.append({
            "id": g.id,
            "nom_prix": prix.nom if prix else "Prix inconnu",
            "date": g.date_gain,
            "statut": g.statut,
            "description": prix.description if prix else ""
        })

    config = db.query(ConfigFidelite).first()

    return {
        "id": client.id,
        "prenom": client.prenom,
        "nom": client.nom,
        "points": client.points_solde,
        "spin_count_mois": client.spin_count_mois,
        "derniere_date_spin": client.derniere_date_spin,
        "avis_google_mois": client.avis_google_mois,
        "avis_statut": client.avis_statut.value if client.avis_statut else None,
        "derniere_date_avis": client.derniere_date_avis.isoformat() if client.derniere_date_avis else None,
        "historique_gains": gains_data,
        "config": {
            "cout_spin": config.cout_spin_points if config else 100,
            "points_avis": config.points_avis_google if config else 50
        }
    }

# ── SPIN LOGIC ────────────────────────────────────────────

@router.post("/spin")
def spin(client: ClientFidelite = Depends(get_current_client), db: Session = Depends(get_db)):
    config = db.query(ConfigFidelite).first()
    cout_spin = config.cout_spin_points if config else 100

    if client.points_solde < cout_spin:
        raise HTTPException(status_code=400, detail="Points insuffisants")

    now = datetime.now()

    # Prix disponibles pour ce client (système progressif : max 2 gains par prix)
    all_prix = db.query(PrixRoue).filter(PrixRoue.actif == True).all()
    if not all_prix:
        raise HTTPException(status_code=400, detail="Aucun prix configuré — contactez le gérant")

    disponibles = []
    for p in all_prix:
        count = db.query(GainSpin).filter(
            GainSpin.client_id == client.id,
            GainSpin.prix_id == p.id
        ).count()
        if count < 2:
            disponibles.append(p)

    # Tous gagnés 2× → réinitialisation complète pour ce client
    if not disponibles:
        disponibles = list(all_prix)

    gagnant = random.choice(disponibles)

    # Calcul des points
    points_avant = client.points_solde
    pts_gagnes = 0

    if gagnant.nom == "Double Points":
        # Solde × 2, coût spin non déduit
        points_apres = points_avant * 2
        pts_gagnes = points_avant  # les points gagnés = le solde actuel
    else:
        # Toujours déduire le coût du spin
        points_apres = points_avant - cout_spin

    client.points_solde = points_apres
    client.derniere_date_spin = now
    client.spin_count_mois += 1

    nb_gains = db.query(GainSpin).filter(
        GainSpin.client_id == client.id,
        GainSpin.prix_id == gagnant.id
    ).count() + 1

    db.add(GainSpin(
        client_id=client.id,
        prix_id=gagnant.id,
        points_avant=points_avant,
        points_apres=points_apres,
        nb_gains_ce_prix=nb_gains,
    ))
    db.commit()
    db.refresh(client)

    # Prix encore disponibles après ce spin
    nb_restants = sum(
        1 for p in all_prix
        if db.query(GainSpin).filter(
            GainSpin.client_id == client.id,
            GainSpin.prix_id == p.id
        ).count() < 2
    )

    return {
        "nom_prix":    gagnant.nom,
        "type_prix":   gagnant.type,
        "pts":         pts_gagnes,
        "points_apres": points_apres,
        "prix_restants": nb_restants,
        "reset":       nb_restants == 0,
    }

from app.services.ia_vision import analyser_screenshot_avis
from app.models.models import StatutAvisEnum

# ── AVIS GOOGLE ───────────────────────────────────────────

@router.post("/avis-google")
async def google_review(
    file: UploadFile = File(...),
    client: ClientFidelite = Depends(get_current_client), 
    db: Session = Depends(get_db)
):
    config = db.query(ConfigFidelite).first()
    points_bonus = config.points_avis_google if config else 50
    
    now = datetime.now()
    # Limite mensuelle désactivée pour la démo PFA
    # if client.derniere_date_avis:
    #     if client.derniere_date_avis.year == now.year and client.derniere_date_avis.month == now.month:
    #          raise HTTPException(status_code=400, detail="Bonus déjà récupéré ce mois-ci")

    # Lire l'image
    image_bytes = await file.read()
    
    # Analyser avec Gemini Vision
    try:
        analyse = analyser_screenshot_avis(image_bytes, client.prenom, client.nom)
    except Exception as e:
        print(f"IA Vision Error: {e}")
        # IA indisponible → mise en attente manuelle gérant
        analyse = {
            "est_avis_google": True, "restaurant_sky07": True,
            "auteur_detecte": f"{client.prenom} {client.nom}",
            "auteur_correspond": True, "etoiles": None,
            "texte_extrait": None, "sentiment": "NEUTRE",
            "score_confiance": 50, "motif_rejet": None
        }

    # Sauvegarder la screenshot
    upload_dir = "uploads/avis"
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    file_name = f"client_{client.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(image_bytes)

    # Logique de décision
    confiance = analyse.get("score_confiance", 0)
    est_google = analyse.get("est_avis_google", False)
    est_sky07 = analyse.get("restaurant_sky07", False)
    auteur_ok = analyse.get("auteur_correspond", False)
    sentiment = analyse.get("sentiment", "NEUTRE")
    
    statut = StatutAvisEnum.en_attente
    message = ""
    points_gagnes = 0

    if not auteur_ok or not est_sky07 or sentiment == "NEGATIF":
        statut = StatutAvisEnum.rejete
        raison_rejet = []
        if not auteur_ok:
            raison_rejet.append(f"votre nom '{client.prenom} {client.nom}' n'est pas visible dans l'image")
        if not est_sky07:
            raison_rejet.append("le nom 'SKY07' n'est pas détecté dans l'image")
        if sentiment == "NEGATIF":
            raison_rejet.append("le texte de l'avis semble négatif")
        message = "Avis rejeté : " + " | ".join(raison_rejet) + "."
        print(f"[AVIS REJETÉ] Client {client.prenom} {client.nom} — raison(s): {', '.join(raison_rejet)}")
    elif confiance >= 80 and est_google:
        statut = StatutAvisEnum.valide
        points_gagnes = points_bonus
        client.points_solde += points_bonus
        client.derniere_date_avis = now
        client.avis_google_mois = True
        message = f"{points_bonus} points crédités automatiquement !"
        print(f"[AVIS VALIDÉ] Client {client.prenom} {client.nom} — score: {confiance}, sentiment: {sentiment}")
    elif confiance >= 40:
        statut = StatutAvisEnum.en_attente
        message = "Votre avis est en cours de vérification par notre équipe. Points crédités sous 24h si validé."
        print(f"[AVIS EN ATTENTE] Client {client.prenom} {client.nom} — score: {confiance}")
    else:
        statut = StatutAvisEnum.rejete
        message = "Avis invalide. Veuillez soumettre une capture d'écran de votre avis Google Maps pour SKY07."
        print(f"[AVIS REJETÉ] Client {client.prenom} {client.nom} — score trop bas: {confiance}")

    # Mettre à jour le client avec les infos de l'avis
    client.avis_screenshot = file_path
    client.avis_score_ia = confiance / 100.0
    client.avis_sentiment = sentiment
    client.avis_statut = statut
    
    db.commit()
    
    return {
        "status":            statut.value,
        "message":           message,
        "points_gagnes":     points_gagnes,
        "solde":             client.points_solde,
        "score_confiance":   analyse.get("score_confiance", 0),
        "est_avis_google":   analyse.get("est_avis_google", False),
        "restaurant_sky07":  analyse.get("restaurant_sky07", False),
        "auteur_correspond": analyse.get("auteur_correspond", False),
        "auteur_detecte":    analyse.get("auteur_detecte", None),
        "sentiment":         analyse.get("sentiment", "NEUTRE"),
        "motif_rejet":       analyse.get("motif_rejet", None),
    }

# ── PHOTO PROFIL ──────────────────────────────────────────

@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    client: ClientFidelite = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Format accepté : jpg, png, webp")
    os.makedirs("uploads/photos", exist_ok=True)
    filename = f"client_{client.id}_{uuid.uuid4().hex[:8]}{ext}"
    path = f"uploads/photos/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    client.photo_url = f"/uploads/photos/{filename}"
    db.commit()
    return {"photo_url": client.photo_url}

# ── VÉRIFICATION TÉLÉPHONE PAR OTP EMAIL ──────────────────

class TelephoneSchema(BaseModel):
    telephone: str

class OTPSchema(BaseModel):
    code: str

@router.post("/telephone/envoyer-code")
def envoyer_code_telephone(
    data: TelephoneSchema,
    client: ClientFidelite = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if client.telephone_valide:
        raise HTTPException(status_code=400, detail="Téléphone déjà vérifié")

    # Invalider les anciens OTP
    db.query(OTPVerification).filter(
        OTPVerification.client_id == client.id,
        OTPVerification.utilise == False
    ).delete()

    code = str(random.randint(100000, 999999))
    expire = datetime.utcnow() + timedelta(minutes=10)
    otp = OTPVerification(client_id=client.id, code=code, expire_at=expire)
    db.add(otp)

    client.telephone = data.telephone
    db.commit()

    envoye = envoyer_otp(client.prenom, client.email, code, settings.RESTAURANT_NAME)
    if not envoye:
        print(f"[OTP] Code pour {client.prenom}: {code}")

    return {"message": f"Code envoyé à {client.email}"}

@router.post("/telephone/valider-code")
def valider_code_telephone(
    data: OTPSchema,
    client: ClientFidelite = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if client.telephone_valide:
        raise HTTPException(status_code=400, detail="Téléphone déjà vérifié")

    otp = db.query(OTPVerification).filter(
        OTPVerification.client_id == client.id,
        OTPVerification.utilise == False,
        OTPVerification.expire_at > datetime.utcnow()
    ).order_by(OTPVerification.id.desc()).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Code expiré. Demandez un nouveau code.")

    otp.tentatives += 1
    if otp.tentatives > 5:
        db.commit()
        raise HTTPException(status_code=429, detail="Trop de tentatives. Demandez un nouveau code.")

    if otp.code != data.code.strip():
        db.commit()
        raise HTTPException(status_code=400, detail="Code incorrect")

    otp.utilise = True
    client.telephone_valide = True
    client.points_solde += POINTS_TELEPHONE
    db.commit()

    return {
        "message": f"Téléphone vérifié ! +{POINTS_TELEPHONE} points crédités.",
        "points": client.points_solde
    }


# ── PARRAINAGE ─────────────────────────────────────────────

@router.get("/parrainage")
def get_parrainage(client: ClientFidelite = Depends(get_current_client), db: Session = Depends(get_db)):
    if not client.code_parrainage:
        client.code_parrainage = _generer_code_parrainage(client.prenom, client.id)
        db.commit()

    filleuls = db.query(ClientFidelite).filter(ClientFidelite.parrain_id == client.id).all()
    return {
        "code": client.code_parrainage,
        "nb_parrainages": client.nb_parrainages,
        "max_parrainages": MAX_PARRAINAGES,
        "points_par_filleul": POINTS_PARRAIN,
        "points_filleul": POINTS_FILLEUL,
        "filleuls": [{"prenom": f.prenom, "date": f.date_inscription} for f in filleuls],
        "lien": f"http://localhost:5173/client/login?code={client.code_parrainage}"
    }

@router.get("/verifier-code/{code}")
def verifier_code_parrainage(code: str, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(request.client.host, max_req=15, window_sec=60)
    code_clean = _sanitize_code(code)
    if not re.match(r'^SKY-[A-Z]+-[A-Z0-9]{4}$', code_clean):
        return {"valide": False, "message": "Format de code invalide"}
    parrain = db.query(ClientFidelite).filter(
        ClientFidelite.code_parrainage == code_clean
    ).first()
    if not parrain:
        return {"valide": False, "message": "Code invalide"}
    if parrain.nb_parrainages >= MAX_PARRAINAGES:
        return {"valide": False, "message": "Ce code a déjà été utilisé 3 fois"}
    return {
        "valide": True,
        "parrain_prenom": parrain.prenom,
        "points_filleul": POINTS_FILLEUL,
        "restants": MAX_PARRAINAGES - parrain.nb_parrainages
    }

# ── HISTORIQUE SPINS ──────────────────────────────────────

@router.get("/historique-spins")
def spin_history(client: ClientFidelite = Depends(get_current_client), db: Session = Depends(get_db)):
    gains = db.query(GainSpin).filter(GainSpin.client_id == client.id).order_by(GainSpin.date_gain.desc()).all()
    
    res = []
    for g in gains:
        prix = db.query(PrixRoue).filter(PrixRoue.id == g.prix_id).first()
        res.append({
            "id": g.id,
            "nom_prix": prix.nom,
            "date": g.date_gain,
            "statut": g.statut,
            "points_avant": g.points_avant,
            "points_apres": g.points_apres
        })
    return res
