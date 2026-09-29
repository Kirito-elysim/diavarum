<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Profil de l'utilisateur connecté (rôle, centres, code de sécurité configuré ou non).
 */
final class MeController
{
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(#[CurrentUser] User $user, NormalizerInterface $normalizer): JsonResponse
    {
        return new JsonResponse($normalizer->normalize($user, 'json', ['groups' => ['me:read']]));
    }
}
