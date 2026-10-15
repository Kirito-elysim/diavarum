<?php

namespace App\EventListener;

use App\Entity\Contract\ArchivableInterface;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\OnFlushEventArgs;
use Doctrine\ORM\Events;

/**
 * Garde-fou : une ressource archivable n'est jamais effacée de la base, quel que soit
 * le chemin de code (API, commande, import). Il faut l'archiver (soft delete).
 */
#[AsDoctrineListener(event: Events::onFlush)]
final class PreventHardDeleteListener
{
    public function onFlush(OnFlushEventArgs $args): void
    {
        foreach ($args->getObjectManager()->getUnitOfWork()->getScheduledEntityDeletions() as $entity) {
            if ($entity instanceof ArchivableInterface) {
                throw new \LogicException(\sprintf('Suppression physique interdite pour %s : utilisez archive().', $entity::class));
            }
        }
    }
}
