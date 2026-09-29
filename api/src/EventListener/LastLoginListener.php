<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;

/**
 * Horodate la dernière connexion (identifiant + mot de passe uniquement : le JWT
 * ré-authentifie chaque requête et ne doit pas être compté comme une connexion).
 */
#[AsEventListener]
final class LastLoginListener
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function __invoke(LoginSuccessEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User || 'api_auth_login' !== $event->getRequest()->attributes->get('_route')) {
            return;
        }

        $user->markLoggedIn();
        $this->entityManager->flush();
    }
}
