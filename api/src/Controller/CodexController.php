<?php

namespace App\Controller;

use App\Entity\CodexWord;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Test CODEX : tirage au sort de 3 mots dans la pioche (20 mots) pour chaque test.
 */
#[IsGranted('ROLE_IDE')]
final class CodexController
{
    public const WORDS_PER_TEST = 3;

    #[Route('/api/codex/draw', name: 'api_codex_draw', methods: ['GET'])]
    public function draw(EntityManagerInterface $entityManager): JsonResponse
    {
        $words = array_map(
            static fn (CodexWord $w) => $w->getWord(),
            $entityManager->getRepository(CodexWord::class)->findBy(['active' => true]),
        );
        shuffle($words);

        return new JsonResponse(['words' => \array_slice($words, 0, self::WORDS_PER_TEST)]);
    }
}
