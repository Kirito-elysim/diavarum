<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ErasePatientRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Saisissez le nom et le prénom du patient pour confirmer.', normalizer: 'trim')]
        #[Assert\Length(max: 255)]
        public readonly string $confirmation = '',
    ) {
    }
}
