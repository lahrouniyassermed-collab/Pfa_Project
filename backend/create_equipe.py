"""
Crée l'équipe : 3 serveurs + 3 cuisiniers supplémentaires.
(Gérant GER001 et Cuisinier CUI001 Ziad déjà existants)
    python create_equipe.py
"""
from app.core.database import engine, Base
from app.core.security import hash_password
from app.models.models import Employe, RoleEnum
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

EQUIPE = [
    # (prenom, nom, identifiant, mot_de_passe, role)

    # ── Serveurs ──────────────────────────────────────────────
    ("Karim",   "Benali",   "SRV001", "karim123",   RoleEnum.serveur),
    ("Nadia",   "El Fassi", "SRV002", "nadia123",   RoleEnum.serveur),
    ("Youssef", "Tahiri",   "SRV003", "youssef123", RoleEnum.serveur),

    # ── Cuisiniers (Ziad CUI001 déjà existant) ───────────────
    ("Fatima",  "Ouchna",   "CUI002", "fatima123",  RoleEnum.cuisinier),
    ("Omar",    "Berrada",  "CUI003", "omar123",    RoleEnum.cuisinier),
    ("Samira",  "Idrissi",  "CUI004", "samira123",  RoleEnum.cuisinier),
]

with Session(engine) as db:
    created = 0
    skipped = 0
    for prenom, nom, identifiant, mdp, role in EQUIPE:
        existing = db.query(Employe).filter(Employe.identifiant == identifiant).first()
        if existing:
            print(f"  ⚠️  {identifiant} déjà existant — ignoré")
            skipped += 1
        else:
            db.add(Employe(
                prenom=prenom, nom=nom,
                identifiant=identifiant,
                code_passe=hash_password(mdp),
                role=role, actif=True,
            ))
            print(f"  ✅ {role.value:<12} {prenom} {nom} — login: {identifiant} / mdp: {mdp}")
            created += 1

    db.commit()

print(f"\n🎉 {created} employés créés, {skipped} ignorés.")
print("\n── Récap complet ──────────────────────────────────────")
print("  GÉRANT     → GER001       / admin123")
print("  SERVEURS   → SRV001 karim123 | SRV002 nadia123 | SRV003 youssef123")
print("  CUISINIERS → CUI001 cuisinier123 (Ziad) | CUI002 fatima123 | CUI003 omar123 | CUI004 samira123")
