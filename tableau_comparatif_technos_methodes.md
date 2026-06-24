# Tableau comparatif des technologies, méthodes et architecture

Projet analysé : **Ynov Test Unit - Calculatrice multi-backend**  
Objectif du projet : proposer une même API de calculatrice avec plusieurs backends interchangeables : **JavaScript**, **Python**, **Java** et **PHP**.

---

## 1. Vue d'ensemble du projet

| Élément | Description |
|---|---|
| Type de projet | Application web de calculatrice avec frontend, gateway et backend interchangeable |
| Frontend | Application statique construite avec **Vite** |
| Gateway | **Nginx**, exposé sur le port `80` |
| Backends disponibles | `backend-js`, `backend-python`, `backend-java`, `backend-php` |
| Contrat HTTP commun | `GET /calculate?operation=add&a=1&b=2` |
| Route de vérification | `GET /` |
| Opérations métier | `add`, `subtract`, `multiply`, `divide` |
| Cache | Redis pour JS/Python, cache mémoire Java, cache fichier PHP |
| Conteneurisation | Docker + Docker Compose |
| Tests backend | Tests unitaires + tests API selon le langage |
| Tests frontend / E2E | Playwright sur Chromium, Firefox et WebKit |
| CI | GitHub Actions avec matrice sur les 4 backends |

---

## 2. Comparatif des backends

| Critère | Backend JavaScript | Backend Python | Backend Java | Backend PHP |
|---|---|---|---|---|
| Dossier | `backend-js` | `backend-python` | `backend-java` | `backend-php` |
| Langage | JavaScript | Python | Java | PHP |
| Runtime | Node.js 22 | Python 3.12 | Java 21 | PHP 8.3 CLI |
| Serveur HTTP | Module natif `http` de Node.js | Flask en développement, Gunicorn en runtime Docker | `com.sun.net.httpserver.HttpServer` | Serveur intégré PHP `php -S` |
| Framework principal | Aucun framework web lourd | Flask | Aucun framework externe | Aucun framework externe |
| Point d'entrée runtime | `src/server.js` | `src.app:app` | `App` | `src/index.php` |
| Classe métier | `Calculator` | `Calculator` | `Calculator` | `Calculator` |
| Méthodes métier | `add`, `subtract`, `multiply`, `divide` | `add`, `subtract`, `multiply`, `divide` | `add`, `subtract`, `multiply`, `divide` | `add`, `subtract`, `multiply`, `divide` |
| Type numérique | `Number` | `float` | `double` | `float` |
| Gestion division par zéro | Exception `Error` | Exception `ValueError` | Exception `IllegalArgumentException` | Exception `InvalidArgumentException` |
| Cache | Redis avec TTL de 3600 s | Redis avec TTL de 3600 s | `ConcurrentHashMap` en mémoire | Fichiers JSON dans `/tmp/backend-php-cache` |
| Gestion CORS | Headers JSON + CORS codés dans le serveur | Headers JSON + CORS centralisés dans `json_response` | Headers JSON + CORS écrits manuellement | Headers JSON + CORS via `send_json` |
| Validation des paramètres | Manuelle dans le handler HTTP | Manuelle dans la route Flask | Manuelle dans le handler Java | Manuelle dans `index.php` |
| Format de réponse | JSON | JSON | JSON construit manuellement | JSON via `json_encode` |
| Image Docker | `node:22-alpine` | `python:3.12-alpine` | `eclipse-temurin:21-jdk-alpine` | `php:8.3-cli-alpine` |
| Port interne | `3000` | `3000` | `3000` | `3000` |
| Mémoire Compose | 128 Mo | 128 Mo | 256 Mo | 128 Mo |

---

## 3. Comparatif des technologies de test

| Critère | JavaScript | Python | Java | PHP |
|---|---|---|---|---|
| Tests unitaires | Jest | Pytest | Test runner Java personnalisé | Test runner PHP personnalisé |
| Tests API | Jest sur handlers/API HTTP | Pytest + client Flask / HTTP | Test runner Java personnalisé | Test runner PHP personnalisé |
| Tests HTTP réels | Présents avec helper HTTP | Présents avec tests HTTP | Présents via le runner Java | Présents via le runner PHP |
| Lint / qualité | ESLint | Ruff | Compilation `javac` | Typage strict PHP avec `declare(strict_types=1)` |
| Couverture | Jest coverage | Pytest-cov | Aucune couverture outillée dédiée | Aucune couverture outillée dédiée |
| Commande Docker test | `npm run lint && npm test` | `ruff check src tests && pytest` | `java -cp ... TestRunner` | `php tests/TestRunner.php` |
| Niveau d'industrialisation | Élevé grâce à Jest + ESLint | Élevé grâce à Pytest + Ruff + coverage | Correct, mais plus manuel | Correct, mais plus manuel |
| Lisibilité pédagogique | Bonne | Très bonne | Bonne pour comprendre sans framework | Bonne pour comprendre sans framework |

