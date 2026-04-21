"""
Service email — Resend API
Templates : confirmation, tombola, nouveau plat, retour client, anniversaire, nouveau menu
"""
import resend
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY

# Sans domaine vérifié → utiliser l'adresse de test Resend
# Avec domaine vérifié → remplacer par ex: "MangerManger <noreply@mangermanger.ma>"
EXPEDITEUR = "onboarding@resend.dev"


def _envoyer(destinataire: str, sujet: str, html: str) -> bool:
    """Envoie un email via Resend. Retourne True si succès."""
    if not settings.RESEND_API_KEY:
        print(f"[EMAIL] Clé Resend manquante — email non envoyé à {destinataire}")
        return False
    try:
        resend.Emails.send({
            "from": EXPEDITEUR,
            "to": destinataire,
            "subject": sujet,
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[EMAIL] Erreur Resend : {e}")
        return False


def _base_html(contenu: str, nom_resto: str) -> str:
    """Template HTML minimaliste commun à tous les emails."""
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px;
                margin: 0 auto; color: #1a1a1a; padding: 40px 20px;">
      <p style="font-size: 13px; color: #999; margin-bottom: 32px; text-transform: uppercase;
                letter-spacing: 1px;">{nom_resto}</p>
      {contenu}
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="font-size: 11px; color: #bbb;">
        Vous recevez cet email car vous avez accepté nos communications lors de votre inscription.<br>
        Pour ne plus recevoir d'emails, contactez-nous directement.
      </p>
    </div>
    """


# ── 1. Confirmation d'email ────────────────────────────────────────────────

def envoyer_confirmation_email(prenom: str, email: str, lien: str, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Confirmez votre email
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Cliquez sur le bouton ci-dessous pour confirmer votre adresse email
      et activer votre compte fidélité.
    </p>
    <a href="{lien}"
       style="display: inline-block; margin: 24px 0; padding: 14px 28px;
              background: #1a1a1a; color: #fff; text-decoration: none;
              border-radius: 8px; font-size: 14px; font-weight: 500;">
      Confirmer mon email
    </a>
    <p style="font-size: 13px; color: #999;">
      Ce lien expire dans 24 heures.
    </p>
    """
    return _envoyer(email, "Confirmez votre email", _base_html(contenu, nom_resto))


# ── 2. Tombola active ──────────────────────────────────────────────────────

def envoyer_email_tombola(prenom: str, email: str, titre_tombola: str,
                          date_fin: str, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Tombola — {titre_tombola}
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      La tombola se termine le <strong>{date_fin}</strong>.<br>
      Venez dîner et tentez votre chance.
    </p>
    """
    return _envoyer(email, f"Tombola — encore quelques jours", _base_html(contenu, nom_resto))


# ── 3. Nouveau plat ────────────────────────────────────────────────────────

def envoyer_email_nouveau_plat(prenom: str, email: str, nom_plat: str,
                                prix: float, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Nouveauté cette semaine
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Notre chef a préparé quelque chose de nouveau :<br><br>
      <strong style="font-size: 17px;">{nom_plat}</strong>
      &nbsp;—&nbsp;{prix:.0f} dh
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      On vous attend.
    </p>
    """
    return _envoyer(email, "Nouveauté cette semaine", _base_html(contenu, nom_resto))


# ── 4. Client absent (rétention) ──────────────────────────────────────────

def envoyer_email_retour(prenom: str, email: str, date_offre_fin: str,
                          nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      On vous attend
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Un dessert offert sur votre prochaine visite.<br>
      Valable jusqu'au <strong>{date_offre_fin}</strong>.
    </p>
    """
    return _envoyer(email, "On vous attend", _base_html(contenu, nom_resto))


# ── 5. Anniversaire ────────────────────────────────────────────────────────

def envoyer_email_anniversaire(prenom: str, email: str, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Bonne fête 🎂
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Toute l'équipe vous souhaite un joyeux anniversaire.<br>
      Un cadeau vous attend à votre prochaine visite.
    </p>
    """
    return _envoyer(email, f"Bonne fête {prenom}", _base_html(contenu, nom_resto))


# ── 6. Nouveau menu / nouveau cuisinier ────────────────────────────────────

def envoyer_email_nouveau_menu(prenom: str, email: str, message: str,
                                nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Nouveau menu cette semaine
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Bonjour {prenom},
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      {message}
    </p>
    """
    return _envoyer(email, "Nouveau menu cette semaine", _base_html(contenu, nom_resto))
