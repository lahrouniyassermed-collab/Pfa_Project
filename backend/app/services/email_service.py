"""
Service email — Gmail SMTP + Resend fallback
"""
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def _envoyer(destinataire: str, sujet: str, html: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL] SMTP non configuré — code affiché en console")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = sujet
        msg["From"] = f"SKY07 <{settings.SMTP_USER}>"
        msg["To"] = destinataire
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls(context=ctx)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, destinataire, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL] Erreur SMTP : {e}")
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


# ── 7. Code OTP vérification téléphone ────────────────────────────────────

def envoyer_otp(prenom: str, email: str, code: str, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Vérification de votre numéro
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">Bonjour {prenom},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      Votre code de vérification est :
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <span style="font-size: 42px; font-weight: 700; letter-spacing: 12px;
                   color: #1a1a1a; font-family: monospace;">{code}</span>
    </div>
    <p style="font-size: 13px; color: #999;">Ce code expire dans 10 minutes.</p>
    """
    return _envoyer(email, f"Votre code de vérification {nom_resto}", _base_html(contenu, nom_resto))


# ── 8. Bienvenue parrainage ────────────────────────────────────────────────

def envoyer_email_parrainage(prenom: str, email: str, parrain_prenom: str,
                              points_gagnes: int, nom_resto: str) -> bool:
    contenu = f"""
    <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">
      Bienvenue chez {nom_resto} !
    </h2>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">Bonjour {prenom},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      <strong>{parrain_prenom}</strong> vous a invité(e) à rejoindre notre programme fidélité.<br>
      <strong>{points_gagnes} points</strong> ont été crédités sur votre compte.
    </p>
    """
    return _envoyer(email, f"Bienvenue — {points_gagnes} points offerts !", _base_html(contenu, nom_resto))
