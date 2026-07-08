from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, get_current_user
from app.models.models import Employe
from app.services.email_service import envoyer_otp
from app.core.config import settings
import random, string

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# OTP en mémoire : {employe_id: (code, expiry)}
_reset_codes: dict = {}

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Employe).filter(Employe.identifiant == form.username).first()
    if not user or not verify_password(form.password, user.code_passe):
        raise HTTPException(status_code=401, detail="Identifiant ou code incorrect")
    if not user.actif:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    token = create_access_token({"sub": user.identifiant, "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "nom": user.nom,
        "prenom": user.prenom,
        "identifiant": user.identifiant,
        "email": user.email or "",
    }

# ── Profil (lecture + mise à jour email) ─────────────────
@router.get("/me")
def get_me(user: Employe = Depends(get_current_user)):
    return {"nom": user.nom, "prenom": user.prenom, "identifiant": user.identifiant, "email": user.email or ""}

class UpdateEmailSchema(BaseModel):
    email: str

@router.put("/me/email")
def update_email(data: UpdateEmailSchema, db: Session = Depends(get_db), user: Employe = Depends(get_current_user)):
    emp = db.query(Employe).filter(Employe.id == user.id).first()
    emp.email = data.email.strip()
    db.commit()
    return {"ok": True, "email": emp.email}

# ── Demander code reset mot de passe ──────────────────────
@router.post("/demander-code-mdp")
def demander_code_mdp(db: Session = Depends(get_db), user: Employe = Depends(get_current_user)):
    emp = db.query(Employe).filter(Employe.id == user.id).first()
    if not emp.email:
        raise HTTPException(400, "Aucun email configuré sur votre compte. Ajoutez-en un d'abord.")
    code = ''.join(random.choices(string.digits, k=6))
    _reset_codes[emp.id] = (code, datetime.utcnow() + timedelta(minutes=10))
    sent = envoyer_otp(emp.prenom, emp.email, code, settings.RESTAURANT_NAME)
    if not sent:
        print(f"[RESET MDP] Code pour {emp.identifiant} : {code}")
    return {"ok": True, "message": f"Code envoyé à {emp.email}"}

# ── Confirmer code + nouveau mot de passe ─────────────────
class ChangerMdpSchema(BaseModel):
    code: str
    nouveau_mdp: str

@router.post("/changer-mdp")
def changer_mdp(data: ChangerMdpSchema, db: Session = Depends(get_db), user: Employe = Depends(get_current_user)):
    entry = _reset_codes.get(user.id)
    if not entry:
        raise HTTPException(400, "Aucun code demandé. Cliquez d'abord sur 'Envoyer un code'.")
    code_valide, expiry = entry
    if datetime.utcnow() > expiry:
        del _reset_codes[user.id]
        raise HTTPException(400, "Code expiré. Veuillez en demander un nouveau.")
    if data.code.strip() != code_valide:
        raise HTTPException(400, "Code incorrect.")
    if len(data.nouveau_mdp) < 4:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 4 caractères.")
    emp = db.query(Employe).filter(Employe.id == user.id).first()
    emp.code_passe = hash_password(data.nouveau_mdp)
    db.commit()
    del _reset_codes[user.id]
    return {"ok": True, "message": "Mot de passe modifié avec succès."}
