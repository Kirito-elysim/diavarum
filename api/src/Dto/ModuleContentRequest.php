<?php

namespace App\Dto;

use App\Entity\Module;
use Symfony\Component\Validator\Constraints as Assert;

/** Contenu d'une séance transmis par le prestataire (ou un administrateur national) */
final class ModuleContentRequest
{
    /**
     * @param list<array<string, mixed>> $content
     * @param list<string>               $competencies libellés, dans l'ordre
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 255)]
        public readonly string $title = '',
        #[Assert\NotNull]
        public readonly array $content = [],
        public readonly string $description = '',
        #[Assert\Range(min: 5, max: 120)]
        public readonly int $estimatedDuration = 30,
        #[Assert\Count(max: Module::MAX_COMPETENCIES, maxMessage: 'Une séance compte au plus {{ limit }} compétences.')]
        #[Assert\All([new Assert\NotBlank(), new Assert\Type('string')])]
        public readonly array $competencies = [],
        public readonly bool $published = true,
    ) {
    }
}
