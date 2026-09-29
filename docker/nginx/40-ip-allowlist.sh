#!/bin/sh
# Liste blanche d'adresses IP (cahier des charges §5), générée au démarrage de Nginx à partir de :
#   ALLOWED_IPS      adresses ou plages autorisées, séparées par des virgules ou des espaces (vide = pas de filtrage)
#   TRUSTED_PROXIES  répartiteurs de charge en amont : l'IP réelle est alors lue dans X-Forwarded-For
set -eu

conf=/etc/nginx/allowlist.conf
: > "$conf"

for proxy in $(echo "${TRUSTED_PROXIES:-}" | tr ',' ' '); do
    echo "set_real_ip_from $proxy;" >> "$conf"
done
if [ -n "${TRUSTED_PROXIES:-}" ]; then
    echo "real_ip_header X-Forwarded-For;" >> "$conf"
    echo "real_ip_recursive on;" >> "$conf"
fi

if [ -n "${ALLOWED_IPS:-}" ]; then
    for ip in $(echo "$ALLOWED_IPS" | tr ',' ' '); do
        echo "allow $ip;" >> "$conf"
    done
    echo "deny all;" >> "$conf"
    echo "Liste blanche IP active : $(grep -c '^allow' "$conf") adresse(s) ou plage(s) autorisée(s)"
else
    echo "Liste blanche IP inactive (ALLOWED_IPS vide)"
fi
