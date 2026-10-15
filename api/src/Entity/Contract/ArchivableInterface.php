<?php

namespace App\Entity\Contract;

/**
 * Ressource jamais supprimée physiquement (traçabilité CPAM / RGPD) :
 * un DELETE sur l'API l'archive.
 */
interface ArchivableInterface
{
    public function archive(): void;

    /** Annule l'archivage (réactivation) */
    public function restore(): void;

    public function isArchived(): bool;
}
