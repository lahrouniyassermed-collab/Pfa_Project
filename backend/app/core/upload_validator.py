"""
Dépendance FastAPI — validation sécurisée d'un upload PDF.

Vérifie dans l'ordre :
  1. Taille <= 5 MB  (avant tout traitement)
  2. Magic bytes     (les 4 premiers octets doivent être %PDF)
  3. Extension       (.pdf uniquement)

Usage dans une route :
    @router.post("/upload")
    async def upload(file: UploadFile = Depends(validate_pdf_upload)):
        ...
"""
from fastapi import UploadFile, HTTPException

MAX_SIZE = 5 * 1024 * 1024          # 5 MB en octets
PDF_MAGIC = b"%PDF"                  # signature réelle d'un fichier PDF
PDF_MAGIC_LEN = 4


async def validate_pdf_upload(file: UploadFile) -> UploadFile:
    """
    Dépendance injectable.
    Lève HTTPException 400 si le fichier ne passe pas la validation.
    Retourne l'UploadFile intact (le curseur est remis à 0).
    """

    # ── 1. Extension déclarée ─────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Seuls les fichiers PDF sont acceptés.",
        )

    # ── 2. Lecture partielle pour vérifier taille + magic bytes ──────────
    # On lit MAX_SIZE + 1 octets : si on obtient plus de MAX_SIZE c'est trop gros.
    contenu = await file.read(MAX_SIZE + 1)

    # ── 3. Vérification taille ────────────────────────────────────────────
    if len(contenu) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Maximum autorisé : 5 MB.",
        )

    if len(contenu) < PDF_MAGIC_LEN:
        raise HTTPException(
            status_code=400,
            detail="Fichier invalide ou corrompu.",
        )

    # ── 4. Magic bytes — vérifie la vraie nature du fichier ───────────────
    # Un PDF commence TOUJOURS par les 4 octets %PDF (0x25 0x50 0x44 0x46).
    # Cette vérification est indépendante du nom de fichier : un .exe renommé
    # en .pdf sera rejeté ici.
    if contenu[:PDF_MAGIC_LEN] != PDF_MAGIC:
        raise HTTPException(
            status_code=400,
            detail="Le fichier n'est pas un PDF valide (magic bytes incorrects).",
        )

    # ── 5. Remettre le curseur à 0 pour que la route puisse lire le fichier
    await file.seek(0)

    return file
