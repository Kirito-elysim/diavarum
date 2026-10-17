# Déploiement sur Coolify

L'application se déploie comme une ressource **Docker Compose** à partir du dépôt Git, avec le
fichier `docker-compose.prod.yml`. Un seul domaine suffit : le front React et l'API (sous `/api`)
sont servis par le même service `nginx`.

## Services

| Service   | Rôle                                                        | Domaine Coolify          |
|-----------|-------------------------------------------------------------|--------------------------|
| `nginx`   | Front compilé + relais `/api` vers PHP-FPM                  | **Oui**, port `80`       |
| `php`     | API Symfony ; migrations et clés JWT au démarrage           | Non                      |
| `worker`  | File d'attente Messenger (emails), même image que `php`     | Non                      |
| `db`      | PostgreSQL 16, volume `pgdata`                              | Non                      |
| `mailer`  | Mailpit : capture les emails tant qu'aucun SMTP n'est défini | Optionnel, port `8025`   |
| `adminer` | Administration de la base                                   | Optionnel, port `8080`   |

Aucun port n'est publié sur le serveur : seuls les services auxquels on donne un domaine sont
joignables, via Traefik et le réseau `coolify`.

## Étapes

1. **Coolify → Projects → + New Project** (« Diaverum »), puis **+ New Resource → Docker Compose**
   depuis le dépôt Git (`git@github.com:Kirito-elysim/diavarum.git`, branche `main`).
2. **Docker Compose Location** : `/docker-compose.prod.yml`.
3. **Environment Variables** : reprendre `.env.prod.example`. Obligatoires : `APP_SECRET`,
   `JWT_PASSPHRASE`, `POSTGRES_PASSWORD`, `MAILPIT_UI_AUTH`. Générer chaque secret avec
   `openssl rand -hex 32`.
4. **Domaines** : sur le service `nginx`, `https://diaverum.votredomaine.fr`, port 80, HTTPS
   activé. Facultatif : un domaine pour `mailer` (8025) et, ponctuellement, pour `adminer` (8080).
5. **Deploy**. Le premier build prend quelques minutes (extensions PHP, Composer, build du front).
   L'ordre de démarrage est garanti : `db` sain → `php` (migrations, clés JWT) sain → `nginx` et `worker`.
6. Vérifier `https://diaverum.votredomaine.fr/api/health` → `{"status":"ok","database":"ok"}`.

## Après le premier déploiement

Dans Coolify, ouvrir le **Terminal** du service `php` :

```sh
# Premier compte administrateur national (le mot de passe, 12 caractères minimum, est demandé)
php bin/console app:user:create prenom.nom@diaverum.fr Prénom Nom --role=admin_national

# Contenus des séances versionnés dans le dépôt (api/content/, ex. S1)
php bin/console app:content:import content/*.json
```

L'administrateur crée ensuite les centres et les comptes depuis l'application (à l'unité ou
par import Excel).

> Les données de démonstration (`make fixtures`) ne doivent **jamais** être chargées en production.

## Tâches planifiées (Coolify → Scheduled Tasks, service `php`)

| Fréquence        | Commande                                              | Rôle                                      |
|------------------|-------------------------------------------------------|-------------------------------------------|
| `0 3 * * *`      | `php bin/console app:access-log:purge --days=365`     | Purge du journal et des fichiers d'import (durée à fixer avec le DPO) |

## Sauvegardes

Activer les sauvegardes PostgreSQL de Coolify sur le service `db` (base `diaverum`). Volumes à
conserver : `pgdata` (base), `jwt_keys` (clés de signature : les perdre déconnecte tout le monde),
`course_media` (médias des cours), `import_files` (fichiers d'import, données personnelles).

## Sécurité

- **Liste blanche IP** : `ALLOWED_IPS` restreint l'accès aux IP de sortie des centres ; vide, le
  site est accessible à tous. La sonde `/health` reste toujours joignable pour Coolify.
- **IP réelle** : Traefik l'ajoute dans `X-Forwarded-For` ; Nginx ne fait confiance qu'au réseau
  Docker (`TRUSTED_PROXIES`). Elle sert au journal des accès et à la limitation des connexions.
- **HTTPS** : Nginx transmet à Symfony que la requête d'origine est en HTTPS ; le cookie de
  session est toujours `Secure`, `HttpOnly`, `SameSite=Strict`.
- **adminer** : ne lui attribuer un domaine que le temps d'une intervention.
- **Mailpit** : interface protégée par `MAILPIT_UI_AUTH` ; définir `MAILER_DSN` vers un vrai
  fournisseur avant l'ouverture aux centres.

## Mise à jour

Chaque push sur `main` peut redéployer automatiquement (Coolify → Webhooks / Auto Deploy), sinon
**Redeploy**. Les migrations s'appliquent au démarrage du service `php`.

## Dépannage

- **`no available server`** : Traefik ne trouve pas de conteneur sain pour le domaine. Vérifier que
  le domaine est sur `nginx`, port 80, et que `nginx` et `php` sont `healthy`.
- **`php` unhealthy** : lire ses logs (migration en échec, `POSTGRES_PASSWORD` différent de celui
  avec lequel le volume `pgdata` a été initialisé…).
- **Tout le monde est déconnecté après un redéploiement** : le volume `jwt_keys` a été recréé ou
  `JWT_PASSPHRASE` a changé.
