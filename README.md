# Ynov Test Unit - Calculatrice

Ce projet sépare l'exécution applicative et l'exécution des tests avec deux fichiers Docker Compose.

## 1. Lancer l'application

```bash
docker compose up --build
```

Cette commande utilise `docker-compose.yml` et démarre l'environnement applicatif :

- `gateway` : point d'entrée HTTP sur le port 80 ;
- `frontend` : interface de la calculatrice ;
- `backend` : API Flask exposée en interne sur le port 3000 ;
- `redis` : cache utilisé par le backend.

L'objectif est de vérifier que l'application fonctionne comme un vrai service.

## 2. Lancer les tests backend dans Docker

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Cette commande utilise `docker-compose.test.yml` et démarre un environnement de validation :

- `redis-test` : Redis dédié aux tests ;
- `backend-test-target` : backend Flask lancé comme en production avec Gunicorn ;
- `backend-tests` : conteneur dédié qui exécute `ruff check src tests && pytest`.

Le conteneur `backend-tests` est celui qui fait réussir ou échouer la commande. Il exécute :

- les tests unitaires Python sur `Calculator` ;
- les tests API Flask avec le client de test Flask ;
- les tests HTTP d'intégration contre le vrai conteneur `backend-test-target`.

## 3. Nettoyer l'environnement de test

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## 4. Intérêt pour la CI

La CI GitHub Actions lance le deuxième Compose pour vérifier que les tests passent dans un environnement Docker reproductible. Le code de sortie du service `backend-tests` devient le résultat du job CI :

- tests réussis : job vert ;
- test échoué : job rouge.

Cela montre la séparation entre :

```text
docker-compose.yml       -> lancer l'application
docker-compose.test.yml  -> valider l'application
```
