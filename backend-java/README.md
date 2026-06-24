# Backend Java - API Calculatrice

Ce dossier contient l'implémentation Java du backend calculatrice.

Il expose le même contrat HTTP que les autres backends :

```http
GET /calculate?operation=add&a=1&b=2
```

Routes disponibles :

- `GET /` : vérifie que le backend Java répond ;
- `GET /calculate` : exécute une opération arithmétique.

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

## Commandes locales

```bash
cd backend-java
javac -d build/classes src/*.java
java -cp build/classes App
```

Tests locaux :

```bash
cd backend-java
javac -d build/classes src/*.java
javac -cp build/classes -d build/test-classes tests/*.java
java -cp build/classes:build/test-classes TestRunner
```

## Docker applicatif

Depuis la racine du projet :

```bash
docker compose -f docker-compose.java.yml up --build
```

Dans ce Compose, le service Docker s'appelle `backend`. Le gateway peut donc continuer à rediriger `/api/*` vers `backend:3000`.

## Docker de test

Depuis la racine du projet :

```bash
BACKEND=java docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Ce Compose lance :

- `redis-test`, le Redis réservé aux tests et conservé pour garder la même topologie que les autres backends ;
- `backend-test-target`, le vrai backend Java lancé comme en applicatif ;
- `backend-tests`, le conteneur qui compile et exécute les tests Java.

Les tests HTTP d'intégration sont activés quand `TEST_BASE_URL` est défini par Docker Compose.
