<?php

namespace App\Controller;

use App\Entity\Center;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Réactivation d'un compte désactivé ou d'un centre archivé (inverse du DELETE logique).
 */
final class RestoreController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /** Le compte retrouve ses centres et peut de nouveau se connecter */
    #[Route('/api/users/{id}/restore', name: 'api_user_restore', methods: ['POST'])]
    #[IsGranted('USER_MANAGE', subject: 'user')]
    public function restoreUser(User $user): Response
    {
        $user->restore();
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/centers/{id}/restore', name: 'api_center_restore', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function restoreCenter(Center $center): Response
    {
        $center->restore();
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
