<?php

namespace App\Entity\Contract;

use App\Entity\Center;

/**
 * Ressource rattachée à un centre de dialyse : seuls les utilisateurs affiliés
 * à ce centre (ou les administrateurs nationaux) peuvent y accéder.
 */
interface CenterScopedInterface
{
    public function getScopeCenter(): ?Center;
}
