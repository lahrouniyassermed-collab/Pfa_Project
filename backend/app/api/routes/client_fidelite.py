from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import random
import shutil
import uuid
import os

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_client
from app.models.models import ClientFidelite, PrixRoue, GainSpin, ConfigFidelite, TypePrixEnum, StatutGainEnum
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/api/client", tags=["Client Fidélité"])

class RegisterSchema(BaseModel):
    prenom: str
    nom: str
    email: EmailStr
    password: str
    telephone: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# ── AUTH ──────────────────────────────────────────────────

@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    try:
        # Vérifier si l'email existe déjà
        existing = db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        
        new_client = ClientFidelite(
            prenom=data.prenom,
            nom=data.nom,
            email=data.email,
            mot_de_passe=hash_password(data.password),
            telephone=data.telephone,
        )
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        
        access_token = create_access_token(data={"sub": new_client.email})
        return {"access_token": access_token, "token_type": "bearer", "client": {
            "id": new_client.id,
            "prenom": new_client.prenom,
            "nom": new_client.nom,
            "email": new_client.email
        }}
    except Exception as e:
        print(f"DEBUG REGISTER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    client = db.query(ClientFidelite).filter(ClientFidelite.email == data.email).first()
    if not client or not verify_password(data.password, client.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    access_token = create_access_token(data={"sub": client.email})
    return {"access_token": access_token, "token_type": "bearer", "client": {
        "id": client.id,
        "prenom": client.prenom,
        "nom": client.nom,
        "email": client.email
    }}

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
        "derniere_date_avis": client.derniere_date_avis,
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
    
    # 1. Vérifications
    if client.points_solde < cout_spin:
        raise HTTPException(status_code=400, detail="Points insuffisants")
    
    now = datetime.now()
    if client.derniere_date_spin:
        if client.derniere_date_spin.year == now.year and client.derniere_date_spin.month == now.month:
             raise HTTPException(status_code=400, detail="Un seul spin par mois autorisé")

    # 2. Déterminer les prix disponibles pour ce client
    # Un prix disparaît si gagné 2 fois
    all_prix = db.query(PrixRoue).filter(PrixRoue.actif == True).all()
    disponibles = []
    
    for p in all_prix:
        count = db.query(GainSpin).filter(
            GainSpin.client_id == client.id,
            GainSpin.prix_id == p.id
        ).count()
        if count < 2:
            disponibles.append(p)
    
    # Si tous les prix ont été gagnés 2 fois, on réinitialise (on les rend tous dispos)
    if not disponibles:
        disponibles = all_prix

    if not disponibles:
        raise HTTPException(status_code=500, detail="Aucun prix disponible")

    # 3. Tirage au sort
    gagnant = random.choice(disponibles)
    
    points_avant = client.points_solde
    points_apres = points_avant
    
    # 4. Appliquer les règles de points
    if gagnant.nom == "Double Points":
        # Solde actuel x 2, coût spin offert (non déduit)
        points_apres = points_avant * 2
    else:
        # Déduire le coût du spin
        points_apres = points_avant - cout_spin
    
    # Sauvegarder l'état
    client.points_solde = points_apres
    client.derniere_date_spin = now
    client.spin_count_mois += 1
    
    # Créer le gain
    nb_gains = db.query(GainSpin).filter(
        GainSpin.client_id == client.id,
        GainSpin.prix_id == gagnant.id
    ).count() + 1
    
    nouveau_gain = GainSpin(
        client_id=client.id,
        prix_id=gagnant.id,
        points_avant=points_avant,
        points_apres=points_apres,
        nb_gains_ce_prix=nb_gains
    )
    
    db.add(nouveau_gain)
    db.commit()
    db.refresh(client)
    
    return {
        "prix": {
            "id": gagnant.id,
            "nom": gagnant.nom,
            "description": gagnant.description,
            "type": gagnant.type
        },
        "points_apres": points_apres
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
    if client.derniere_date_avis:
        if client.derniere_date_avis.year == now.year and client.derniere_date_avis.month == now.month:
             raise HTTPException(status_code=400, detail="Bonus déjà récupéré ce mois-ci")

    # Lire l'image
    image_bytes = await file.read()
    
    # Analyser avec Gemini Vision
    try:
        analyse = analyser_screenshot_avis(image_bytes, client.prenom, client.nom)
    except Exception as e:
        print(f"IA Vision Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'analyse de l'image. Veuillez réessayer.")

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
        message = "Avis invalide. Veuillez soumettre une capture d'écran de votre avis Google Maps pour SKY07."
        # Log interne détaillé
        raison_rejet = []
        if not auteur_ok:
            raison_rejet.append(f"nom '{client.prenom} {client.nom}' absent de l'image")
        if not est_sky07:
            raison_rejet.append("SKY07 non détecté")
        if sentiment == "NEGATIF":
            raison_rejet.append("sentiment négatif")
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
        "status": statut.value,
        "message": message,
        "points": client.points_solde,
        "analyse": analyse # Optionnel, pour debug
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
