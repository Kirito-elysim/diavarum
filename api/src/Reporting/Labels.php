<?php

namespace App\Reporting;

/** Libellés français des statuts, pour les bilans et exports */
final class Labels
{
    public const ELIGIBILITY = ['enregistre' => 'Enregistré', 'eligible' => 'Éligible', 'non_eligible' => 'Non éligible'];
    public const PROGRAM = ['non_actif' => 'Non actif', 'actif' => 'En cours', 'interrompu' => 'Interrompu', 'acheve' => 'Achevé'];
    public const COURSE = ['non_demarre' => 'Non démarré', 'non_termine' => 'Non terminé', 'valide' => 'Validé'];

    /** « Activité du 01/07/2026 au 30/09/2026 », « Activité depuis le … », « Toute l'activité » */
    public static function period(array $period): string
    {
        $format = static fn (?string $day) => null === $day ? null : \DateTimeImmutable::createFromFormat('!Y-m-d', $day)->format('d/m/Y');
        [$from, $to] = [$format($period['from'] ?? null), $format($period['to'] ?? null)];

        return match (true) {
            null !== $from && null !== $to => "Activité du $from au $to",
            null !== $from => "Activité depuis le $from",
            null !== $to => "Activité jusqu'au $to",
            default => 'Toute l\'activité',
        };
    }
}
