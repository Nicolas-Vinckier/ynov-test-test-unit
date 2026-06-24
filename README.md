# Ynov Test Unit - Calculatrice multi-backend

Le projet contient maintenant deux implémentations du même backend :

- `backend-js` : backend historique en Node.js ;
- `backend-python` : backend équivalent en Python Flask.

Les deux backends exposent le même contrat HTTP :

```http
GET /calculate?operation=add&a=1&b=2
```

Le frontend et le gateway restent identiques. Le gateway Nginx redirige toujours `/api/*` vers un service Docker nommé `backend`. Chaque Compose applicatif choisit simplement quelle implémentation porte ce nom interne.

## 1. Lancer l'application avec le backend JavaScript

```bash
docker compose -f docker-compose.js.yml up --build
```

Fichier utilisé : `docker-compose.js.yml`.

Services démarrés :

- `gateway` : point d'entrée HTTP sur le port `80` ;
- `frontend` : interface de la calculatrice ;
- `backend` : API Node.js construite depuis `backend-js` ;
- `redis` : cache Redis partagé par l'application.

Par compatibilité, `docker-compose.yml` contient la même configuration que `docker-compose.js.yml`. La commande suivante lance donc aussi la version JavaScript :

```bash
docker compose up --build
```

## 2. Lancer l'application avec le backend Python

```bash
docker compose -f docker-compose.python.yml up --build
```

Fichier utilisé : `docker-compose.python.yml`.

Services démarrés :

- `gateway` : point d'entrée HTTP sur le port `80` ;
- `frontend` : interface de la calculatrice ;
- `backend` : API Flask construite depuis `backend-python` ;
- `redis` : cache Redis partagé par l'application.

Le frontend n'a pas besoin de changer, car il appelle `/api/calculate`. C'est le Compose qui choisit quel backend reçoit cette requête.

## 3. Lancer les tests Docker pour le backend JavaScript

```bash
BACKEND=js docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Le Compose de test construit `./backend-js`, lance un vrai backend de test, puis exécute les tests Jest dans un conteneur séparé.

Sous PowerShell :

```powershell
$env:BACKEND="js"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

## 4. Lancer les tests Docker pour le backend Python

```bash
BACKEND=python docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Le Compose de test construit `./backend-python`, lance un vrai backend Flask de test, puis exécute `ruff` et `pytest` dans un conteneur séparé.

Sous PowerShell :

```powershell
$env:BACKEND="python"
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
```

Si `BACKEND` est absent, la valeur par défaut est `python`.

## 5. Nettoyer l'environnement de test

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

Avec sélection explicite :

```bash
BACKEND=js docker compose -f docker-compose.test.yml down -v --remove-orphans
BACKEND=python docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## 6. Rôle des fichiers Compose

```text
docker-compose.js.yml      -> application avec backend JavaScript
docker-compose.python.yml  -> application avec backend Python
docker-compose.test.yml    -> tests Docker pour JS ou Python selon BACKEND
docker-compose.yml         -> alias compatible de docker-compose.js.yml
```

Le point important pour le cours est la séparation suivante :

```text
backend-test-target -> le vrai backend lancé comme une API
backend-tests       -> le conteneur qui exécute les tests
```

Le même `docker-compose.test.yml` fonctionne avec les deux backends grâce à la variable `BACKEND`.

## 7. CI

La CI GitHub Actions lance les deux variantes de backend :

- job `backend-js` avec `BACKEND=js` ;
- job `backend-python` avec `BACKEND=python`.

Chaque job utilise le même fichier `docker-compose.test.yml`. Si les tests du backend sélectionné échouent, le job CI devient rouge.
