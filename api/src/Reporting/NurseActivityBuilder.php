<?php

namespace App\Reporting;

use App\Entity\Center;
use App\Entity\SessionCompetencyValidation;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\SessionStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;

/**
 * Résultats personnels d'une IDE : séances qu'elle a menées et validées pour les patients de ses centres,
 * sur la période choisie (facultative).
 */
final class NurseActivityBuilder
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param list<Center> $centers
     *
     * @return array<string, mixed>
     */
    public function build(User $nurse, array $centers, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array
    {
        /** @var list<TrainingSession> $sessions */
        $sessions = [] === $centers ? [] : $this->sessions($nurse, $centers, $from, $to)
            ->select('s', 'p', 'c', 'm', 'tp')->join('p.center', 'c')->join('s.module', 'm')->leftJoin('s.program', 'tp')
            ->orderBy('s.completedAt', 'DESC')
            ->getQuery()->getResult();

        $competencies = [] === $centers ? 0 : (int) $this->sessions($nurse, $centers, $from, $to)
            ->select('COUNT(v.id)')->join(SessionCompetencyValidation::class, 'v', 'WITH', 'v.session = s')
            ->andWhere('v.validated = true')->andWhere('v.validatedBy = :nurse')
            ->getQuery()->getSingleScalarResult();

        $scores = array_values(array_filter(array_map(static fn (TrainingSession $s) => $s->getScore(), $sessions), static fn (?int $s) => null !== $s));

        return [
            'period' => ['from' => $from?->format('Y-m-d'), 'to' => $to?->format('Y-m-d')],
            'totals' => [
                'validatedSessions' => \count($sessions),
                'patients' => \count(array_unique(array_map(static fn (TrainingSession $s) => $s->getPatient()->getId()->toRfc4122(), $sessions))),
                'averageScore' => self::average($scores),
                'totalDurationSeconds' => array_sum(array_map(static fn (TrainingSession $s) => $s->getDurationSeconds(), $sessions)),
                'validatedCompetencies' => $competencies,
            ],
            'monthly' => $this->monthly($sessions, $from, $to),
            'courses' => $this->courses($sessions),
            'patients' => $this->patients($sessions),
        ];
    }

    /**
     * @param list<Center> $centers
     */
    private function sessions(User $nurse, array $centers, ?\DateTimeImmutable $from, ?\DateTimeImmutable $to): QueryBuilder
    {
        $query = $this->entityManager->createQueryBuilder()
            ->from(TrainingSession::class, 's')->join('s.patient', 'p')
            ->andWhere('s.nurse = :nurse')->andWhere('s.status = :validated')
            ->andWhere('p.center IN (:centers)')->andWhere('p.removedAt IS NULL')
            ->setParameter('nurse', $nurse)->setParameter('validated', SessionStatus::Validated)->setParameter('centers', $centers);
        if (null !== $from) {
            $query->andWhere('s.completedAt >= :from')->setParameter('from', $from);
        }
        if (null !== $to) {
            $query->andWhere('s.completedAt <= :to')->setParameter('to', $to);
        }

        return $query;
    }

    /**
     * Séances et score moyen mois par mois (mois sans activité compris).
     *
     * @param list<TrainingSession> $sessions
     *
     * @return list<array{month: string, validatedSessions: int, averageScore: int|null}>
     */
    private function monthly(array $sessions, ?\DateTimeImmutable $from, ?\DateTimeImmutable $to): array
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $counts = [];
        $scores = [];
        foreach ($sessions as $session) {
            $month = $session->getCompletedAt()->setTimezone($paris)->format('Y-m');
            $counts[$month] = ($counts[$month] ?? 0) + 1;
            if (null !== $session->getScore()) {
                $scores[$month][] = $session->getScore();
            }
        }

        $start = $from?->setTimezone($paris)->format('Y-m') ?? ([] === $counts ? null : min(array_keys($counts)));
        if (null === $start) {
            return [];
        }
        $end = ($to ?? new \DateTimeImmutable())->setTimezone($paris)->format('Y-m');
        $months = [];
        for ($cursor = new \DateTimeImmutable($start.'-01'); $cursor->format('Y-m') <= $end && \count($months) < 60; $cursor = $cursor->modify('+1 month')) {
            $key = $cursor->format('Y-m');
            $months[] = ['month' => $key, 'validatedSessions' => $counts[$key] ?? 0, 'averageScore' => self::average($scores[$key] ?? [])];
        }

        return $months;
    }

    /**
     * Séances du catalogue menées, de la plus fréquente à la moins fréquente.
     *
     * @param list<TrainingSession> $sessions
     *
     * @return list<array{code: string, title: string, validations: int, averageScore: int|null}>
     */
    private function courses(array $sessions): array
    {
        $rows = [];
        foreach ($sessions as $session) {
            $module = $session->getModule();
            $rows[$module->getCode()] ??= ['code' => $module->getCode(), 'title' => $module->getTitle(), 'position' => $module->getPosition(), 'scores' => [], 'validations' => 0];
            ++$rows[$module->getCode()]['validations'];
            if (null !== $session->getScore()) {
                $rows[$module->getCode()]['scores'][] = $session->getScore();
            }
        }
        usort($rows, static fn (array $a, array $b) => [$b['validations'], $a['position']] <=> [$a['validations'], $b['position']]);

        return array_map(static fn (array $r) => ['code' => $r['code'], 'title' => $r['title'], 'validations' => $r['validations'], 'averageScore' => self::average($r['scores'])], $rows);
    }

    /**
     * Patients accompagnés : séances menées par l'IDE et progression de leur parcours.
     *
     * @param list<TrainingSession> $sessions sessions triées de la plus récente à la plus ancienne
     *
     * @return list<array<string, mixed>>
     */
    private function patients(array $sessions): array
    {
        $rows = [];
        foreach ($sessions as $session) {
            $patient = $session->getPatient();
            $id = $patient->getId()->toRfc4122();
            if (!isset($rows[$id])) {
                $program = $session->getProgram();
                $rows[$id] = [
                    'id' => $id,
                    'name' => mb_strtoupper($patient->getLastName()).' '.$patient->getFirstName(),
                    'center' => $patient->getCenter()->getName(),
                    'lastSessionAt' => $session->getCompletedAt()->format(\DATE_ATOM),
                    'sessions' => 0,
                    'scores' => [],
                    'program' => null === $program ? null : [
                        'status' => $program->getStatus()->value,
                        'validated' => $program->getValidatedCount(),
                        'selected' => $program->getSelectedCount(),
                    ],
                ];
            }
            ++$rows[$id]['sessions'];
            if (null !== $session->getScore()) {
                $rows[$id]['scores'][] = $session->getScore();
            }
        }

        return array_values(array_map(static function (array $row) {
            $row['averageScore'] = self::average($row['scores']);
            unset($row['scores']);

            return $row;
        }, $rows));
    }

    /**
     * @param list<int> $values
     */
    private static function average(array $values): ?int
    {
        return [] === $values ? null : (int) round(array_sum($values) / \count($values));
    }
}
