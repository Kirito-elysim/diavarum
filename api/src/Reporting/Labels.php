<?php

namespace App\Reporting;

/** Libellés français des statuts, pour les bilans et exports */
final class Labels
{
    public const ELIGIBILITY = ['enregistre' => 'Enregistré', 'eligible' => 'Éligible', 'non_eligible' => 'Non éligible'];
    public const PROGRAM = ['non_actif' => 'Non actif', 'actif' => 'En cours', 'interrompu' => 'Interrompu', 'acheve' => 'Achevé'];
    public const COURSE = ['non_demarre' => 'Non démarré', 'non_termine' => 'Non terminé', 'valide' => 'Validé'];
}
