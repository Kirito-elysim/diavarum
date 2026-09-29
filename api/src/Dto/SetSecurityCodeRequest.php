<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Définition / changement d'un code de sécurité : confirmé par le mot de passe du compte */
final class SetSecurityCodeRequest
{
    public function __construct(
        #[Assert\NotBlank]
        public readonly string $password = '',
        #[Assert\NotBlank]
        #[Assert\Regex('/^\d{4,6}$/', message: 'Le code doit comporter 4 à 6 chiffres.')]
        public readonly string $code = '',
    ) {
    }
}
