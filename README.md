# Ynov Test Unit - Calculatrice multi-backend

Le projet contient quatre implémentations du même backend :

- `backend-js` : backend historique en Node.js ;
- `backend-python` : backend équivalent en Python Flask ;
- `backend-java` : backend équivalent en Java ;
- `backend-php` : backend équivalent en PHP.

Les quatre backends exposent le même contrat HTTP :

```http
GET /calculate?operation=add&a=1&b=2
```

Ils exposent aussi une route de vérification :

```http
GET /
```

Réponses attendues :

```text
backend-js     -> {"message":"Hello from backend-js"}
backend-python -> {"message":"Hello from backend-python"}
backend-java   -> {"message":"Hello from backend-java"}
backend-php    -> {"message":"Hello from backend-php"}
```

Le frontend et le gateway restent identiques. Le gateway Nginx redirige toujours `/api/*` vers un service Docker nommé `backend`. Chaque Compose applicatif choisit simplement quelle implémentation porte ce nom interne.

## 1. Lancer l'application avec le backend JavaScript

```bash
docker compose -f docker-compose.js.yml up --build
```

Par compatibilité, `docker-compose.yml` contient la même configuration que `docker-compose.js.yml`. La commande suivante lance donc aussi la version JavaScript :

```bash
docker compose up --build
```

## 2. Lancer l'application avec le backend Python

```bash
docker compose -f docker-compose.python.yml up --build
```

## 3. Lancer l'application avec le backend Java

```bash
docker compose -f docker-compose.java.yml up --build
```

## 4. Lancer l'application avec le backend PHP

```bash
docker compose -f docker-compose.php.yml up --build
```

## 5. Services applicatifs

Chaque Compose applicatif lance la même topologie :

- `gateway` : point d'entrée HTTP sur le port `80` ;
- `frontend` : interface de la calculatrice ;
- `backend` : API construite depuis le dossier du langage choisi ;
- `redis` : service de cache conservé pour garder une topologie identique.

Le frontend n'a pas besoin de changer, car il appelle `/api/calculate`. C'est le Compose qui choisit quel backend reçoit cette requête.

## 6. Lancer les tests Docker par backend

Le fichier `docker-compose.test.yml` fonctionne avec une variable `BACKEND`.

```bash
BACKEND=js docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
BACKEND=python docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
BACKEND=java docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
BACKEND=php docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Sous PowerShell :

```powershell
$env:BACKEND="js"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests

$env:BACKEND="python"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests

$env:BACKEND="java"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests

$env:BACKEND="php"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Si `BACKEND` est absent, la valeur par défaut est `python`.

## 7. Nettoyer l'environnement de test

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

Avec sélection explicite :

```bash
BACKEND=js docker compose -f docker-compose.test.yml down -v --remove-orphans
BACKEND=python docker compose -f docker-compose.test.yml down -v --remove-orphans
BACKEND=java docker compose -f docker-compose.test.yml down -v --remove-orphans
BACKEND=php docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## 8. Rôle des fichiers Compose

```text
docker-compose.js.yml      -> application avec backend JavaScript
docker-compose.python.yml  -> application avec backend Python
docker-compose.java.yml    -> application avec backend Java
docker-compose.php.yml     -> application avec backend PHP
docker-compose.test.yml    -> tests Docker selon BACKEND
docker-compose.yml         -> alias compatible de docker-compose.js.yml
```

Le point important pour le cours est la séparation suivante :

```text
backend-test-target -> le vrai backend lancé comme une API
backend-tests       -> le conteneur qui exécute les tests
```

Le même `docker-compose.test.yml` fonctionne avec les quatre backends grâce à la variable `BACKEND`.

## 9. CI

La CI GitHub Actions valide maintenant les quatre implémentations.

Le job `backend` utilise une matrice :

```text
BACKEND=js
BACKEND=python
BACKEND=java
BACKEND=php
```

Chaque variante utilise le même fichier `docker-compose.test.yml`. Le conteneur `backend-test-target` lance le backend réel, puis le conteneur `backend-tests` exécute la suite de tests adaptée au langage sélectionné.

La CI exécute aussi :

- le build du frontend ;
- les tests Playwright contre l'application Docker complète en version JavaScript ;
- les tests Playwright contre l'application Docker complète en version Python ;
- les tests Playwright contre l'application Docker complète en version Java ;
- les tests Playwright contre l'application Docker complète en version PHP.

Les quatre Compose applicatifs sont donc contrôlés :

```text
docker-compose.js.yml
docker-compose.python.yml
docker-compose.java.yml
docker-compose.php.yml
```

Le job Playwright utilise un cache pour les navigateurs installés dans `~/.cache/ms-playwright`. Le cache est indexé sur la version de `@playwright/test`.

Un échec dans une variante backend, un build frontend, ou un test E2E rend la CI rouge.
