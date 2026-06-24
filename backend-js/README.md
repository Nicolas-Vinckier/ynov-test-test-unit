# Backend JavaScript Node.js - API Calculatrice

Ce dossier contient l'implémentation JavaScript historique du backend calculatrice.

Il expose le même contrat HTTP que le backend Python :

```http
GET /calculate?operation=add&a=1&b=2
```

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

## Commandes locales

```bash
cd backend-js
npm ci
npm run lint
npm test
npm start
```

L'API écoute par défaut sur le port `3000`.

## Docker applicatif

Depuis la racine du projet :

```bash
docker compose -f docker-compose.js.yml up --build
```

Dans ce Compose, le service Docker s'appelle `backend`. Le gateway peut donc continuer à rediriger `/api/*` vers `backend:3000`.

## Docker de test

Depuis la racine du projet :

```bash
BACKEND=js docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Ce Compose lance :

- `redis-test`, le Redis réservé aux tests ;
- `backend-test-target`, le vrai backend Node.js lancé comme en applicatif ;
- `backend-tests`, le conteneur qui exécute `npm run lint && npm test`.

Le test `tests/api_http.test.js` vérifie le vrai backend Docker quand `TEST_BASE_URL` est défini par Docker Compose.
