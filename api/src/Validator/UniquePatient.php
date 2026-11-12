<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

/**
 * Création d'un patient : refuse le même patient (nom, prénom, date de naissance), actif ou archivé, dans le même centre.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class UniquePatient extends Constraint
{
    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
