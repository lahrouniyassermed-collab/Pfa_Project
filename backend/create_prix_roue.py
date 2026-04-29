import sqlite3
from passlib.hash import bcrypt
import os

def seed_fidelite():
    # Utilise le dossier où se trouve le script pour localiser la db
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'mangermanger.db')
    
    if not os.path.exists(db_path):
        print(f"Base de données introuvable à : {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Config par défaut
    cursor.execute("SELECT COUNT(*) FROM config_fidelite")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO config_fidelite (seuil_minimum_mad, points_par_tranche, tranche_mad, cout_spin_points, points_avis_google)
            VALUES (80, 5, 20, 100, 50)
        """)
        print("Config fidélité insérée.")

    # 2. Prix de la roue
    prix_defaut = [
        ("20% OFF", "Réduction sur prochaine visite", 30, "reduction", 20.0),
        ("Repas gratuit", "Jusqu'à 150 MAD", 30, "gratuit", 150.0),
        ("Double Points", "Solde actuel x 2, coût spin offert", 0, "points", 2.0),
        ("Chef's Table VIP", "Table exclusive pour 2 personnes", 60, "gratuit", 0.0),
        ("Boisson offerte", "Valable 30 jours", 30, "gratuit", 0.0),
        ("Dessert offert", "Valable 30 jours", 30, "gratuit", 0.0),
        ("10% OFF", "Réduction sur la note", 30, "reduction", 10.0),
        ("Rejouer", "Tentative perdue, aucun gain", 0, "rejouer", 0.0)
    ]

    cursor.execute("SELECT COUNT(*) FROM prix_roue")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
            INSERT INTO prix_roue (nom, description, validite_jours, type, valeur, actif)
            VALUES (?, ?, ?, ?, ?, 1)
        """, prix_defaut)
        print(f"{len(prix_defaut)} prix insérés dans la roue.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_fidelite()
