<?php

namespace App\Controller;

use App\Entity\Patient;
use App\Entity\ProgramModule;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\SessionStatus;
use App\Reporting\ReportingScope;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Tableau de bord : indicateurs, évolution sur 6 mois, avancement par séance, séances en cours et activité
 * récente, limités aux centres de l'utilisateur (tous les centres pour un administrateur national).
 */
#[IsGranted('ROLE_IDE')]
final class DashboardController
{
    private const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ReportingScope $scope,
    ) {
    }

    #[Route('/api/dashboard', name: 'api_dashboard', methods: ['GET'])]
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        $centers = $this->scope->centers($user, []);
        if ([] === $centers) {
            return new JsonResponse(['kpis' => null, 'monthly' => [], 'modules' => [], 'activeSessions' => [], 'activity' => []]);
        }

        $now = new \DateTimeImmutable();
        $today = $now->setTime(0, 0);
        $firstMonth = $now->modify('first day of this month')->setTime(0, 0)->modify('-5 months');

        $patients = $this->qb(Patient::class, 'p', $centers, 'p')->andWhere('p.removedAt IS NULL')->getQuery()->getResult();
        $sessions = $this->qb(TrainingSession::class, 's', $centers)
            ->addSelect('m', 'p', 'n')->join('s.module', 'm')->join('s.nurse', 'n')
            ->andWhere('s.startedAt >= :since OR s.status = :inProgress')
            ->setParameter('since', $firstMonth)->setParameter('inProgress', SessionStatus::InProgress)
            ->orderBy('s.startedAt', 'DESC')
            ->getQuery()->getResult();

        return new JsonResponse([
            'kpis' => $this->kpis($centers, $patients, $sessions, $today, $now),
            'monthly' => $this->monthly($sessions, $firstMonth),
            'modules' => $this->modules($centers),
            'activeSessions' => array_values(array_map(fn (TrainingSession $s) => [
                'id' => $s->getId()->toRfc4122(),
                'patientId' => $s->getPatient()->getId()->toRfc4122(),
                'patientName' => $s->getPatient()->getFirstName().' '.$s->getPatient()->getLastName(),
                'moduleCode' => $s->getModule()->getCode(),
                'moduleTitle' => $s->getModule()->getTitle(),
                'startedAt' => $s->getStartedAt()->format(\DATE_ATOM),
                'nurse' => $s->getNurse()->getFullName(),
            ], array_slice(array_filter($sessions, static fn (TrainingSession $s) => $s->isInProgress()), 0, 5))),
            'activity' => $this->activity($centers, $sessions),
        ]);
    }

    /**
     * @param list<Patient>         $patients
     * @param list<TrainingSession> $sessions
     *
     * @return array<string, int|null>
     */
    private function kpis(array $centers, array $patients, array $sessions, \DateTimeImmutable $today, \DateTimeImmutable $now): array
    {
        $validated = $this->qb(TrainingSession::class, 's', $centers)
            ->select('COUNT(s.id) AS total', 'AVG(s.score) AS average', 'COUNT(s.score) AS scored')
            ->andWhere('s.status = :validated')->setParameter('validated', SessionStatus::Validated)
            ->getQuery()->getSingleResult();
        $monthStart = $now->modify('first day of this month')->setTime(0, 0);
        $weekAgo = $now->modify('-7 days');

        return [
            'activeSessions' => \count(array_filter($sessions, static fn (TrainingSession $s) => $s->isInProgress())),
            'sessionsStartedToday' => \count(array_filter($sessions, static fn (TrainingSession $s) => $s->getStartedAt() >= $today)),
            'patients' => \count($patients),
            'patientsThisWeek' => \count(array_filter($patients, static fn (Patient $p) => $p->getCreatedAt() >= $weekAgo)),
            'eligible' => \count(array_filter($patients, static fn (Patient $p) => EligibilityStatus::Eligible === $p->getEligibilityStatus())),
            'validatedSessions' => (int) $validated['total'],
            'validatedThisMonth' => \count(array_filter($sessions, static fn (TrainingSession $s) => SessionStatus::Validated === $s->getStatus() && $s->getCompletedAt() >= $monthStart)),
            'averageScore' => null === $validated['average'] ? null : (int) round((float) $validated['average']),
            'scoredSessions' => (int) $validated['scored'],
        ];
    }

    /**
     * Séances démarrées et validées par mois, sur les 6 derniers mois.
     *
     * @param list<TrainingSession> $sessions
     *
     * @return list<array{month: string, sessions: int, completed: int}>
     */
    private function monthly(array $sessions, \DateTimeImmutable $firstMonth): array
    {
        $months = [];
        for ($i = 0; $i < 6; ++$i) {
            $month = $firstMonth->modify("+$i months");
            $months[$month->format('Y-m')] = ['month' => self::MONTHS[(int) $month->format('n') - 1], 'sessions' => 0, 'completed' => 0];
        }

        foreach ($sessions as $session) {
            $started = $session->getStartedAt()->format('Y-m');
            if (isset($months[$started])) {
                ++$months[$started]['sessions'];
            }
            $completed = SessionStatus::Validated === $session->getStatus() ? $session->getCompletedAt()?->format('Y-m') : null;
            if (null !== $completed && isset($months[$completed])) {
                ++$months[$completed]['completed'];
            }
        }

        return array_values($months);
    }

    /**
     * Séances les plus travaillées : patients ayant validé la séance / l'ayant commencée sans la terminer.
     *
     * @return list<array{name: string, title: string, completed: int, inProgress: int}>
     */
    private function modules(array $centers): array
    {
        $rows = $this->entityManager->createQueryBuilder()
            ->select('m.code', 'm.title', 'm.position',
                'SUM(CASE WHEN pm.validatedAt IS NOT NULL THEN 1 ELSE 0 END) AS completed',
                'SUM(CASE WHEN pm.validatedAt IS NULL AND pm.startedAt IS NOT NULL THEN 1 ELSE 0 END) AS inProgress')
            ->from(ProgramModule::class, 'pm')
            ->join('pm.module', 'm')->join('pm.program', 'tp')->join('tp.patient', 'p')
            ->andWhere('p.center IN (:centers)')->andWhere('pm.startedAt IS NOT NULL')
            ->setParameter('centers', $centers)
            ->groupBy('m.id')
            ->getQuery()->getArrayResult();

        usort($rows, static fn (array $a, array $b) => ($b['completed'] + $b['inProgress']) <=> ($a['completed'] + $a['inProgress']) ?: $a['position'] <=> $b['position']);
        $top = \array_slice($rows, 0, 6);
        usort($top, static fn (array $a, array $b) => $a['position'] <=> $b['position']);

        return array_map(static fn (array $r) => [
            'name' => $r['code'],
            'title' => $r['title'],
            'completed' => (int) $r['completed'],
            'inProgress' => (int) $r['inProgress'],
        ], $top);
    }

    /**
     * Activité récente : séances démarrées ou validées, parcours créés, patients enregistrés.
     *
     * @param list<TrainingSession> $sessions
     *
     * @return list<array<string, string|null>>
     */
    private function activity(array $centers, array $sessions): array
    {
        $events = [];
        foreach (\array_slice($sessions, 0, 20) as $s) {
            $patient = $s->getPatient()->getFirstName().' '.$s->getPatient()->getLastName();
            $events[] = ['type' => 'session_started', 'at' => $s->getStartedAt(), 'user' => $s->getNurse()->getFullName(), 'patientId' => $s->getPatient()->getId()->toRfc4122(),
                'description' => \sprintf('Séance « %s » démarrée avec %s', $s->getModule()->getTitle(), $patient)];
            if (SessionStatus::Validated === $s->getStatus()) {
                $events[] = ['type' => 'session_completed', 'at' => $s->getCompletedAt(), 'user' => $s->getNurse()->getFullName(), 'patientId' => $s->getPatient()->getId()->toRfc4122(),
                    'description' => \sprintf('%s a validé « %s »%s', $patient, $s->getModule()->getTitle(), null !== $s->getScore() ? \sprintf(' (%d %%)', $s->getScore()) : '')];
            }
        }

        foreach ($this->qb(TrainingProgram::class, 'tp', $centers)->addSelect('p', 'u')->join('tp.createdBy', 'u')
            ->orderBy('tp.createdAt', 'DESC')->setMaxResults(10)->getQuery()->getResult() as $program) {
            $events[] = ['type' => 'module_assigned', 'at' => $program->getCreatedAt(), 'user' => $program->getCreatedBy()->getFullName(), 'patientId' => $program->getPatient()->getId()->toRfc4122(),
                'description' => \sprintf('Parcours créé pour %s %s (%d séances)', $program->getPatient()->getFirstName(), $program->getPatient()->getLastName(), $program->getSelectedCount())];
        }

        foreach ($this->qb(Patient::class, 'p', $centers, 'p')->addSelect('u')->join('p.createdBy', 'u')->andWhere('p.removedAt IS NULL')
            ->orderBy('p.createdAt', 'DESC')->setMaxResults(10)->getQuery()->getResult() as $patient) {
            $events[] = ['type' => 'patient_added', 'at' => $patient->getCreatedAt(), 'user' => $patient->getCreatedBy()->getFullName(), 'patientId' => $patient->getId()->toRfc4122(),
                'description' => \sprintf('Nouveau patient : %s %s (%s)', $patient->getFirstName(), $patient->getLastName(), $patient->getCenter()->getName())];
        }

        usort($events, static fn (array $a, array $b) => $b['at'] <=> $a['at']);

        return array_map(static fn (array $e) => ['at' => $e['at']->format(\DATE_ATOM)] + $e, \array_slice($events, 0, 6));
    }

    /**
     * Requête limitée aux centres : l'entité (alias $alias) est reliée au patient (alias p) puis au centre.
     */
    private function qb(string $class, string $alias, array $centers, ?string $patientAlias = null): QueryBuilder
    {
        $qb = $this->entityManager->createQueryBuilder()->select($alias)->from($class, $alias);
        if (null === $patientAlias) {
            $qb->join("$alias.patient", 'p');
        }

        return $qb->andWhere('p.center IN (:centers)')->setParameter('centers', $centers);
    }
}
