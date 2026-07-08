# Idée : Section commentaires / suggestions visiteurs sur la landing page

## Concept
Ajouter une section sur la landing page (près du footer) où les visiteurs du site peuvent laisser des suggestions pour améliorer l'entreprise.

**Exemples de retours possibles :**
- Demande d'ajout d'un plat au menu
- Suggestions sur le service
- Retour sur l'ambiance, les horaires, etc.

## Mon avis (Claude)

### Points positifs
- **Feedback direct** : Le gérant reçoit des idées concrètes des clients/visiteurs sans intermédiaire.
- **Engagement** : Les visiteurs se sentent écoutés, ce qui augmente la fidélité.
- **Données exploitables** : Avec n8n, on peut automatiser la collecte dans un fichier/tableur pour le gérant.

### Points d'attention — Sécurité
C'est un formulaire public (pas d'authentification), donc il faut absolument :

1. **Injection HTML/XSS** : Ne jamais afficher les commentaires avec `dangerouslySetInnerHTML`. Toujours utiliser du texte brut (`textContent` / `{variable}` en React qui échappe par défaut). Côté backend, utiliser Pydantic pour valider + limiter la longueur.
2. **Injection SQL** : SQLAlchemy ORM protège déjà contre ça (requêtes paramétrées). Ne jamais utiliser `text()` avec des f-strings.
3. **Rate limiting** : Ajouter un rate limit (ex: `slowapi` avec FastAPI) pour éviter le spam — max 3 soumissions par IP par heure.
4. **CAPTCHA** : Envisager un simple honeypot field (champ caché) ou Google reCAPTCHA pour bloquer les bots.
5. **Longueur max** : Limiter à ~500 caractères côté frontend ET backend.
6. **Pas d'affichage public** : Les commentaires ne doivent PAS être affichés sur le site. Ils sont uniquement visibles par le gérant (via n8n ou dashboard admin).

### Architecture recommandée

```
Frontend (LandingPage.jsx)
  └── Formulaire : nom (optionnel) + suggestion (texte brut, max 500 chars)
       └── POST /api/suggestions

Backend (suggestions.py)
  └── Table `suggestions` : id, nom, message, date_depot, ip_hash, lu
       └── Validation Pydantic + rate limit
       └── Pas d'affichage public, seulement GET /api/suggestions (gerant)

n8n (intégration future)
  └── Webhook déclenché à chaque nouvelle suggestion
  └── Append dans Google Sheets / fichier CSV pour le gérant
```

### Recommandation
**Implémenter après** la mise en production du MVP actuel. C'est une feature "nice-to-have" qui peut attendre. La section Avis Clients existante couvre déjà une partie du besoin (feedback général avec sentiment IA).

La vraie valeur ajoutée sera l'intégration n8n pour que le gérant reçoive les suggestions sans avoir à checker le dashboard.

---

*Document créé le 2026-07-07 — à reprendre quand on intègre n8n.*
