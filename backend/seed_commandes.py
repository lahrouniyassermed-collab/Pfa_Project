"""
Seed commandes historiques — CA réaliste sur 7 jours
Lance depuis backend/ :  py -3.14 seed_commandes.py
"""
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import engine, Base
from app.models.models import (
    Commande, LigneCommande, Plat, Table, Employe,
    StatutCommandeEnum, OrigineCommandeEnum
)

Base.metadata.create_all(bind=engine)

with Session(engine) as db:
    plats = db.query(Plat).filter(Plat.statut == "valide", Plat.disponible == True).all()
    tables = db.query(Table).all()
    employes = db.query(Employe).filter(Employe.role == "serveur").all()

    if not plats:
        print("❌ Aucun plat valide trouvé — lance seed_menu.py d'abord.")
        exit()
    if not tables:
        print("❌ Aucune table trouvée.")
        exit()

    # Nombre de commandes par jour (aujourd'hui aura le plus)
    today = datetime.now().date()
    jours = [
        (today - timedelta(days=6), random.randint(4,  6)),
        (today - timedelta(days=5), random.randint(6,  9)),
        (today - timedelta(days=4), random.randint(5,  8)),
        (today - timedelta(days=3), random.randint(8, 12)),
        (today - timedelta(days=2), random.randint(7, 10)),
        (today - timedelta(days=1), random.randint(10, 14)),
        (today,                     random.randint(12, 18)),
    ]

    total_cmd = 0
    total_ca  = 0

    for jour, nb_commandes in jours:
        for i in range(nb_commandes):
            heure = datetime.combine(jour, datetime.min.time()).replace(
                hour=random.choice([12, 13, 19, 20, 21]),
                minute=random.randint(0, 59)
            )
            table   = random.choice(tables)
            employe = random.choice(employes) if employes else None

            code = f"CMD-{jour.strftime('%Y%m%d')}-{random.randint(1000,9999)}"
            # Éviter les doublons de code
            while db.query(Commande).filter(Commande.code_unique == code).first():
                code = f"CMD-{jour.strftime('%Y%m%d')}-{random.randint(1000,9999)}"

            commande = Commande(
                code_unique=code,
                date_heure=heure,
                statut=StatutCommandeEnum.cloturee,
                origine=OrigineCommandeEnum.serveur,
                table_id=table.id,
                employe_id=employe.id if employe else None,
            )
            db.add(commande)
            db.flush()

            # 1 à 4 plats par commande
            plats_choisis = random.sample(plats, k=min(random.randint(1, 4), len(plats)))
            montant = 0.0
            for plat in plats_choisis:
                qte = random.randint(1, 3)
                ligne = LigneCommande(
                    commande_id=commande.id,
                    plat_id=plat.id,
                    quantite=qte,
                    prix_unitaire=plat.prix,
                )
                db.add(ligne)
                montant += plat.prix * qte

            commande.montant_total = round(montant, 2)
            total_ca  += commande.montant_total
            total_cmd += 1

    db.commit()
    print(f"OK {total_cmd} commandes ajoutees - CA total : {total_ca:.2f} MAD")
    print("Recharge le dashboard gerant pour voir les graphes.")
