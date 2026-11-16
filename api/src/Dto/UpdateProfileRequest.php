<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Modification de son propre compte (identité, email, mot de passe), confirmée par le mot de passe actuel */
final class UpdateProfileRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 100)]
        public readonly string $firstName = '',
        #[Assert\NotBlank]
        #[Assert\Length(max: 100)]
        public readonly string $lastName = '',
        #[Assert\NotBlank]
        #[Assert\Email]
        #[Assert\Length(max: 180)]
        public readonly string $email = '',
        #[Assert\NotBlank]
        public readonly string $currentPassword = '',
        #[Assert\Length(min: 12, max: 4096, minMessage: 'Le mot de passe doit contenir au moins {{ limit }} caractères.')]
        #[Assert\PasswordStrength(minScore: Assert\PasswordStrength::STRENGTH_MEDIUM, message: 'Le mot de passe est trop faible.')]
        public readonly ?string $newPassword = null,
    ) {
    }
}
