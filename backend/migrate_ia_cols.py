import sqlite3
import os

def migrate():
    db_path = 'backend/mangermanger.db'
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cols = [
        ("avis_screenshot", "VARCHAR(500)"),
        ("avis_score_ia", "FLOAT"),
        ("avis_sentiment", "VARCHAR(20)"),
        ("avis_statut", "VARCHAR(20)")
    ]

    for col_name, col_type in cols:
        try:
            cursor.execute(f"ALTER TABLE clients_fidelite ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name}")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
