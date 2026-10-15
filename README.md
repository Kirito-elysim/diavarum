# Diaverum — Programme d'entraînement des patients

Application tablette de formation des patients hémodialysés (cf. [cahier des charges](doc/diaverum_cahier-des-charges-fonctionnel_v1.docx.pdf)).

| Dossier   | Contenu |
|-----------|---------|
| `front/`  | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| `api/`    | Symfony 7.4 LTS + API Platform 5 + Doctrine (PHP 8.4) |
| `docker/` | Dockerfile multi-cibles, configuration PHP et Nginx |
| `doc/`    | Cahier des charges, charte graphique, storyboard, ancien schéma Supabase |

## Démarrage

Prérequis : Docker Desktop. Aucun PHP, Composer ni Node n'est nécessaire sur la machine.

```bash
cp .env.example .env   # adapter les ports si 8080 / 5432 / 8025 sont déjà pris
make up                # ou : docker compose up -d --build
```

| URL | Service |
|-----|---------|
| `http://localhost:8080` | Application React (rechargement à chaud) |
| `http://localhost:8080/api/docs` | Documentation de l'API (Swagger) |
| `http://localhost:8080/api/health` | Santé de l'API et de la base |
| `http://localhost:8025` | Mailpit : emails envoyés en dev |
| `localhost:5432` | PostgreSQL (utilisateur / mot de passe : `app` / `app`) |

`make` seul liste toutes les commandes (console Symfony, migrations, sauvegarde de la base…).

### Données de démonstration

```bash
make fixtures
```

| Compte | Profil | Centres |
|--------|--------|---------|
| `admin@diaverum.test` | Administrateur national | tous |
| `cadre@diaverum.test` | Cadre de service | Paris Nord |
| `ide@diaverum.test` | IDE | Paris Nord |
| `ide.lyon@diaverum.test` | IDE | Lyon Sud |
| `ide.multi@diaverum.test` | IDE | Paris Nord + Lyon Sud |

Mot de passe de tous les comptes : `Diaverum2026!` — code de sécurité IDE : `1234` — code national : `9999`.

Le **catalogue des séances** ([liste officielle](doc/Liste-seances.pdf)) est créé par les migrations, dans
tous les environnements : séance de démarrage `S0`, séances systématiques `S1` à `S24`, post-test `PT`
(cochés par défaut dans un parcours) et séances optionnelles `O1` à `O7`, soit 33 séances en 10 thématiques. Le code de séance est
l'identifiant stable utilisé pour intégrer les contenus. En démo, seules S4, S14 et S17 ont un contenu
(repris de la maquette Bolt).

### Tests

```bash
make test        # API : tests fonctionnels (base diaverum_test créée et migrée automatiquement)
make e2e         # interface : 30 étapes dans un vrai navigateur (Playwright), données de démo rechargées
```

## Authentification et droits

- `POST /api/auth/login` `{email, password}` → `{token}` (JWT valable 15 min) + cookie `refresh_token`
  httpOnly (12 h, à usage unique) limité aux routes `/api/auth`.
