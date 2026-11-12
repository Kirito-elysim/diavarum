<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ReopenProgramRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Indiquez le motif de l\'annulation.', normalizer: 'trim')]
        #[Assert\Length(max: 500)]
        public readonly string $reason = '',
    ) {
    }
}
