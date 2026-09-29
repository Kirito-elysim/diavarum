<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class VerifySecurityCodeRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Regex('/^\d{4,6}$/', message: 'Le code doit comporter 4 à 6 chiffres.')]
        public readonly string $code = '',
    ) {
    }
}
