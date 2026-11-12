<?php

namespace App\Reporting;

use App\Entity\TrainingSession;
use App\Enum\SessionStatus;
use Doctrine\ORM\QueryBuilder;

/**
 * Anciennes validations répétées d'un même cours dans un même parcours (avant la validation unique) :
 * seule la dernière compte dans les calculs fondés sur les séances ; l'historique reste intact.
 */
final class LatestValidation
{
    /** Requête sur des séances validées : écarte celles qu'une validation plus récente du même cours et parcours remplace */
    public static function restrict(QueryBuilder $query, string $alias = 's'): void
    {
        $query->andWhere(\sprintf(
            'NOT EXISTS (SELECT 1 FROM %s lv WHERE lv.program = %s.program AND lv.module = %s.module AND lv.status = :lv_validated AND (lv.completedAt > %s.completedAt OR (lv.completedAt = %s.completedAt AND lv.id > %s.id)))',
            TrainingSession::class, $alias, $alias, $alias, $alias, $alias,
        ))->setParameter('lv_validated', SessionStatus::Validated);
    }

    /**
     * @param iterable<TrainingSession> $sessions
     *
     * @return array<string, true> identifiants des séances validées remplacées par une plus récente
     */
    public static function supersededIds(iterable $sessions): array
    {
        $latest = [];
        foreach ($sessions as $session) {
            if (SessionStatus::Validated !== $session->getStatus() || null === $session->getProgram()) {
                continue;
            }
            $key = $session->getProgram()->getId()->toRfc4122().'|'.$session->getModule()->getId()->toRfc4122();
            $order = ($session->getCompletedAt()?->format('U.u') ?? '').'|'.$session->getId()->toRfc4122();
            $latest[$key][$order] = $session->getId()->toRfc4122();
        }

        $superseded = [];
        foreach ($latest as $group) {
            ksort($group);
            array_pop($group);
            foreach ($group as $id) {
                $superseded[$id] = true;
            }
        }

        return $superseded;
    }
}
