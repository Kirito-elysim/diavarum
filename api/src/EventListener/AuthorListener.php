<?php

namespace App\EventListener;

use App\Entity\Contract\AuthoredInterface;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PrePersistEventArgs;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Renseigne l'auteur (IDE connectée) des patients, parcours, séances… à leur création.
 */
#[AsDoctrineListener(event: Events::prePersist)]
final class AuthorListener
{
    public function __construct(private readonly Security $security)
    {
    }

    public function prePersist(PrePersistEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof AuthoredInterface || null !== $entity->getAuthor()) {
            return;
        }

        $user = $this->security->getUser();
        if ($user instanceof User) {
            $entity->setAuthor($user);
        }
    }
}
