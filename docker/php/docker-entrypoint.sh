#!/bin/sh
set -e

# Seul le conteneur php-fpm prépare l'application (dépendances, migrations) :
# le worker et les commandes ponctuelles réutilisent le même état.
if [ "$1" = 'php-fpm' ]; then
	if [ "$APP_ENV" != 'prod' ] && [ -f composer.json ] && [ ! -f vendor/autoload_runtime.php ]; then
		composer install --prefer-dist --no-progress --no-interaction
	fi

	if [ -f bin/console ] && [ -n "$(find ./migrations -iname '*.php' -print -quit 2>/dev/null)" ]; then
		php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing
	fi

	# Clés de signature JWT : générées au premier démarrage (volume dédié en production)
	if [ -f bin/console ]; then
		php bin/console lexik:jwt:generate-keypair --skip-if-exists
	fi

	mkdir -p var/cache var/log
	chown -R www-data:www-data var
	if [ -f config/jwt/private.pem ]; then
		chown -R www-data:www-data config/jwt
		chmod 600 config/jwt/private.pem
	fi
fi

exec docker-php-entrypoint "$@"
