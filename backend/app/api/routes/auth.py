from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.models import Employe

router = APIRouter(prefix="/api/auth", tags=["Auth"])

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
    }
