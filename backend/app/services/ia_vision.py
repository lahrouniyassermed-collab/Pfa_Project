from google import genai
import json
import io
import re
import PIL.Image
from app.core.config import settings

_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['fr', 'en'], verbose=False)
    return _ocr_reader


def _analyser_par_ocr(image_bytes: bytes, prenom: str, nom: str) -> dict:
    """Analyse locale par OCR — aucune API externe requise."""
    reader = _get_ocr_reader()
    import numpy as np
    image = PIL.Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    results = reader.readtext(img_array, detail=0)
    texte_complet = " ".join(results).lower()
    print(f"[OCR] Texte extrait: {texte_complet[:300]}")

    # Vérifications
    mots_google_maps = ["google", "maps", "avis", "review", "étoile", "star", "note", "★", "☆"]
    est_google = any(mot in texte_complet for mot in mots_google_maps)

    # Cherche "sky07", "sky 07", "sky7" uniquement — pas n'importe quel chiffre
    est_sky07 = bool(re.search(r'sky\s*0?7', texte_complet))

    # Correspondance du nom — mot entier uniquement (évite "ss" dans "assadini")
    prenom_lower = prenom.lower().strip()
    nom_lower = nom.lower().strip()

    def mot_present(mot, texte):
        if len(mot) < 3:  # trop court → trop de faux positifs
            return False
        return bool(re.search(r'\b' + re.escape(mot) + r'\b', texte))

    prenom_ok = mot_present(prenom_lower, texte_complet)
    nom_ok = mot_present(nom_lower, texte_complet)
    auteur_correspond = prenom_ok and nom_ok  # les DEUX doivent être présents

    print(f"[OCR] SKY07 détecté: {est_sky07} | Google Maps: {est_google}")
    print(f"[OCR] Nom vérifié: prenom='{prenom_lower}'({prenom_ok}) nom='{nom_lower}'({nom_ok})")

    # Détection du nom visible
    auteur_detecte = None
    for chunk in results:
        chunk_lower = chunk.lower()
        if mot_present(prenom_lower, chunk_lower) or mot_present(nom_lower, chunk_lower):
            auteur_detecte = chunk
            break

    # Sentiment — HuggingFace RoBERTa (fallback mots-clés si indisponible)
    try:
        from app.services.ia_service import _get_sentiment_pipeline
        pipe = _get_sentiment_pipeline()
        texte_pour_sentiment = texte_complet[:512] if texte_complet else ""
        if texte_pour_sentiment.strip():
            result = pipe(texte_pour_sentiment)[0]
            label = result["label"].lower()
            mapping = {"positive": "POSITIF", "neutral": "NEUTRE", "negative": "NEGATIF"}
            sentiment = mapping.get(label, "NEUTRE")
            print(f"[OCR] Sentiment HuggingFace: {sentiment} (score: {result['score']:.2f})")
        else:
            sentiment = "NEUTRE"
    except Exception as e:
        print(f"[OCR] HuggingFace indisponible, fallback mots-clés: {e}")
        mots_positifs = ["excellent", "super", "bien", "bon", "top", "parfait", "magnifique", "bravo", "recommend", "great", "good", "joli", "délicieux", "agréable", "sympa", "chaleureux"]
        mots_negatifs = ["mauvais", "nul", "horrible", "dégoût", "terrible", "worst", "bad", "awful", "détesté", "déteste", "décevant", "déçu", "sale", "bruit", "froid", "lent", "cher", "inacceptable"]
        sentiment = "NEUTRE"
        if any(m in texte_complet for m in mots_positifs):
            sentiment = "POSITIF"
        elif any(m in texte_complet for m in mots_negatifs):
            sentiment = "NEGATIF"

    # Étoiles — cherche un chiffre près de ★ ou "étoile"
    etoiles = None
    match = re.search(r'([1-5])\s*[★☆*]|[★☆*]\s*([1-5])', texte_complet)
    if match:
        etoiles = int(match.group(1) or match.group(2))

    # Score de confiance
    score = 0
    if est_google:
        score += 30
    if est_sky07:
        score += 30
    if auteur_correspond:
        score += 30
    if sentiment == "POSITIF":
        score += 10

    motif_rejet = None
    if not auteur_correspond:
        motif_rejet = f"Le nom '{prenom} {nom}' n'est pas visible dans la capture d'écran."
    elif not est_sky07:
        motif_rejet = "Le restaurant SKY07 n'est pas visible dans la capture d'écran."
    elif not est_google:
        motif_rejet = "Cette image ne semble pas être un avis Google Maps."

    return {
        "est_avis_google": est_google,
        "restaurant_sky07": est_sky07,
        "auteur_detecte": auteur_detecte,
        "auteur_correspond": auteur_correspond,
        "etoiles": etoiles,
        "texte_extrait": texte_complet[:200] if texte_complet else None,
        "sentiment": sentiment,
        "score_confiance": score,
        "motif_rejet": motif_rejet
    }


def analyser_screenshot_avis(image_bytes: bytes, prenom: str, nom: str) -> dict:
    # Essai Gemini d'abord
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        image = PIL.Image.open(io.BytesIO(image_bytes))

        prompt = f"""
        Analyse cette screenshot et réponds UNIQUEMENT en JSON valide sans markdown.

        Le restaurant s'appelle SKY07.
        Le client qui soumet cet avis s'appelle : {prenom} {nom}

        Vérifie :
        1. Est-ce une interface Google Maps ?
        2. Le nom SKY07 est-il visible quelque part ?
        3. Y a-t-il un avis avec des étoiles ?
        4. Le nom de l'auteur correspond-il à {prenom} {nom} (approximativement) ?
        5. Le texte de l'avis est-il positif ou négatif ?

        Réponds avec ce JSON exact :
        {{
            "est_avis_google": true/false,
            "restaurant_sky07": true/false,
            "auteur_detecte": "nom visible dans l'image ou null",
            "auteur_correspond": true/false,
            "etoiles": 1-5 ou null,
            "texte_extrait": "texte de l'avis ou null",
            "sentiment": "POSITIF" ou "NEUTRE" ou "NEGATIF",
            "score_confiance": 0-100,
            "motif_rejet": "raison si rejet ou null"
        }}
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[image, prompt]
        )

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines[-1].startswith("```") else lines
            text = "\n".join(lines).strip()
            if text.startswith("json"):
                text = text[4:].strip()

        return json.loads(text)

    except Exception as e:
        print(f"[IA_VISION] Gemini indisponible ({type(e).__name__}) — bascule sur OCR local")

    # Fallback OCR local
    return _analyser_par_ocr(image_bytes, prenom, nom)
