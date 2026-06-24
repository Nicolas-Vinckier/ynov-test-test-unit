# Backend PHP - API Calculatrice

Ce dossier contient l'implémentation PHP du backend calculatrice.

Il expose le même contrat HTTP que les autres backends :

```http
GET /calculate?operation=add&a=1&b=2
```

Routes disponibles :

- `GET /` : vérifie que le backend PHP répond ;
- `GET /calculate` : exécute une opération arithmétique.

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

## Commandes locales

```bash
cd backend-php
php -S 0.0.0.0:3000 src/index.php
```

Tests locaux :

```bash
cd backend-php
php tests/TestRunner.php
```

## Docker applicatif

Depuis la racine du projet :

```bash
docker compose -f docker-compose.php.yml up --build
```

Dans ce Compose, le service Docker s'appelle `backend`. Le gateway peut donc continuer à rediriger `/api/*` vers `backend:3000`.

## Docker de test

Depuis la racine du projet :

```bash
BACKEND=php docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Ce Compose lance :

- `redis-test`, le Redis réservé aux tests et conservé pour garder la même topologie que les autres backends ;
- `backend-test-target`, le vrai backend PHP lancé comme en applicatif ;
- `backend-tests`, le conteneur qui exécute les tests PHP.

Les tests HTTP d'intégration sont activés quand `TEST_BASE_URL` est défini par Docker Compose.
