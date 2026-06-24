# Backend Flask - API Calculatrice

Le backend JavaScript a été remplacé par une API Python Flask exposant le même contrat HTTP.

## Commandes locales

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check src tests
pytest
python -m src.app
```

L'API écoute par défaut sur le port `3000` et expose :

```http
GET /calculate?operation=add&a=1&b=2
```

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

## Docker

```bash
docker compose up --build
```

Le service `backend` conserve le port interne `3000`, ce qui permet au gateway Nginx existant de continuer à rediriger `/api/*` vers Flask.
