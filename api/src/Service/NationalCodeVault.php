<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Chiffrement réversible du code national, pour l'afficher aux administrateurs nationaux.
 * Clé : NATIONAL_CODE_KEY (32 octets en base64), propre au serveur et jamais en base de données.
 * Sans clé, rien n'est chiffré ni affiché : seule la vérification (hachée) reste active.
 */
final class NationalCodeVault
{
    private readonly ?string $key;

    public function __construct(#[Autowire(env: 'default::NATIONAL_CODE_KEY')] ?string $key)
    {
        $decoded = null !== $key && '' !== $key ? base64_decode($key, true) : false;
        $this->key = false !== $decoded && \SODIUM_CRYPTO_SECRETBOX_KEYBYTES === \strlen($decoded) ? $decoded : null;
    }

    public function isAvailable(): bool
    {
        return null !== $this->key;
    }

    public function encrypt(string $code): ?string
    {
        if (null === $this->key) {
            return null;
        }
        $nonce = random_bytes(\SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

        return base64_encode($nonce.sodium_crypto_secretbox($code, $nonce, $this->key));
    }

    /** Null si la clé manque, si le texte est invalide ou si la clé a changé */
    public function decrypt(string $payload): ?string
    {
        $raw = base64_decode($payload, true);
        if (null === $this->key || false === $raw || \strlen($raw) <= \SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            return null;
        }
        $plain = sodium_crypto_secretbox_open(
            substr($raw, \SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            substr($raw, 0, \SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
            $this->key,
        );

        return false === $plain ? null : $plain;
    }
}
