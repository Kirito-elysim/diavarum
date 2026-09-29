<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * « Terminer le cours » : durée chronométrée, résultats des exercices, compétences évaluées par l'IDE.
 */
final class ValidateSessionRequest
{
    /**
     * @param list<array{blockId: string, correct: int, total: int}> $answers
     * @param list<array{id: string, validated: bool}>               $competencies
     */
    public function __construct(
        #[Assert\PositiveOrZero]
        public readonly int $durationSeconds = 0,
        #[Assert\All([new Assert\Collection([
            'blockId' => [new Assert\NotBlank(), new Assert\Type('string')],
            'correct' => [new Assert\NotNull(), new Assert\Type('int')],
            'total' => [new Assert\NotNull(), new Assert\Type('int')],
        ])])]
        public readonly array $answers = [],
        #[Assert\Count(max: 5)]
        #[Assert\All([new Assert\Collection([
            'id' => [new Assert\NotBlank(), new Assert\Uuid()],
            'validated' => [new Assert\NotNull(), new Assert\Type('bool')],
        ])])]
        public readonly array $competencies = [],
    ) {
    }

    /**
     * @return array<string, bool>
     */
    public function competencyMap(): array
    {
        return array_column($this->competencies, 'validated', 'id');
    }
}
