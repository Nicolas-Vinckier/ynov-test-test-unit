# Backend Python Flask - API Calculatrice

Ce dossier contient l'implémentation Python Flask du backend calculatrice.

Il expose le même contrat HTTP que les autres backends :

```http
GET /calculate?operation=add&a=1&b=2
```

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

## Commandes locales

```bash
cd backend-python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check src tests
pytest
python -m src.app
```

L'API écoute par défaut sur le port `3000`.

## Docker applicatif

Depuis la racine du projet :

```bash
docker compose -f docker-compose.python.yml up --build
```

Dans ce Compose, le service Docker s'appelle `backend`. Le gateway peut donc continuer à rediriger `/api/*` vers `backend:3000`.

## Docker de test

Depuis la racine du projet :

```bash
BACKEND=python docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Ce Compose lance :

- `redis-test`, le Redis réservé aux tests ;
- `backend-test-target`, le vrai backend Flask lancé avec Gunicorn ;
- `backend-tests`, le conteneur qui exécute `ruff check src tests && pytest`.

Les tests HTTP d'intégration sont activés quand `TEST_BASE_URL` est défini par Docker Compose.
