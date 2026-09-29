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
