<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Action sensible confirmée par le mot de passe du compte */
final class ConfirmPasswordRequest
{
    public function __construct(
        #[Assert\NotBlank]
        public readonly string $password = '',
    ) {
    }
}
