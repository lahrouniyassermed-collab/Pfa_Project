"""
Scheduler APScheduler — tâches automatiques nocturnes
Lance automatiquement les emails marketing selon les conditions.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import engine
from app.core.config import settings
from app.services.email_service import (
    envoyer_email_retour,
    envoyer_email_anniversaire,
    envoyer_email_tombola,
)


def _get_nom_resto() -> str:
    from app.models.models import RestaurantInfo
    with Session(engine) as db:
        info = db.query(RestaurantInfo).first()
        return info.nom if info else settings.RESTAURANT_NAME


def job_emails_retour():
    """Clients absents depuis 30 jours → email de retour."""
    from app.models.models import ClientFidelite
    seuil = datetime.now() - timedelta(days=30)
    date_offre_fin = (datetime.now() + timedelta(days=15)).strftime("%d/%m/%Y")
    nom_resto = _get_nom_resto()

    with Session(engine) as db:
        clients = db.query(ClientFidelite).filter(
            ClientFidelite.email_confirme == True,
            ClientFidelite.accept_emails == True,
            ClientFidelite.derniere_visite != None,
            ClientFidelite.derniere_visite <= seuil,
        ).all()

        for c in clients:
            envoyer_email_retour(c.prenom, c.email, date_offre_fin, nom_resto)
            print(f"[SCHEDULER] Email retour envoyé à {c.email}")


def job_emails_anniversaire():
    """Clients dont l'anniversaire est aujourd'hui → email anniversaire."""
    from app.models.models import ClientFidelite
    aujourd_hui = datetime.now().strftime("%m-%d")
    nom_resto = _get_nom_resto()

    with Session(engine) as db:
        clients = db.query(ClientFidelite).filter(
            ClientFidelite.email_confirme == True,
            ClientFidelite.accept_emails == True,
            ClientFidelite.date_naissance == aujourd_hui,
        ).all()

        for c in clients:
            envoyer_email_anniversaire(c.prenom, c.email, nom_resto)
            print(f"[SCHEDULER] Email anniversaire envoyé à {c.email}")


def job_emails_tombola():
    """Tombola qui expire dans 48h → rappel à tous les clients."""
    from app.models.models import ClientFidelite, Tombola
    dans_48h = datetime.now() + timedelta(hours=48)
    nom_resto = _get_nom_resto()

    with Session(engine) as db:
        tombola = db.query(Tombola).filter(
            Tombola.active == True,
            Tombola.date_fin <= dans_48h,
            Tombola.date_fin >= datetime.now(),
        ).first()

        if not tombola:
            return

        date_fin_str = tombola.date_fin.strftime("%d/%m/%Y à %Hh")

        clients = db.query(ClientFidelite).filter(
            ClientFidelite.email_confirme == True,
            ClientFidelite.accept_emails == True,
        ).all()

        for c in clients:
            envoyer_email_tombola(
                c.prenom, c.email,
                tombola.titre, date_fin_str, nom_resto
            )
            print(f"[SCHEDULER] Email tombola envoyé à {c.email}")


# ── Démarrage du scheduler ────────────────────────────────────────────────

scheduler = BackgroundScheduler(timezone="Africa/Casablanca")

# Chaque soir à 20h
scheduler.add_job(job_emails_retour,       CronTrigger(hour=20, minute=0))
scheduler.add_job(job_emails_anniversaire, CronTrigger(hour=20, minute=5))
scheduler.add_job(job_emails_tombola,      CronTrigger(hour=20, minute=10))


def demarrer_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[SCHEDULER] Démarré — emails automatiques actifs à 20h chaque soir")


def arreter_scheduler():
    if scheduler.running:
        scheduler.shutdown()
