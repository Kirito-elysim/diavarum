# syntax=docker/dockerfile:1
#
# Image unique multi-cibles, construite depuis la racine du projet :
#   php-dev    → API Symfony en développement (code monté en volume)
#   php-prod   → API Symfony en production (code embarqué)
#   nginx-prod → reverse proxy + front React compilé

ARG PHP_VERSION=8.4
ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# ─── PHP : base commune ───────────────────────────────────────────────
FROM php:${PHP_VERSION}-fpm-alpine AS php-base

WORKDIR /app

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql intl opcache zip apcu gd

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    PATH="${PATH}:/app/vendor/bin"

COPY docker/php/conf.d/app.ini $PHP_INI_DIR/conf.d/10-app.ini
COPY --chmod=755 docker/php/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
CMD ["php-fpm"]

# ─── PHP : développement ──────────────────────────────────────────────
FROM php-base AS php-dev

ENV APP_ENV=dev
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" \
 && apk add --no-cache git unzip

# ─── PHP : production ─────────────────────────────────────────────────
FROM php-base AS php-prod

ENV APP_ENV=prod
# fcgi : contrôle de santé du conteneur (cgi-fcgi interroge /api/health directement dans php-fpm)
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && apk add --no-cache fcgi
COPY docker/php/conf.d/app.prod.ini $PHP_INI_DIR/conf.d/20-app.prod.ini

COPY api/composer.json api/composer.lock api/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress --no-interaction

COPY api/ ./
RUN rm -rf var/* \
 && composer dump-autoload --classmap-authoritative --no-dev \
 && composer dump-env prod \
 && composer run-script --no-dev post-install-cmd \
 && chmod +x bin/console \
 && chown -R www-data:www-data var

# ─── Front : build de production ──────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS front-build

WORKDIR /app
COPY front/package.json front/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY front/ ./
# Recette uniquement : affiche les comptes de démonstration sur la page de connexion
ARG VITE_DEMO_ACCOUNTS=false
ENV VITE_DEMO_ACCOUNTS=$VITE_DEMO_ACCOUNTS
RUN npm run build

# ─── Nginx : production ───────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}-alpine AS nginx-prod

COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/nginx/40-ip-allowlist.sh /docker-entrypoint.d/40-ip-allowlist.sh
COPY --from=php-prod /app/public /app/public
COPY --from=front-build /app/dist /usr/share/nginx/html
