from app.core.database import engine, Base
from app.models.models import Employe, RoleEnum
from app.core.security import hash_password
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

with Session(engine) as db:
    gerant = Employe(
        nom='Admin',
        prenom='Gerant',
        identifiant='admin',
        code_passe=hash_password('admin123'),
        role=RoleEnum.gerant,
        actif=True
    )
    db.add(gerant)
    db.commit()
    print('Compte gérant créé !')