- `POST /api/auth/refresh` → nouveau JWT ; `POST /api/auth/logout` → révoque le refresh token.
- Appels API : en-tête `Authorization: Bearer <token>`.
- 5 échecs de connexion sur un compte → blocage 15 minutes ; plafond de 100 tentatives par IP et par
  15 minutes (les tablettes d'un centre partagent souvent la même IP). Comptes archivés refusés, même avec
  un jeton encore valide.

| Profil | Peut |
|--------|------|
| IDE | Patients, parcours, séances, tests CODEX **des centres où elle est affiliée** ; son code de sécurité |
| Cadre | Tout ce que fait l'IDE + créer / archiver des IDE et les affilier **à ses propres centres** |
| Admin national | Tout, sur tous les centres : centres, cadres, administrateurs, catalogue des cours, code national |

Tout ce qui est hors périmètre est **introuvable** (404, ou 400 pour une référence dans un corps de requête).
Aucune suppression physique : patients, comptes et centres sont archivés (traçabilité).

| Route | Rôle |
|-------|------|
| `GET /api/me` | Profil connecté (rôle, centres, code configuré ou non) |
| `PUT /api/me/security-code` `{password, code}` | Définir / changer son code (4 à 6 chiffres) |
| `POST /api/security-code/verify` `{code}` | Vérifier un code en sortie de séance (5 essais / 15 min) |
| `PUT /api/national-security-code` `{password, code}` | Admin national : change le code garde-fou, envoyé par email aux admins |

### Bilans et statistiques (Excel / PDF)

| Route | Profil | Contenu |
|-------|--------|---------|
| `GET /api/exports/patients.xlsx[?patients[]=…]` | IDE | Bilan des patients de ses centres (synthèse + détail par séance) |
| `GET /api/exports/patients/{id}.pdf` | IDE | Bilan d'un patient |
| `GET /api/statistics[?centers[]=…]` | Cadre | Synthèse (JSON) de ses centres ; national par défaut pour un administrateur |
| `GET /api/exports/statistics.xlsx` / `.pdf` | Cadre | Même synthèse : patients, programmes, séances, activité des IDE |

### Contenus de cours

Les contenus intégrés sont versionnés dans `api/content/` (un JSON par séance, format de l'API d'intégration) et
leurs illustrations dans `front/public/courses/<code>/`. `make content` les importe (fait aussi par `make fixtures`) ;
en production : `docker compose exec php bin/console app:content:import content/*.json`.

| Séance | Source | État |
|--------|--------|------|
| S1 — Droits et devoirs du patient, personne de confiance, directives anticipées | `doc/storybord_cours_1.pptx` | Intégrée — illustrations provisoires |

### Intégration des contenus (prestataire)

`GET` / `PUT /api/content/modules/{code}` (ex. `S4`, `O2`, `PT`) avec l'en-tête `X-Content-Token: <CONTENT_API_TOKEN>`.
Ce jeton ne donne accès qu'aux contenus, jamais aux données patients. Corps : `title`, `description`,
`estimatedDuration`, `published`, `competencies` (5 libellés au plus), `content` (pages > blocs, format du lecteur).
Le serveur refuse tout contenu mal formé (identifiants en double, type de bloc inconnu, exercice sans bonne réponse).
L'écran « Contenus des séances » (administrateurs nationaux) permet d'exporter, corriger et réimporter ce JSON.

### Traçabilité (RGPD)

Chaque appel à l'API est journalisé (utilisateur, action, ressource, résultat, IP), connexions et échecs compris.
Consultation : onglet « Journal des accès » (administrateurs nationaux) ou `GET /api/access_logs`.
Purge selon la durée de conservation retenue avec le DPO : `bin/console app:access-log:purge --days=365` (à planifier).

Premier administrateur d'un environnement (pas d'inscription publique) :

```bash
make console c="app:user:create prenom.nom@diaverum.fr Prénom Nom --role=admin_national"
```

## Architecture

```
navigateur ──► nginx ─┬─ /api/*  ──► php (Symfony, php-fpm) ──┐
                      └─ /*      ──► front (Vite en dev,       ├──► db (PostgreSQL 16, volume pgdata)
                                     fichiers statiques en prod)│
                         worker (messenger:consume) ────────────┘   exports, emails…
```

- Front et API partagent le même domaine : pas de CORS, les appels se font sur `/api/...`.
- Les données PostgreSQL sont dans le volume Docker `pgdata` : elles survivent à `make down`.
  **Un volume n'est pas une sauvegarde** → `make db-dump`.
- Le worker traite la file `async` (table `messenger_messages`) : emails, exports lourds.

## Production

```bash
# Variables obligatoires : APP_SECRET, JWT_PASSPHRASE, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, MAILER_DSN, MAILER_FROM
make prod-up           # docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Les images de production embarquent le code : pas de volume de sources, front compilé servi par Nginx,
migrations appliquées automatiquement au démarrage du conteneur `php`, clés JWT générées au premier
démarrage dans le volume `jwt_keys` (jamais embarquées dans l'image). Documentation de l'API désactivée.
L'hébergement doit être **certifié HDS** (données de santé).

Liste blanche d'adresses IP (cahier des charges §5) : `ALLOWED_IPS` (ex. IP de sortie des centres) ; si un
répartiteur de charge précède Nginx, le déclarer dans `TRUSTED_PROXIES` pour que l'IP réelle soit filtrée et journalisée.

## Charte graphique

Couleurs Diaverum (orange `#E86825`, vert `#004138`…) appliquées via Tailwind (`front/tailwind.config.js`).
La police de marque **Euclid Circular A** est sous licence : déposer ses fichiers dans `front/public/fonts/`
(voir `LISEZMOI.md`), sinon repli sur Segoe UI.

