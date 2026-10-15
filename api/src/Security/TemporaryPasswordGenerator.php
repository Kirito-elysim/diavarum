<?php

namespace App\Security;

use Symfony\Component\Validator\Constraints\PasswordStrength;
use Symfony\Component\Validator\Constraints\PasswordStrengthValidator;

/**
 * Mots de passe provisoires faciles à dicter (« Lavande-Castor-47 ») mais conformes aux règles
 * du compte (12 caractères, robustesse moyenne). Même principe que le générateur du front.
 */
final class TemporaryPasswordGenerator
{
    private const WORDS = [
        'Soleil', 'Jardin', 'Riviere', 'Bateau', 'Montagne', 'Cerise', 'Nuage', 'Prairie',
        'Citron', 'Fleuve', 'Violette', 'Lavande', 'Sapin', 'Rocher', 'Plage', 'Etoile',
        'Colline', 'Abricot', 'Tulipe', 'Papillon', 'Moulin', 'Phare', 'Rivage', 'Glacier',
        'Cascade', 'Vallon', 'Mimosa', 'Prune', 'Castor', 'Renard', 'Dauphin', 'Mouette',
        'Cigale', 'Chamois', 'Canard', 'Verger', 'Bruyere', 'Falaise', 'Bambou', 'Corail',
    ];

    public function generate(): string
    {
        do {
            [$first, $second] = [self::WORDS[random_int(0, \count(self::WORDS) - 1)], self::WORDS[random_int(0, \count(self::WORDS) - 1)]];
            $password = \sprintf('%s-%s-%d%d', $first, $second, random_int(2, 9), random_int(2, 9));
        } while ($first === $second || \strlen($password) < 12 || PasswordStrengthValidator::estimateStrength($password) < PasswordStrength::STRENGTH_MEDIUM);

        return $password;
    }
}
