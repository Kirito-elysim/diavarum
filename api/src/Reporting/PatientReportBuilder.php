<?php

namespace App\Reporting;

use App\Entity\CodexTest;
use App\Entity\Patient;
use App\Entity\ProgramModule;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\SessionStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Bilan d'un patient (cahier des charges §3) : statut du parcours, puis pour chaque séance du parcours
 * son statut, et pour chaque séance validée : score, durée, date et heure, IDE, compétences validées.
 * Un parcours jamais démarré se limite à l'identité, l'éligibilité et le statut.
 */
final class PatientReportBuilder
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param list<Patient> $patients
     *
     * @return list<array<string, mixed>>
     */
    public function build(array $patients): array
    {
        if ([] === $patients) {
            return [];
        }

        $programs = [];
        $rows = $this->entityManager->createQueryBuilder()
            ->select('tp', 'pm', 'm', 'ch', 'vb')
            ->from(TrainingProgram::class, 'tp')
            ->leftJoin('tp.modules', 'pm')
            ->leftJoin('pm.module', 'm')
            ->leftJoin('m.chapter', 'ch')
            ->leftJoin('tp.validatedBy', 'vb')
            ->andWhere('tp.patient IN (:patients)')
            ->setParameter('patients', $patients)
            ->getQuery()->getResult();
        foreach ($rows as $program) {
            $programs[$program->getPatient()->getId()->toRfc4122()] = $program;
        }

        $sessions = $this->sessions(array_values($programs));
        $validatedSessions = [];
        $attempts = [];
        foreach ($sessions as $session) {
            $programId = $session->getProgram()->getId()->toRfc4122();
            $attempts[$programId][] = $session;
            if (SessionStatus::Validated === $session->getStatus()) {
                $validatedSessions[$programId.'|'.$session->getModule()->getId()->toRfc4122()] = $session;
            }
        }

        $codex = [];
        foreach ($this->entityManager->getRepository(CodexTest::class)->findBy(['patient' => $patients], ['createdAt' => 'ASC']) as $test) {
            $codex[$test->getPatient()->getId()->toRfc4122()][] = $test;
        }

        return array_map(function (Patient $patient) use ($programs, $validatedSessions, $attempts, $codex) {
            $program = $programs[$patient->getId()->toRfc4122()] ?? null;
            $report = $this->patientReport($patient, $program, $validatedSessions);
            $report['sessions'] = null === $program ? [] : array_map(static fn (TrainingSession $s) => [
                'code' => $s->getModule()->getCode(),
                'title' => $s->getModule()->getTitle(),
                'status' => Labels::SESSION[$s->getStatus()->value],
                'startedAt' => $s->getStartedAt(),
                'endedAt' => $s->getCompletedAt(),
                'durationSeconds' => $s->getDurationSeconds(),
                'score' => $s->getScore(),
                'nurse' => $s->getNurse()?->getFullName(),
            ], $attempts[$program->getId()->toRfc4122()] ?? []);
            $report['codex'] = array_map(static fn (CodexTest $t) => [
                'date' => $t->getCreatedAt(),
                'nurse' => $t->getNurse()?->getFullName(),
                'words' => $t->getWords(),
                'clockTime' => $t->getClockTime(),
                'clockPassed' => $t->isClockTestPassed(),
                'wordRecallPassed' => $t->isWordRecallPassed(),
                'orientationScore' => $t->getOrientationScore(),
                'nephrologistReview' => $t->isNephrologistReviewRequired(),
                'notes' => $t->getNotes(),
            ], $codex[$patient->getId()->toRfc4122()] ?? []);

            return $report;
        }, $patients);
    }

    /**
     * @param array<string, TrainingSession> $validatedSessions dernière séance validée, par parcours + cours
     *
     * @return array<string, mixed>
     */
    private function patientReport(Patient $patient, ?TrainingProgram $program, array $validatedSessions): array
    {
        $report = [
            'patient' => [
                'id' => $patient->getId()->toRfc4122(),
                'lastName' => $patient->getLastName(),
                'firstName' => $patient->getFirstName(),
                'dateOfBirth' => $patient->getDateOfBirth(),
                'center' => $patient->getCenter()->getName(),
                'eligibility' => Labels::ELIGIBILITY[$patient->getEligibilityStatus()->value],
            ],
            'program' => null,
            'neverStarted' => false,
            'courses' => [],
        ];

        if (null === $program) {
            return $report;
        }

        // Jamais démarré : identité, éligibilité et statut uniquement
        if ('non_demarre' === $program->getActivityStatus()) {
            $report['neverStarted'] = true;
            $report['program'] = ['status' => Labels::PROGRAM[$program->getStatus()->value]];

            return $report;
        }

        $completed = 'acheve' === $program->getStatus()->value;
        $report['program'] = [
            'status' => Labels::PROGRAM[$program->getStatus()->value],
            'completed' => $completed,
            'startedAt' => $program->getStartedAt(),
            'completedAt' => $program->getCompletedAt(),
            'validatedBy' => $program->getValidatedBy()?->getFullName(),
            'validatedCount' => $program->getValidatedCount(),
            'selectedCount' => $program->getSelectedCount(),
            'averageScore' => $program->getAverageScore(),
            'postTestScore' => $program->getPostTestScore(),
            'totalDurationSeconds' => $program->getTotalDurationSeconds(),
        ];

        $modules = $program->getModules()->toArray();
        usort($modules, static fn (ProgramModule $a, ProgramModule $b) => $a->getPosition() <=> $b->getPosition());

        foreach ($modules as $selection) {
            // Séances du parcours individualisé, plus celles validées puis désélectionnées
            if (!$selection->isSelected() && null === $selection->getValidatedAt()) {
                continue;
            }

            $module = $selection->getModule();
            $session = $validatedSessions[$program->getId()->toRfc4122().'|'.$module->getId()->toRfc4122()] ?? null;
            [$acquired, $notAcquired] = $this->competencies($session);

            $report['courses'][] = [
                'code' => $module->getCode(),
                'title' => $module->getTitle(),
                'chapter' => $module->getChapter()?->getTitle(),
                'selected' => $selection->isSelected(),
                'status' => Labels::COURSE[$selection->getStatus()],
                'score' => $selection->getScore(),
                'durationSeconds' => $selection->getDurationSeconds(),
                'validatedAt' => $selection->getValidatedAt(),
                'nurse' => $session?->getNurse()?->getFullName(),
                'competencies' => $acquired,
                'competenciesNotValidated' => $notAcquired,
            ];
        }

        return $report;
    }

    /**
     * Toutes les séances des parcours (validées, interrompues, non terminées), de la plus ancienne à la plus récente.
     *
     * @param list<TrainingProgram> $programs
     *
     * @return list<TrainingSession>
     */
    private function sessions(array $programs): array
    {
        if ([] === $programs) {
            return [];
        }

        return $this->entityManager->createQueryBuilder()
            ->select('s', 'cv', 'c')
            ->from(TrainingSession::class, 's')
            ->leftJoin('s.competencyValidations', 'cv')
            ->leftJoin('cv.competency', 'c')
            ->andWhere('s.program IN (:programs)')
            ->setParameter('programs', $programs)
            ->orderBy('s.startedAt', 'ASC')
            ->getQuery()->getResult();
    }

    /**
     * @return array{0: list<string>, 1: list<string>} compétences validées, non validées
     */
    private function competencies(?TrainingSession $session): array
    {
        $acquired = [];
        $notAcquired = [];
        foreach ($session?->getCompetencyValidations() ?? [] as $validation) {
            if ($validation->isValidated()) {
                $acquired[] = $validation->getCompetency()->getLabel();
            } else {
                $notAcquired[] = $validation->getCompetency()->getLabel();
            }
        }

        return [$acquired, $notAcquired];
    }
}