### Protocole CODEX

Le test utilise « Clé, ballon, citron » (ou « Cigare, fleur, porte » pour un second test exceptionnel), un cadran vierge à dessiner à 5h10 et quatre critères évalués par l’IDE. Le dessin reste disponible pendant la validation ; seuls les critères et les réponses sont enregistrés dans le dossier.

Si l’horloge ou le rappel des trois mots échoue, les cinq questions d’orientation sont obligatoires. Un score de 4–5 donne un CODEX normal, 0–3 un CODEX anormal. Si les deux épreuves initiales réussissent, le CODEX est normal sans orientation. Un résultat normal ne valide pas automatiquement l’éligibilité générale. Un résultat anormal classe le patient non éligible et affiche un rappel de transmission au néphrologue par l’IDE (aucun envoi automatique). La requalification manuelle est bloquée tant que le dernier CODEX est anormal. Les anciens tests gardent leur interprétation initiale.

La migration `Version20261012120000` ajoute deux champs JSON nullable sans réinterpréter les résultats existants. Appliquer les migrations et vider le cache Symfony lors du déploiement.

Vérification ciblée : `docker compose exec php vendor/bin/phpunit tests/Api/CodexTest.php`. Parcours navigateur sans enregistrement de résultat : `E2E_BASE_URL=http://localhost:8091 node e2e/codex-protocol.mjs` (compte IDE de démonstration requis).

### Utilisation sur tablette

La navigation devient un menu escamotable sous 1280 px pour conserver la largeur utile en portrait et en paysage. Les cibles tactiles sont agrandies, les onglets reviennent à la ligne et les fenêtres longues défilent. Le test CODEX accepte le dessin au doigt ou au stylet ; le dessin est conservé lors d’un changement d’orientation. Les exercices de mots cachés suivent la position du doigt, y compris lorsque le navigateur capture le pointeur.

Contrôle en navigateur tactile émulé (768×1024, 1024×768 et 800×600) : `node e2e/tablet-layout.mjs`. Ce scénario utilise le compte administrateur de démonstration, vérifie les neuf pages principales et les gestes CODEX/mots cachés sans enregistrer de résultat patient. Une recette sur les modèles physiques et navigateurs du parc reste nécessaire.

### Recette du parcours IDE / apprenant (12 octobre 2026)

Le lecteur de séance utilise un verrou de navigation : un retour navigateur demande le code IDE et une tentative de chargement direct du back-office dans le même onglet renvoie vers le lecteur verrouillé. La prévisualisation reste distincte. Les réponses QCU/QCM validées restent affichées lors du retour à une page ; les questions non notées sont explicitement signalées. Le parcours sans cours optionnel nécessite une confirmation avant lancement. Le post-test est refusé par l’API tant que les autres cours sélectionnés ne sont pas validés, et sa durée n’est pas comptabilisée.

`node e2e/learner-workflow.mjs` vérifie le choix du cours, la confirmation sans option, les légendes cliquables, le carrousel, les cartes retournables, les QCU/QCM, le scoring sans pénalité, le retour navigateur, le code incorrect/correct et la validation des compétences. Les séances et leurs résultats sont simulés ; la connexion et le contrôle du code utilisent le compte IDE de démonstration. Aucun résultat n’est écrit dans un dossier réel.

État du contenu local lors de la recette : S1 comporte 16 pages et 12 références médias locales présentes. S4, S14 et S17 contiennent des exemples issus de la maquette ; les 29 autres entrées du catalogue (dont S0 et PT) sont vides. Le lecteur fonctionnel ne signifie donc pas que les 31 cours sont livrés. Les contenus validés restent à intégrer.

