import sqlite3
import os

def make_telephone_nullable():
    db_path = 'backend/mangermanger.db'
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # SQLite ne supporte pas directement ALTER COLUMN pour rendre nullable.
        # La procédure standard est de recréer la table ou de manipuler le schéma.
        # Mais on va d'abord vérifier si on peut simplement désactiver la contrainte ou si on doit passer par une table temporaire.
        
        print("Starting migration to make telephone nullable...")
        
        # 1. Créer une nouvelle table avec le bon schéma
        cursor.execute("PRAGMA foreign_keys=OFF;")
        
        # Récupérer la définition actuelle de la table pour être sûr de ne rien perdre
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='clients_fidelite';")
        create_sql = cursor.fetchone()[0]
        
        # Remplacer 'telephone VARCHAR(20) NOT NULL' par 'telephone VARCHAR(20)'
        # ou simplement supprimer le NOT NULL s'il existe.
        new_create_sql = create_sql.replace("telephone VARCHAR(20) NOT NULL", "telephone VARCHAR(20)")
        # Au cas où le format est différent (sans NOT NULL explicite mais contraint par ailleurs)
        # Dans le PRAGMA table_info précédent, telephone était (3, 'telephone', 'VARCHAR(20)', 1, None, 0) -> le 1 signifie NOT NULL
        
        cursor.execute("BEGIN TRANSACTION;")
        
        cursor.execute("ALTER TABLE clients_fidelite RENAME TO clients_fidelite_old;")
        
        # Création de la nouvelle table (on utilise le schéma souhaité)
        # Note: SQLAlchemy définit souvent le schéma de façon précise.
        cursor.execute("""
            CREATE TABLE clients_fidelite (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                prenom VARCHAR(100) NOT NULL, 
                nom VARCHAR(100), 
                email VARCHAR(200) NOT NULL UNIQUE, 
                mot_de_passe VARCHAR(255) NOT NULL, 
                telephone VARCHAR(20), 
                points_solde INTEGER DEFAULT 0, 
                date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP, 
                derniere_activite DATETIME DEFAULT CURRENT_TIMESTAMP, 
                spin_count_mois INTEGER DEFAULT 0, 
                derniere_date_spin DATETIME, 
                avis_google_mois BOOLEAN DEFAULT 0, 
                derniere_date_avis DATETIME,
                email_confirme BOOLEAN DEFAULT 0,
                accept_emails BOOLEAN DEFAULT 0,
                date_naissance VARCHAR(10),
                nb_visites INTEGER DEFAULT 0,
                montant_total FLOAT DEFAULT 0.0,
                qr_token VARCHAR(100) UNIQUE
            );
        """)

        # Copier les données
        cursor.execute("""
            INSERT INTO clients_fidelite (
                id, prenom, nom, email, mot_de_passe, telephone, points_solde, 
                date_inscription, derniere_activite, spin_count_mois, 
                derniere_date_spin, avis_google_mois, derniere_date_avis,
                email_confirme, accept_emails, date_naissance, nb_visites, 
                montant_total, qr_token
            )
            SELECT 
                id, prenom, nom, email, mot_de_passe, telephone, points_solde, 
                date_inscription, derniere_activite, spin_count_mois, 
                derniere_date_spin, avis_google_mois, derniere_date_avis,
                email_confirme, accept_emails, date_naissance, nb_visites, 
                montant_total, qr_token
            FROM clients_fidelite_old;
        """)

        cursor.execute("DROP TABLE clients_fidelite_old;")
        
        cursor.execute("COMMIT;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        
        print("Migration successful: telephone is now nullable.")

    except Exception as e:
        cursor.execute("ROLLBACK;")
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    make_telephone_nullable()
