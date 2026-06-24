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

## Docker applicatif

Depuis la racine du projet :

```bash
docker compose up --build
```

Le service `backend` conserve le port interne `3000`, ce qui permet au gateway Nginx de rediriger `/api/*` vers Flask.

## Docker de test

Depuis la racine du projet :

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Ce compose lance :

- `redis-test`, le Redis réservé aux tests ;
- `backend-test-target`, le vrai backend Flask lancé avec Gunicorn ;
- `backend-tests`, le conteneur qui exécute `ruff check src tests && pytest`.

Les tests HTTP d'intégration sont activés quand la variable `TEST_BASE_URL` est définie. En local hors Docker, ces tests sont ignorés et les tests unitaires Flask continuent de fonctionner.
