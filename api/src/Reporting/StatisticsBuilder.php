<?php

namespace App\Reporting;

use App\Entity\Center;
use App\Entity\Module;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\ProgramStatus;
use App\Enum\SessionStatus;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Synthèse pour un ou plusieurs centres, ou au national (cahier des charges §3) :
 * - nombre et proportion de patients enregistrés / éligibles / non éligibles ;
 * - nombre et proportion de parcours par statut ;
 * - scores moyens par cours et des parcours ;
 * - durées moyennes par cours (pas par chapitre) et des parcours achevés, par centre et au total ;
 * - activité des IDE (séances validées, temps passé, patients, score) ;
 * - activité mois par mois et motifs de clôture des parcours.
 *
 * La période (facultative) filtre l'activité : séances validées, parcours achevés ou clôturés.
 * Les effectifs (patients, parcours par statut) sont toujours donnés à date.
 */
final class StatisticsBuilder
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param list<Center> $centers
     *
     * @return array<string, mixed>
     */
    public function build(array $centers, bool $national, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array
    {
        $inPeriod = static fn (?\DateTimeInterface $date): bool => null !== $date
            && (null === $from || $date >= $from) && (null === $to || $date <= $to);

        $patients = [] === $centers ? [] : $this->entityManager->createQueryBuilder()
            ->select('p', 'c')->from(Patient::class, 'p')->join('p.center', 'c')
            ->andWhere('c IN (:centers)')->andWhere('p.removedAt IS NULL')
            ->setParameter('centers', $centers)
            ->getQuery()->getResult();

        $programs = [] === $patients ? [] : $this->entityManager->createQueryBuilder()
            ->select('tp', 'pm', 'm')->from(TrainingProgram::class, 'tp')
            ->leftJoin('tp.modules', 'pm')->leftJoin('pm.module', 'm')
            ->andWhere('tp.patient IN (:patients)')->setParameter('patients', $patients)
            ->getQuery()->getResult();

        $programsByCenter = [];
        foreach ($programs as $program) {
            $programsByCenter[$program->getPatient()->getCenter()->getId()->toRfc4122()][] = $program;
        }
        $patientsByCenter = [];
        foreach ($patients as $patient) {
            $patientsByCenter[$patient->getCenter()->getId()->toRfc4122()][] = $patient;
        }

        $perCenter = array_map(fn (Center $center) => ['center' => $center->getName()] + $this->aggregate(
            $patientsByCenter[$center->getId()->toRfc4122()] ?? [],
            $programsByCenter[$center->getId()->toRfc4122()] ?? [],
            $inPeriod,
        ), $centers);

        return [
            'scope' => $national ? 'National' : implode(', ', array_map(static fn (Center $c) => $c->getName(), $centers)),
            'national' => $national,
            'generatedAt' => new \DateTimeImmutable(),
            'period' => ['from' => $from?->format('Y-m-d'), 'to' => $to?->format('Y-m-d')],
            'centers' => $perCenter,
            'total' => ['center' => $national ? 'National' : 'Total'] + $this->aggregate($patients, $programs, $inPeriod),
            'courses' => $this->courses($programs, $inPeriod),
            'nurses' => $this->nurses($centers, $from, $to),
            'monthly' => $this->monthly($programs, $inPeriod, $from, $to),
            'interruptionReasons' => $this->interruptionReasons($programs, $inPeriod),
        ];
    }

    /**
     * @param list<Patient>         $patients
     * @param list<TrainingProgram> $programs
     * @param \Closure(?\DateTimeInterface): bool $inPeriod
     *
     * @return array<string, mixed>
     */
    private function aggregate(array $patients, array $programs, \Closure $inPeriod): array
    {
        $sessionScores = [];
        $validatedSessions = 0;
        foreach ($programs as $program) {
            foreach ($program->getModules() as $selection) {
                if ($inPeriod($selection->getValidatedAt())) {
                    ++$validatedSessions;
                    if (null !== $selection->getScore()) {
                        $sessionScores[] = $selection->getScore();
                    }
                }
            }
        }

        $registered = \count($patients);
        $countPatients = static fn (EligibilityStatus $status) => \count(array_filter($patients, static fn (Patient $p) => $p->getEligibilityStatus() === $status));
        $totalPrograms = \count($programs);
        $countPrograms = static fn (ProgramStatus $status) => \count(array_filter($programs, static fn (TrainingProgram $p) => $p->getStatus() === $status));

        $programScores = array_values(array_filter(array_map(static fn (TrainingProgram $p) => $p->getAverageScore(), $programs), static fn (?int $s) => null !== $s));
        $completedDurations = array_map(
            static fn (TrainingProgram $p) => $p->getTotalDurationSeconds(),
            array_filter($programs, static fn (TrainingProgram $p) => ProgramStatus::Completed === $p->getStatus()),
        );

        return [
            'patients' => [
                'registered' => $registered,
                'eligible' => self::share($countPatients(EligibilityStatus::Eligible), $registered),
                'notEligible' => self::share($countPatients(EligibilityStatus::NotEligible), $registered),
                'pending' => self::share($countPatients(EligibilityStatus::Registered), $registered),
            ],
            'programs' => [
                'total' => $totalPrograms,
                'inactive' => self::share($countPrograms(ProgramStatus::Inactive), $totalPrograms),
                'active' => self::share($countPrograms(ProgramStatus::Active), $totalPrograms),
                'interrupted' => self::share($countPrograms(ProgramStatus::Interrupted), $totalPrograms),
                'completed' => self::share($countPrograms(ProgramStatus::Completed), $totalPrograms),
            ],
            'averageProgramScore' => self::average($programScores),
            'averageCompletedProgramDurationSeconds' => self::average(array_values($completedDurations)),
            'activity' => [
                'validatedSessions' => $validatedSessions,
                'averageSessionScore' => self::average($sessionScores),
                'completedPrograms' => \count(array_filter($programs, static fn (TrainingProgram $p) => ProgramStatus::Completed === $p->getStatus() && $inPeriod($p->getCompletedAt()))),
                'interruptedPrograms' => \count(array_filter($programs, static fn (TrainingProgram $p) => ProgramStatus::Interrupted === $p->getStatus() && $inPeriod($p->getInterruptedAt()))),
            ],
        ];
    }

    /**
     * Score et durée moyens de chaque séance du catalogue, sur les séances validées du périmètre.
     *
     * @param list<TrainingProgram> $programs
     * @param \Closure(?\DateTimeInterface): bool $inPeriod
     *
     * @return list<array<string, mixed>>
     */
    private function courses(array $programs, \Closure $inPeriod): array
    {
        $scores = [];
        $durations = [];
        foreach ($programs as $program) {
            foreach ($program->getModules() as $selection) {
                if (!$inPeriod($selection->getValidatedAt())) {
                    continue;
                }
                $code = $selection->getModule()->getCode();
                $durations[$code][] = $selection->getDurationSeconds() ?? 0;
                if (null !== $selection->getScore()) {
                    $scores[$code][] = $selection->getScore();
                }
            }
        }

        // Un cours archivé reste dans le bilan s'il a déjà été réalisé
        $modules = array_values(array_filter(
            $this->entityManager->getRepository(Module::class)->findBy([], ['position' => 'ASC']),
            static fn (Module $m) => !$m->isArchived() || isset($durations[$m->getCode()]),
        ));

        return array_map(static fn (Module $m) => [
            'code' => $m->getCode(),
            'title' => $m->getTitle(),
            'mandatory' => $m->isMandatory(),
            'validations' => \count($durations[$m->getCode()] ?? []),
            'averageScore' => self::average($scores[$m->getCode()] ?? []),
            'averageDurationSeconds' => self::average($durations[$m->getCode()] ?? []),
        ], $modules);
    }

    /**
     * IDE des centres du périmètre et séances qu'elles ont validées pour les patients de ces centres.
     *
     * @param list<Center> $centers
     *
     * @return list<array<string, mixed>>
     */
    private function nurses(array $centers, ?\DateTimeImmutable $from, ?\DateTimeImmutable $to): array
    {
        if ([] === $centers) {
            return [];
        }

        $query = $this->entityManager->createQueryBuilder()
            ->select('IDENTITY(s.nurse) AS nurse', 'COUNT(s.id) AS sessions', 'COALESCE(SUM(s.durationSeconds), 0) AS duration',
                'COUNT(DISTINCT s.patient) AS patients', 'AVG(s.score) AS score')
            ->from(TrainingSession::class, 's')->join('s.patient', 'p')
            ->andWhere('p.center IN (:centers)')->andWhere('s.status = :validated')
            ->setParameter('centers', $centers)->setParameter('validated', SessionStatus::Validated)
            ->groupBy('s.nurse');
        if (null !== $from) {
            $query->andWhere('s.completedAt >= :from')->setParameter('from', $from);
        }
        if (null !== $to) {
            $query->andWhere('s.completedAt <= :to')->setParameter('to', $to);
        }
        $activity = $query->getQuery()->getArrayResult();
        $byNurse = array_column($activity, null, 'nurse');

        $nurses = $this->entityManager->createQueryBuilder()
            ->select('DISTINCT u')->from(User::class, 'u')->join('u.centers', 'c')
            ->andWhere('c IN (:centers)')->andWhere('u.archivedAt IS NULL')->andWhere('u.role = :ide')
            ->setParameter('centers', $centers)->setParameter('ide', UserRole::Ide)
            ->getQuery()->getResult();
        // Une IDE désactivée depuis garde son activité dans la synthèse
        $known = array_map(static fn (User $u) => $u->getId()->toRfc4122(), $nurses);
        foreach (array_diff(array_keys($byNurse), $known) as $id) {
            $nurses[] = $this->entityManager->find(User::class, $id);
        }

        // Seuls les centres du périmètre de la synthèse sont mentionnés
        $inScope = array_map(static fn (Center $c) => $c->getId()->toRfc4122(), $centers);
        $rows = array_map(static fn (User $u) => [
            'name' => $u->getLastName().' '.$u->getFirstName(),
            'centers' => implode(', ', array_map(
                static fn (Center $c) => $c->getName(),
                array_filter($u->getCenters()->toArray(), static fn (Center $c) => \in_array($c->getId()->toRfc4122(), $inScope, true)),
            )),
            'validatedSessions' => (int) ($byNurse[$u->getId()->toRfc4122()]['sessions'] ?? 0),
            'totalDurationSeconds' => (int) ($byNurse[$u->getId()->toRfc4122()]['duration'] ?? 0),
            'patients' => (int) ($byNurse[$u->getId()->toRfc4122()]['patients'] ?? 0),
            'averageScore' => isset($byNurse[$u->getId()->toRfc4122()]['score']) ? (int) round((float) $byNurse[$u->getId()->toRfc4122()]['score']) : null,
        ], $nurses);
        usort($rows, static fn (array $a, array $b) => strcmp($a['name'], $b['name']));

        return $rows;
    }

    /**
     * Séances validées et score moyen, mois par mois (mois sans activité compris).
     * Sans période : de la première séance validée au mois en cours.
     *
     * @param list<TrainingProgram> $programs
     * @param \Closure(?\DateTimeInterface): bool $inPeriod
     *
     * @return list<array{month: string, validatedSessions: int, averageScore: int|null}>
     */
    private function monthly(array $programs, \Closure $inPeriod, ?\DateTimeImmutable $from, ?\DateTimeImmutable $to): array
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $counts = [];
        $scores = [];
        $first = null;
        foreach ($programs as $program) {
            foreach ($program->getModules() as $selection) {
                $date = $selection->getValidatedAt();
                if (!$inPeriod($date)) {
                    continue;
                }
                $month = $date->setTimezone($paris)->format('Y-m');
                $counts[$month] = ($counts[$month] ?? 0) + 1;
                if (null !== $selection->getScore()) {
                    $scores[$month][] = $selection->getScore();
                }
                $first = null === $first || $month < $first ? $month : $first;
            }
        }

        $start = $from?->setTimezone($paris)->format('Y-m') ?? $first;
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
     * Motifs cochés lors de la clôture des parcours interrompus sur la période, du plus fréquent au moins fréquent.
     *
     * @param list<TrainingProgram> $programs
     * @param \Closure(?\DateTimeInterface): bool $inPeriod
     *
     * @return list<array{label: string, count: int}>
     */
    private function interruptionReasons(array $programs, \Closure $inPeriod): array
    {
        $counts = [];
        foreach ($programs as $program) {
            if (ProgramStatus::Interrupted !== $program->getStatus() || !$inPeriod($program->getInterruptedAt())) {
                continue;
            }
            foreach ($program->getInterruptionReasons() as $reason) {
                $counts[$reason->getLabel()] = ($counts[$reason->getLabel()] ?? 0) + 1;
            }
        }
        arsort($counts);

        return array_map(static fn (string $label, int $count) => ['label' => $label, 'count' => $count], array_keys($counts), array_values($counts));
    }

    /**
     * @return array{count: int, percent: float|null}
     */
    private static function share(int $count, int $total): array
    {
        return ['count' => $count, 'percent' => 0 === $total ? null : round(100 * $count / $total, 1)];
    }

    /**
     * @param list<int> $values
     */
    private static function average(array $values): ?int
    {
        return [] === $values ? null : (int) round(array_sum($values) / \count($values));
    }
}
