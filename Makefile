DC      = docker compose
DC_PROD = docker compose -f compose.yaml -f compose.prod.yaml
PHP     = $(DC) exec php
CONSOLE = $(PHP) bin/console

.DEFAULT_GOAL := help
.PHONY: help up down restart build ps logs cc sh console composer npm migration migrate fixtures content test e2e db db-dump db-restore prod-up prod-down

help: ## Liste des commandes
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[33m%-12s\033[0m %s\n", $$1, $$2}'

## —— Stack de développement ——————————————————————————————————
up: ## Démarre toute la stack (build si nécessaire)
	$(DC) up -d --build
	@P=$$(grep -s '^HTTP_PORT=' .env | cut -d= -f2 | cut -d' ' -f1); echo "→ Application : http://localhost:$${P:-8080}"

down: ## Arrête la stack (les données restent dans le volume)
	$(DC) down

restart: ## Redémarre la stack
	$(DC) restart

build: ## Reconstruit les images
	$(DC) build --pull

ps: ## État des conteneurs
	$(DC) ps

logs: ## Logs en continu (ex : make logs s=php)
	$(DC) logs -f --tail=100 $(s)

cc: ## Vide le cache Symfony (après un changement d'entité ou de groupes de sérialisation)
	$(PHP) sh -c 'rm -rf var/cache/* && bin/console cache:warmup -q'

sh: ## Shell dans le conteneur PHP
	$(PHP) sh

## —— Outils ———————————————————————————————————————————————————
console: ## Console Symfony (ex : make console c="debug:router")
	$(CONSOLE) $(c)

composer: ## Composer (ex : make composer c="require symfony/uid")
	$(PHP) composer $(c)

npm: ## npm dans le front (ex : make npm c="install date-fns")
	$(DC) exec front npm $(c)

## —— Base de données ———————————————————————————————————————————
migration: ## Génère une migration à partir des entités
	$(CONSOLE) doctrine:migrations:diff

migrate: ## Applique les migrations
	$(CONSOLE) doctrine:migrations:migrate --no-interaction

fixtures: ## Recharge les données de démo (conserve le catalogue des séances et les listes de référence)
	$(CONSOLE) doctrine:fixtures:load --no-interaction \
		--purge-exclusions=eligibility_reason --purge-exclusions=interruption_reason --purge-exclusions=codex_word \
		--purge-exclusions=chapter --purge-exclusions=module
	$(MAKE) content

content: ## Importe les contenus de cours versionnés (api/content/*.json)
	$(PHP) sh -c 'bin/console app:content:import content/*.json'

test: ## Lance les tests (base diaverum_test créée / migrée si besoin)
	$(PHP) sh -c 'rm -rf var/cache/test \
		&& bin/console --env=test doctrine:database:create --if-not-exists -q \
		&& bin/console --env=test doctrine:migrations:migrate --no-interaction -q \
		&& vendor/bin/phpunit $(c)'

e2e: ## Parcours complet dans un navigateur (recharge les données de démo)
	$(MAKE) fixtures
	$(CONSOLE) cache:pool:clear cache.rate_limiter -q
	cd e2e && npm install --no-audit --no-fund --silent && npx playwright install chromium >/dev/null
	@P=$$(grep -s '^HTTP_PORT=' .env | cut -d= -f2 | cut -d' ' -f1); cd e2e && E2E_BASE_URL=http://localhost:$${P:-8080} node scenario.mjs

db: ## Console psql
	$(DC) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

db-dump: ## Sauvegarde la base dans backups/
	@mkdir -p backups
	$(DC) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" --clean --if-exists' > backups/diaverum-$$(date +%Y%m%d-%H%M%S).sql
	@ls -1t backups | head -1

db-restore: ## Restaure une sauvegarde (ex : make db-restore f=backups/xxx.sql)
	@test -n "$(f)" || (echo "Préciser le fichier : make db-restore f=backups/xxx.sql" && exit 1)
	$(DC) exec -T db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < $(f)

## —— Production ——————————————————————————————————————————————
prod-up: ## Build + démarrage en mode production
	$(DC_PROD) up -d --build

prod-down: ## Arrêt de la production
	$(DC_PROD) down
