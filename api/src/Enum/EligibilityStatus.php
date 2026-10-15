<?php

namespace App\Enum;

enum EligibilityStatus: string
{
    /** Patient créé, éligibilité pas encore statuée */
    case Registered = 'enregistre';
    case Eligible = 'eligible';
    /** Parcours bloqué : pas de sélection de cours, pas d'accès aux cours */
    case NotEligible = 'non_eligible';
}
