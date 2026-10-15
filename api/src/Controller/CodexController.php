<?php

namespace App\Controller;

use App\Entity\CodexTest;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Test CODEX : liste principale fixe du protocole.
 */
#[IsGranted('ROLE_IDE')]
final class CodexController
{
    #[Route('/api/codex/draw', name: 'api_codex_draw', methods: ['GET'])]
    public function draw(): JsonResponse
    {
        return new JsonResponse(['words' => CodexTest::WORD_LISTS[0]]);
    }
}
