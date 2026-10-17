<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

/**
 * Patient de la file active : rien ne se crée ni ne se modifie pour un patient archivé.
 */
#[\Attribute(\Attribute::TARGET_PROPERTY)]
final class ActivePatient extends Constraint
{
    public string $message = 'Ce patient est archivé : réactivez-le avant de poursuivre.';
}
