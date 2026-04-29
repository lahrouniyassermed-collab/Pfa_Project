import sqlite3
import os

def migrate_db():
    db_path = 'backend/mangermanger.db'
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Liste des colonnes à ajouter à clients_fidelite
    cols_to_add = [
        ("mot_de_passe", "VARCHAR(255)"),
        ("points_solde", "INTEGER DEFAULT 0"),
        ("derniere_activite", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("spin_count_mois", "INTEGER DEFAULT 0"),
        ("derniere_date_spin", "DATETIME"),
        ("avis_google_mois", "BOOLEAN DEFAULT 0"),
        ("derniere_date_avis", "DATETIME")
    ]

    for col_name, col_type in cols_to_add:
        try:
            cursor.execute(f"ALTER TABLE clients_fidelite ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists or error")

    # S'assurer que les nouvelles tables existent aussi
    # (PrixRoue, GainSpin, ConfigFidelite)
    # create_all s'en occupe normalement si elles n'existent pas du tout, 
    # mais on peut aussi forcer une migration plus propre si besoin.

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate_db()
