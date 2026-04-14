"""
Services IA — MangerManger
  1. analyser_screenshot()  : GPT-4o Vision → vérifie si le screenshot est un avis Google Maps
  2. analyser_sentiment()   : HuggingFace cardiffnlp → positif / neutre / négatif
"""
import base64, os
from app.core.config import settings

# ── Module 1 : Vérification screenshot (OpenAI GPT-4o) ───────────────────────

async def analyser_screenshot(image_path: str) -> tuple[float, bool]:
    """
    Retourne (score_confiance: float 0-1, est_valide: bool)
    score > 0.7 → considéré valide automatiquement
    """
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        ext = image_path.split(".")[-1].lower()
        media_type = "image/jpeg" if ext in ["jpg", "jpeg"] else "image/png"

        response = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{image_data}"}
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Est-ce que cette image est une capture d'écran d'un avis Google Maps "
                            f"pour le restaurant '{settings.RESTAURANT_NAME}' ? "
                            "Réponds UNIQUEMENT en JSON : "
                            '{"est_avis_google": true/false, "score": 0.0-1.0, "raison": "..."}'
                        )
                    }
                ]
            }]
        )

        import json
        text = response.choices[0].message.content.strip()
        # Nettoyer les balises markdown si présentes
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)

        score = float(result.get("score", 0.0))
        est_valide = result.get("est_avis_google", False) and score >= 0.7
        return score, est_valide

    except Exception as e:
        print(f"[IA Screenshot] Erreur : {e}")
        return 0.0, False


# ── Module 2 : Analyse de sentiment (HuggingFace local) ──────────────────────

_sentiment_pipeline = None  # Chargé une seule fois au premier appel

def _get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        from transformers import pipeline
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            return_all_scores=False
        )
    return _sentiment_pipeline

async def analyser_sentiment(texte: str) -> str:
    """
    Retourne "positif", "neutre", ou "negatif"
    Modèle : cardiffnlp/twitter-xlm-roberta-base-sentiment
    Labels du modèle : Positive, Neutral, Negative
    """
    try:
        pipe = _get_sentiment_pipeline()
        result = pipe(texte[:512])[0]  # Tronquer à 512 tokens max
        label = result["label"].lower()

        mapping = {
            "positive": "positif",
            "neutral": "neutre",
            "negative": "negatif",
        }
        return mapping.get(label, "neutre")

    except Exception as e:
        print(f"[IA Sentiment] Erreur : {e}")
        return "neutre"
