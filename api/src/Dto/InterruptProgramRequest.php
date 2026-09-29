<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class InterruptProgramRequest
{
    /**
     * @param list<string> $reasons identifiants des motifs cochés
     */
    public function __construct(
        #[Assert\Count(min: 1, minMessage: 'Indiquez au moins un motif d\'interruption.')]
        #[Assert\All([new Assert\Uuid()])]
        public readonly array $reasons = [],
        #[Assert\Length(max: 2000)]
        public readonly ?string $notes = null,
    ) {
    }
}