---

## 4. Comparatif des méthodes HTTP exposées

| Route | Méthode | Rôle | Réponse attendue |
|---|---:|---|---|
| `/` | `GET` | Vérifier que le backend répond | `{"message":"Hello from backend-*"}` |
| `/calculate` | `GET` | Exécuter une opération de calcul | `{"operation":"add","a":1,"b":2,"result":3,"cached":false}` |
| `/calculate` | `OPTIONS` | Autoriser les requêtes pré-vol CORS | Réponse `204` |
| Toute autre route | `GET` | Gérer une URL inconnue | Erreur `404` |
| Routes existantes | Autre que `GET` ou `OPTIONS` | Refuser les méthodes HTTP hors contrat | Erreur `405` + header `Allow: GET, OPTIONS` |

---

## 5. Comparatif des opérations métier

| Opération | Paramètre `operation` | Méthode appelée | Exemple | Résultat attendu |
|---|---|---|---|---:|
| Addition | `add` | `add(a, b)` | `1 + 2` | `3` |
| Soustraction | `subtract` | `subtract(a, b)` | `5 - 3` | `2` |
| Multiplication | `multiply` | `multiply(a, b)` | `4 * 3` | `12` |
| Division | `divide` | `divide(a, b)` | `10 / 2` | `5` |
| Division par zéro | `divide` | `divide(a, 0)` | `10 / 0` | Erreur métier |

---

## 6. Comparatif Docker et exécution locale

| Usage | Fichier Compose | Backend utilisé | Commande |
|---|---|---|---|
| Application avec JavaScript | `docker-compose.js.yml` | `backend-js` | `docker compose -f docker-compose.js.yml up --build` |
| Application avec Python | `docker-compose.python.yml` | `backend-python` | `docker compose -f docker-compose.python.yml up --build` |
| Application avec Java | `docker-compose.java.yml` | `backend-java` | `docker compose -f docker-compose.java.yml up --build` |
| Application avec PHP | `docker-compose.php.yml` | `backend-php` | `docker compose -f docker-compose.php.yml up --build` |
| Alias par défaut | `docker-compose.yml` | `backend-js` | `docker compose up --build` |
| Tests backend génériques | `docker-compose.test.yml` | Selon `BACKEND` | `BACKEND=python docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests` |

La topologie applicative reste identique pour chaque backend :

| Service | Rôle | Port / exposition |
|---|---|---|
| `gateway` | Point d'entrée Nginx | Port hôte `80` |
| `frontend` | Interface web de la calculatrice | Exposé en interne sur `80` |
| `backend` | API de calcul sélectionnée par Compose | Exposé en interne sur `3000` |
| `redis` | Cache commun prévu par l'architecture | Exposé en interne sur `6379` |

---

## 7. Comparatif CI/CD

| Job CI | Rôle | Technologies utilisées | Backends couverts |
|---|---|---|---|
| `backend` | Valider les tests backend dans Docker | Docker Compose + matrice GitHub Actions | JS, Python, Java, PHP |
| `frontend` | Vérifier que l'interface web compile | Node.js 22 + npm + Vite | Indépendant du backend |
| `e2e` | Vérifier le comportement complet via navigateur | Playwright + Docker Compose | JS, Python, Java, PHP |

| Mécanisme CI | Description |
|---|---|
| Matrice backend | La CI lance les tests backend avec `BACKEND=js`, `BACKEND=python`, `BACKEND=java`, `BACKEND=php` |
| Validation Compose | Chaque configuration Docker Compose est validée avec `docker compose config` |
| Tests backend isolés | Le service `backend-test-target` lance l'API, puis `backend-tests` exécute les tests |
| Tests E2E | Playwright teste l'application complète derrière le gateway Nginx |
| Navigateurs E2E | Chromium, Firefox et WebKit |
| Cache Playwright | Les navigateurs installés sont mis en cache via `actions/cache` |
| Artefact CI | Le rapport Playwright est uploadé avec `actions/upload-artifact` |

