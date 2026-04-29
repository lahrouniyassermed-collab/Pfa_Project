"""
Script de seed — remplit le menu SKY07 avec des plats diversifiés.
Usage : python seed_menu.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Categorie, Plat, StatutPlatEnum

MENU = [
    {
        "categorie": "Entrées",
        "plats": [
            {"nom": "Salade Marocaine", "desc": "Tomates, concombres, poivrons, oignons, coriandre fraîche, vinaigrette au citron", "prix": 35},
            {"nom": "Zaalouk", "desc": "Caviar d'aubergines fumées à l'huile d'olive, ail et cumin", "prix": 40},
            {"nom": "Briouates au fromage", "desc": "Feuilletés croustillants au fromage frais et herbes, sauce miel-harissa", "prix": 45},
            {"nom": "Soupe Harira", "desc": "Soupe traditionnelle aux lentilles, tomates, céleri et épices marocaines", "prix": 35},
            {"nom": "Pastilla au poulet", "desc": "Brick feuilletée au poulet, amandes caramélisées et cannelle", "prix": 55},
        ]
    },
    {
        "categorie": "Tajines",
        "plats": [
            {"nom": "Tajine Agneau Pruneaux", "desc": "Épaule d'agneau confite aux pruneaux, amandes grillées et sésame", "prix": 120},
            {"nom": "Tajine Poulet Citron Confit", "desc": "Poulet fermier aux citrons confits, olives vertes et gingembre", "prix": 95},
            {"nom": "Tajine Kefta Mkaouara", "desc": "Boulettes de viande aux tomates, œufs et chermoula maison", "prix": 90},
            {"nom": "Tajine Légumes", "desc": "Courgettes, carottes, pommes de terre, pois chiches et ras el hanout", "prix": 75},
            {"nom": "Tajine Crevettes", "desc": "Crevettes royales, tomates, poivrons, ail et coriandre", "prix": 130},
        ]
    },
    {
        "categorie": "Grillades",
        "plats": [
            {"nom": "Kefta Grillée", "desc": "Brochettes de viande hachée aux herbes, cumin et paprika doux", "prix": 85},
            {"nom": "Entrecôte SKY07", "desc": "Entrecôte 250g marinée aux épices, frites maison et salade", "prix": 145},
            {"nom": "Poulet Charbon", "desc": "Demi-poulet fermier mariné au chermoula, cuit au charbon de bois", "prix": 95},
            {"nom": "Mixte Grill", "desc": "Assortiment de brochettes : kefta, poulet, agneau et merguez", "prix": 160},
            {"nom": "Côtes d'agneau", "desc": "Côtelettes d'agneau grillées au charbon, sauce à la menthe", "prix": 130},
        ]
    },
    {
        "categorie": "Couscous",
        "plats": [
            {"nom": "Couscous Royal", "desc": "Semoule fine, légumes de saison, merguez, agneau et poulet", "prix": 110},
            {"nom": "Couscous Agneau", "desc": "Semoule vapeur, navets, courgettes, pois chiches et épaule d'agneau", "prix": 105},
            {"nom": "Couscous Tfaya", "desc": "Semoule aux oignons caramélisés, raisins secs et poulet fondant", "prix": 100},
            {"nom": "Couscous Végétarien", "desc": "Sept légumes de saison, bouillon au safran et herbes fraîches", "prix": 75},
        ]
    },
    {
        "categorie": "Plats Principaux",
        "plats": [
            {"nom": "Pastilla au Fruits de Mer", "desc": "Grande pastilla feuilletée aux crevettes, calamars, sauce crémée", "prix": 140},
            {"nom": "Mrouzia Agneau", "desc": "Agneau confit au miel, ras el hanout, amandes et raisins secs", "prix": 125},
            {"nom": "Poulet Farci M'hammer", "desc": "Poulet entier farci à la semoule et aux épices, cuit à l'étouffée", "prix": 115},
            {"nom": "Poisson Chermoula", "desc": "Filet de daurade grillé, chermoula maison, légumes vapeur", "prix": 120},
        ]
    },
    {
        "categorie": "Desserts",
        "plats": [
            {"nom": "Cornes de Gazelle", "desc": "Pâtisseries feuilletées fourrées aux amandes et eau de fleur d'oranger", "prix": 35},
            {"nom": "Chebakia", "desc": "Biscuits en forme de fleur frits, miel et graines de sésame", "prix": 30},
            {"nom": "Crème Brûlée Safran", "desc": "Crème brûlée infusée au safran marocain et cardamome", "prix": 45},
            {"nom": "Assiette Pastilla Sucrée", "desc": "Mini pastillas aux amandes, crème pâtissière et cannelle", "prix": 50},
            {"nom": "Moelleux au Chocolat", "desc": "Cœur coulant au chocolat noir, crème anglaise à la vanille", "prix": 45},
        ]
    },
    {
        "categorie": "Boissons",
        "plats": [
            {"nom": "Thé à la Menthe", "desc": "Thé vert Gunpowder, menthe fraîche, sucre à volonté", "prix": 25},
            {"nom": "Jus d'Orange Frais", "desc": "Oranges pressées à la minute, légèrement sucrées", "prix": 30},
            {"nom": "Cocktail Maison SKY07", "desc": "Grenadine, citron, menthe, eau gazeuse — sans alcool", "prix": 35},
            {"nom": "Café Marocain", "desc": "Café parfumé aux épices — cardamome, cannelle et clou de girofle", "prix": 20},
            {"nom": "Lait d'Amande Maison", "desc": "Amandes mixées, sucre de canne, eau de fleur d'oranger", "prix": 35},
            {"nom": "Eau Minérale", "desc": "50cl ou 1L", "prix": 15},
        ]
    },
]

def seed():
    db = SessionLocal()
    try:
        # Vérifier si déjà seedé
        if db.query(Plat).count() > 5:
            print("Menu déjà rempli. Supprimez les plats existants pour re-seeder.")
            return

        for cat_data in MENU:
            # Trouver ou créer la catégorie
            cat = db.query(Categorie).filter(Categorie.nom == cat_data["categorie"]).first()
            if not cat:
                cat = Categorie(nom=cat_data["categorie"])
                db.add(cat)
                db.flush()

            for p in cat_data["plats"]:
                plat = Plat(
                    nom=p["nom"],
                    description=p["desc"],
                    prix=p["prix"],
                    categorie_id=cat.id,
                    disponible=True,
                    statut=StatutPlatEnum.valide,
                )
                db.add(plat)

        db.commit()
        total = db.query(Plat).count()
        print(f"Seed terminé — {total} plats ajoutés dans {len(MENU)} catégories.")

    except Exception as e:
        db.rollback()
        print(f"Erreur: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
