from app.core.database import engine
from app.models.models import Employe
from sqlalchemy.orm import Session

with Session(engine) as db:
    admin = db.query(Employe).filter(Employe.identifiant == 'admin').first()
    if admin:
        admin.actif = True
        db.commit()
        print('Compte admin réactivé !')
    else:
        print('Compte admin introuvable.')