La cible indiquée dans le cahier des charges est la Tab A11+ 11 pouces, en ligne. Les essais automatisés utilisent un navigateur tactile émulé ; la recette physique sur ce modèle reste à réaliser. Le verrou applicatif protège la navigation dans l’onglet ; il ne remplace pas un mode kiosque Android pour bloquer les boutons système ou l’ouverture d’un autre navigateur.

Le profil patient dispose d’un onglet de saisie libre : notes médicales/administratives et questions/réponses ajoutées par l’IDE. Son résumé apparaît dans le parcours et lors du lancement d’une nouvelle séance. Les questions métier fixes restent à fournir et à valider ; cette saisie ne constitue pas un questionnaire médical validé et ne détermine pas automatiquement l’éligibilité. Les données sont stockées dans la clé `profile` des champs JSON existants (`notes`, `answers`), en préservant leurs autres clés. Aucune migration supplémentaire.

`node e2e/patient-profile.mjs` contrôle la saisie tactile, la reprise après erreur d’enregistrement, la conservation des données existantes, le résumé du parcours, le rechargement et l’annulation. Les écritures patient sont interceptées ; aucun dossier réel n’est modifié.


### Éditeur pédagogique (13 octobre 2026)

Dans **Contenus des séances → Modifier**, les administrateurs nationaux rédigent les écrans et leurs consignes, ajoutent textes, images, encadrés, carrousels, cartes recto/verso, images à légendes et QCU/QCM. Les écrans peuvent être dupliqués, déplacés et retirés ; les éléments d’une activité sont ordonnables. Les repères de légende se placent directement sur l’image au doigt ou à la souris. Les compétences IDE, la description, la durée et la publication se règlent dans les informations du cours.

L’aperçu utilise les composants du lecteur sur le brouillon, sans écrire de séance. Une question peut être non notée avec correction : `graded` et `showCorrection` sont indépendants ; l’absence de `showCorrection` conserve le comportement des anciens contenus. Les consignes sont enregistrées dans `ModulePage.instruction`.

Les modifications incomplètes restent dans un brouillon local, lié au compte et au cours. La récupération est proposée au retour. Le bouton Enregistrer contrôle le contenu puis demande de confirmer le remplacement de la version serveur. Ce brouillon ne se synchronise pas entre appareils ; la version serveur est remplacée à l’enregistrement (pas d’historique de versions serveur). Les activités complémentaires historiques sont conservées, déplaçables et prévisualisables ; leurs formulaires spécifiques ne sont pas encore disponibles. L’import automatique de la matrice Excel n’est pas inclus.

Images : `POST /api/content/media`, administrateur national uniquement, PNG/JPEG/WebP jusqu’à 5 Mo et 20 millions de pixels. Les fichiers reçoivent un nom aléatoire et sont servis comme images avec `nosniff`. Les illustrations de cours sont accessibles par leur URL, sans données patient. Le stockage est `api/var/course-media` en développement et le volume Docker `course_media` en production ; sauvegarder ce volume avec la base de données. Les tests utilisent un dossier distinct dans le cache de test. Un média importé mais non utilisé reste stocké ; aucune suppression automatique n’est effectuée.

Les cours non publiés sont masqués des lectures du catalogue et du contenu pour les IDE/cadres ; le démarrage d’une séance non publiée est également refusé côté serveur. Aucun cours existant n’est dépublié par cette mise à jour. Aucune migration SQL supplémentaire n’est requise pour l’éditeur ; reconstruire les images de production et vider le cache lors du déploiement.

Recette : `node e2e/course-editor.mjs` (écritures de cours et médias simulées), `node e2e/learner-workflow.mjs`, et `docker compose exec -T php vendor/bin/phpunit`. L’éditeur est contrôlé en navigateur tactile portrait/paysage ; la recette sur tablette physique reste nécessaire.


L’éditeur propose également **Glisser-déposer** (associations destination/élément) et **Remettre dans l’ordre**. Les associations et les étapes sont ajoutables, retirables et déplaçables ; pour la remise en ordre, la liste de rédaction définit l’ordre attendu. Ces deux activités utilisent la notation et la correction existantes du lecteur. Chaque activité nécessite au moins deux entrées complètes ; les textes des éléments à déplacer doivent être distincts. Les explications de correction sont éditables et affichées après validation. Vérification du format : `node --experimental-strip-types e2e/course-editor-model.mjs`.