---

## 8. Comparatif des approches de développement

| Axe | JavaScript | Python | Java | PHP |
|---|---|---|---|---|
| Style général | Serveur HTTP minimaliste et asynchrone | Application structurée avec Flask | Serveur bas niveau, fortement typé | Script HTTP simple avec fonctions utilitaires |
| Complexité de lecture | Moyenne | Faible à moyenne | Moyenne à élevée | Faible à moyenne |
| Productivité | Rapide pour une API simple | Rapide et lisible | Plus verbeux | Rapide pour un projet simple |
| Robustesse typage | Dynamique | Dynamique avec annotations | Forte grâce au typage Java | Typage strict activé, mais langage plus permissif |
| Maintenabilité | Bonne si le projet reste modulaire | Très bonne grâce à Flask + tests | Bonne, au prix d'un code plus long | Correcte pour un petit service |
| Outillage test | Très bon | Très bon | Basique dans cette archive | Basique dans cette archive |
| Outillage qualité | ESLint | Ruff | Compilation Java | Typage strict PHP |
| Adaptation à un TP | Très adaptée | Très adaptée | Intéressante pour comparer le typage | Intéressante pour comparer l'approche script/API |

---

## 9. Forces et points d'attention

| Technologie | Forces | Points d'attention |
|---|---|---|
| JavaScript / Node.js | Écosystème riche, tests Jest complets, bonne cohérence avec le frontend, async naturel pour Redis | Typage dynamique, précision flottante IEEE 754 visible sur certains calculs comme `0.1 + 0.2` |
| Python / Flask | Code lisible, structure claire, Pytest + Ruff + coverage, Gunicorn adapté au runtime | Typage dynamique, précision flottante IEEE 754 également présente avec `float` |
| Java | Typage fort, compilation sécurisante, bonne gestion mémoire en runtime long, concurrence possible avec `ConcurrentHashMap` | Code plus verbeux, JSON construit manuellement, tests personnalisés moins industriels que JUnit |
| PHP | Mise en route simple, typage strict activé, script API facile à comprendre | Serveur intégré PHP adapté au contexte pédagogique, cache fichier différent du Redis prévu dans la topologie |

---

## 10. Synthèse recommandée

| Besoin | Choix conseillé | Justification |
|---|---|---|
| Backend pédagogique simple et complet | Python Flask | Très bon équilibre entre lisibilité, tests, qualité et structure |
| Backend proche de l'écosystème frontend | JavaScript Node.js | Même langage que le frontend, Jest et ESLint déjà en place |
| Backend pour montrer le typage fort | Java | Idéal pour comparer compilation, classes et types explicites |
| Backend pour montrer une API script simple | PHP | Approche directe, facile à lire pour un petit service |
| Meilleur backend pour un rendu propre de TP | Python ou JavaScript | Outillage de test et qualité plus complet dans cette archive |
| Meilleur support CI | Les quatre backends | La CI les couvre tous grâce à la matrice GitHub Actions |

---

## 11. Conclusion

Le projet présente une architecture cohérente pour comparer plusieurs technologies autour d'un même contrat fonctionnel. Les quatre backends exposent les mêmes routes, les mêmes opérations métier et le même format de réponse. La différence principale se situe dans la manière d'implémenter le serveur HTTP, le cache, les tests et la qualité de code.

Pour un rendu de TP, l'intérêt principal est la comparaison suivante :

| Dimension | Ce que le projet démontre |
|---|---|
| Architecture | Séparation frontend / gateway / backend / cache |
| Interchangeabilité | Un même frontend fonctionne avec quatre backends différents |
| Tests | Tests unitaires, tests API, tests HTTP et tests E2E |
| CI | Validation automatique de toutes les variantes backend |
| Docker | Environnement reproductible avec Compose |
| Méthode | Même contrat, mêmes scénarios, technologies différentes |

La solution la plus équilibrée pour expliquer le projet est de présenter **Python Flask** et **JavaScript Node.js** comme les versions les plus industrialisées, puis **Java** et **PHP** comme variantes utiles pour comparer le typage, la verbosité et les approches serveur plus manuelles.
