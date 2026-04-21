"""
Routes documents sécurisés :

  POST /api/admin/upload-pdf       — upload PDF privé [gerant]
  GET  /api/documents/{file_id}    — téléchargement sécurisé [gerant]
  GET  /api/documents/             — liste tous les documents [gerant]
  DELETE /api/documents/{file_id}  — suppression [gerant]

Sécurité appliquée :
  - Fichiers stockés dans storage/private_docs/ (hors dossier public /uploads)
  - Renommage UUID → impossible de deviner le chemin
  - Téléchargement avec Content-Disposition: attachment (jamais exécuté par le navigateur)
  - Aucun parsing du contenu (bloque SSRF via PDF)
  - Validation magic bytes dans la dépendance validate_pdf_upload
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.core.upload_validator import validate_pdf_upload
from app.models.models import Document, Employe

router_documents = APIRouter(tags=["Documents sécurisés"])

# Dossier de stockage privé — séparé de /uploads (qui est public)
STORAGE_DIR = "storage/private_docs"
os.makedirs(STORAGE_DIR, exist_ok=True)


# ── Upload ────────────────────────────────────────────────────────────────

@router_documents.post("/api/admin/upload-pdf")
async def upload_pdf(
    file: UploadFile = Depends(validate_pdf_upload),
    db: Session = Depends(get_db),
    current_user: Employe = Depends(require_role("gerant")),
):
    """
    Reçoit un PDF validé (magic bytes + taille vérifiés par la dépendance),
    le stocke sous un nom UUID et enregistre les métadonnées en base.
    """
    nom_original = file.filename
    nom_stockage = f"{uuid.uuid4().hex}.pdf"
    chemin = os.path.join(STORAGE_DIR, nom_stockage)

    # Lire et écrire — aucun parsing, aucune interprétation du contenu
    contenu = await file.read()
    with open(chemin, "wb") as f:
        f.write(contenu)

    doc = Document(
        nom_original=nom_original,
        nom_stockage=nom_stockage,
        chemin=chemin,
        taille_octets=len(contenu),
        uploade_par=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "message": "Document uploadé avec succès.",
        "id": doc.id,
        "nom_original": doc.nom_original,
        "taille_kb": round(doc.taille_octets / 1024, 1),
    }


# ── Téléchargement sécurisé ───────────────────────────────────────────────

@router_documents.get("/api/documents/{file_id}")
def telecharger_document(
    file_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    """
    Sert le fichier PDF avec les headers de sécurité obligatoires :
      - Content-Disposition: attachment  → force le téléchargement, jamais l'exécution
      - Content-Type: application/octet-stream → le navigateur ne tente pas de l'ouvrir
      - X-Content-Type-Options: nosniff  → bloque le MIME sniffing

    IMPORTANT : FileResponse sert le fichier tel quel, sans aucune lecture
    ou parsing du contenu — ce qui bloque les attaques SSRF via PDF.
    """
    doc = db.query(Document).filter(Document.id == file_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    if not os.path.exists(doc.chemin):
        raise HTTPException(status_code=404, detail="Fichier manquant sur le disque.")

    return FileResponse(
        path=doc.chemin,
        media_type="application/octet-stream",     # ne pas mettre application/pdf
        filename=doc.nom_original,                  # nom affiché lors du téléchargement
        headers={
            "Content-Disposition": f'attachment; filename="{doc.nom_original}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",            # ne pas mettre en cache
        },
    )


# ── Liste ─────────────────────────────────────────────────────────────────

@router_documents.get("/api/documents/")
def liste_documents(
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    docs = db.query(Document).order_by(Document.date_upload.desc()).all()
    return [{
        "id": d.id,
        "nom_original": d.nom_original,
        "taille_kb": round(d.taille_octets / 1024, 1),
        "date_upload": d.date_upload.isoformat() if d.date_upload else None,
    } for d in docs]


# ── Suppression ───────────────────────────────────────────────────────────

@router_documents.delete("/api/documents/{file_id}")
def supprimer_document(
    file_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("gerant")),
):
    doc = db.query(Document).filter(Document.id == file_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    # Supprimer le fichier physique
    if os.path.exists(doc.chemin):
        os.remove(doc.chemin)

    db.delete(doc)
    db.commit()
    return {"message": "Document supprimé."}
