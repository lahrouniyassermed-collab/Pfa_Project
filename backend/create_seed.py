"""
Seed de données initiales — catégories + ingrédients de base.
À lancer UNE SEULE FOIS après create_admin.py :
    python create_seed.py
"""
from app.core.database import engine, Base
from app.models.models import Categorie, Ingredient
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

CATEGORIES = [
    ("Entrées",   1),
    ("Plats",     2),
    ("Desserts",  3),
    ("Boissons",  4),
]

INGREDIENTS = [
    # (nom, quantite_stock, seuil_alerte, unite)
    ("Farine",         10.0, 2.0,  "kg"),
    ("Huile d'olive",  5.0,  1.0,  "L"),
    ("Sel",            2.0,  0.5,  "kg"),
    ("Poivre",         0.5,  0.1,  "kg"),
    ("Tomates",        8.0,  2.0,  "kg"),
    ("Oignons",        5.0,  1.0,  "kg"),
    ("Ail",            1.0,  0.2,  "kg"),
    ("Poulet",         6.0,  2.0,  "kg"),
    ("Bœuf",           4.0,  1.5,  "kg"),
    ("Agneau",         3.0,  1.0,  "kg"),
    ("Pommes de terre",10.0, 3.0,  "kg"),
    ("Riz",            8.0,  2.0,  "kg"),
    ("Pâtes",          6.0,  1.5,  "kg"),
    ("Œufs",           24.0, 6.0,  "pièces"),
    ("Lait",           4.0,  1.0,  "L"),
    ("Beurre",         1.0,  0.3,  "kg"),
    ("Fromage",        2.0,  0.5,  "kg"),
    ("Sucre",          3.0,  0.5,  "kg"),
    ("Chocolat",       1.5,  0.3,  "kg"),
    ("Citron",         10.0, 3.0,  "pièces"),
]

with Session(engine) as db:
    # Catégories
    existing_cats = db.query(Categorie).count()
    if existing_cats == 0:
        for nom, ordre in CATEGORIES:
            db.add(Categorie(nom=nom, ordre=ordre))
        db.commit()
        print(f"✅ {len(CATEGORIES)} catégories créées")
    else:
        print(f"⚠️  {existing_cats} catégories déjà présentes — ignoré")

    # Ingrédients
    existing_ings = db.query(Ingredient).count()
    if existing_ings == 0:
        for nom, qte, seuil, unite in INGREDIENTS:
            db.add(Ingredient(nom=nom, quantite_stock=qte, seuil_alerte=seuil, unite=unite))
        db.commit()
        print(f"✅ {len(INGREDIENTS)} ingrédients créés")
    else:
        print(f"⚠️  {existing_ings} ingrédients déjà présents — ignoré")

print("\n🎉 Seed terminé ! Redémarre uvicorn et recharge la page.")
