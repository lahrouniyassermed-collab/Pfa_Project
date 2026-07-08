import io
import re

try:
    import PIL.Image
    _pil_available = True
except ImportError:
    PIL = None
    _pil_available = False

_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['fr', 'en'], verbose=False)
    return _ocr_reader


def analyser_screenshot_avis(image_bytes: bytes, prenom: str, nom: str) -> dict:
    """
    Pipeline local :
      1. EasyOCR        — extrait le texte de la capture
      2. HuggingFace    — analyse le sentiment (RoBERTa)
         + mots-clés    — filet de sécurité si HuggingFace indisponible
    """
    import numpy as np

    # ── 1. EasyOCR — extraction du texte ──────────────────────────────────
    reader = _get_ocr_reader()
    image = PIL.Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)
    results = reader.readtext(img_array, detail=0)
    texte_complet = " ".join(results).lower()
    print(f"[OCR] Texte extrait : {texte_complet[:300]}")

    # ── 2. Vérifications métier ────────────────────────────────────────────
    mots_google = ["google", "maps", "avis", "review", "étoile", "star", "note", "★", "☆"]
    est_google = any(m in texte_complet for m in mots_google)

    # SKY07 et toutes ses variantes
    est_sky07 = bool(re.search(r'sky\s*0?7', texte_complet, re.IGNORECASE))

    prenom_lower = prenom.lower().strip()
    nom_lower    = nom.lower().strip()

    def mot_present(mot, texte):
        if len(mot) < 3:
            return False
        return bool(re.search(r'\b' + re.escape(mot) + r'\b', texte))

    prenom_ok = mot_present(prenom_lower, texte_complet)
    nom_ok    = mot_present(nom_lower,    texte_complet)
    auteur_correspond = prenom_ok and nom_ok

    print(f"[OCR] SKY07: {est_sky07} | Google Maps: {est_google}")
    print(f"[OCR] Auteur — prenom={prenom_lower}({prenom_ok}) nom={nom_lower}({nom_ok})")

    auteur_detecte = None
    for chunk in results:
        chunk_lower = chunk.lower()
        if mot_present(prenom_lower, chunk_lower) or mot_present(nom_lower, chunk_lower):
            auteur_detecte = chunk
            break

    # ── 3. Sentiment — HuggingFace + fallback mots-clés ──────────────────
    MOTS_POSITIFS = [
        "excellent", "super", "bien", "bon", "top", "parfait", "magnifique", "bravo",
        "recommend", "great", "good", "délicieux", "agréable", "sympa", "chaleureux",
        "joli", "perfect", "j'adore", "jadore", "génial", "incroyable", "fantastique",
        "merveilleux", "formidable", "impeccable", "nickel", "superbe", "exceptionnel",
        "5/5", "je recommande", "recommande", "adoré", "ravi", "content", "satisfait",
        "love", "amazing", "wonderful", "cuisine : 5", "service : 5", "ambiance : 5"
    ]
    MOTS_NEGATIFS = [
        "mauvais", "nul", "horrible", "terrible", "worst", "bad", "awful",
        "détesté", "décevant", "déçu", "sale", "froid", "lent",
        "inacceptable", "reviendrai pas", "ne reviendrai", "pas bon", "dégoût"
    ]

    # Mots-clés comme filet de sécurité
    sentiment_keywords = "NEUTRE"
    if any(m in texte_complet for m in MOTS_NEGATIFS):
        sentiment_keywords = "NEGATIF"
    elif any(m in texte_complet for m in MOTS_POSITIFS):
        sentiment_keywords = "POSITIF"

    try:
        from app.services.ia_service import _get_sentiment_pipeline
        pipe = _get_sentiment_pipeline()
        texte_sentiment = texte_complet[:512] if texte_complet.strip() else ""
        if texte_sentiment:
            result = pipe(texte_sentiment)[0]
            label  = result["label"].lower()
            mapping = {"positive": "POSITIF", "neutral": "NEUTRE", "negative": "NEGATIF"}
            sentiment_hf = mapping.get(label, "NEUTRE")
            score_hf = result["score"]
            print(f"[HuggingFace] {sentiment_hf} ({score_hf:.2f}) | Mots-clés: {sentiment_keywords}")
            # HuggingFace dit NEUTRE mais mots-clés trouvent POSITIF → POSITIF
            if sentiment_hf == "NEUTRE" and sentiment_keywords == "POSITIF":
                sentiment = "POSITIF"
            else:
                sentiment = sentiment_hf
        else:
            sentiment = sentiment_keywords
    except Exception as e:
        print(f"[HuggingFace] Indisponible, fallback mots-clés: {e}")
        sentiment = sentiment_keywords

    # ── 4. Score de confiance ──────────────────────────────────────────────
    score = 0
    if est_google:       score += 30
    if est_sky07:        score += 30
    if auteur_correspond: score += 30
    if sentiment == "POSITIF": score += 10

    motif_rejet = None
    if not auteur_correspond:
        motif_rejet = f"Le nom '{prenom} {nom}' n'est pas visible dans la capture."
    elif not est_sky07:
        motif_rejet = "Le restaurant SKY07 n'est pas visible dans la capture."
    elif not est_google:
        motif_rejet = "Cette image ne semble pas être un avis Google Maps."

    return {
        "est_avis_google":   est_google,
        "restaurant_sky07":  est_sky07,
        "auteur_detecte":    auteur_detecte,
        "auteur_correspond": auteur_correspond,
        "etoiles":           None,
        "texte_extrait":     texte_complet[:200] if texte_complet else None,
        "sentiment":         sentiment,
        "score_confiance":   score,
        "motif_rejet":       motif_rejet,
    }
