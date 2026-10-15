<?php

namespace App\Reporting;

use App\Entity\Patient;
use App\Entity\ProgramModule;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\SessionStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Bilan d'un patient (cahier des charges §3) : statut du parcours, puis pour chaque séance du parcours
 * son statut, et pour chaque séance validée : score, durée, date et heure, compétences validées.
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

        $validatedSessions = $this->latestValidatedSessions(array_values($programs));

        return array_map(fn (Patient $patient) => $this->patientReport(
            $patient,
            $programs[$patient->getId()->toRfc4122()] ?? null,
            $validatedSessions,
        ), $patients);
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
            'courses' => [],
        ];

        if (null === $program) {
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
                'competencies' => $acquired,
                'competenciesNotValidated' => $notAcquired,
            ];
        }

        return $report;
    }

    /**
     * @param list<TrainingProgram> $programs
     *
     * @return array<string, TrainingSession>
     */
    private function latestValidatedSessions(array $programs): array
    {
        if ([] === $programs) {
            return [];
        }

        $sessions = $this->entityManager->createQueryBuilder()
            ->select('s', 'cv', 'c')
            ->from(TrainingSession::class, 's')
            ->leftJoin('s.competencyValidations', 'cv')
            ->leftJoin('cv.competency', 'c')
            ->andWhere('s.program IN (:programs)')
            ->andWhere('s.status = :validated')
            ->setParameter('programs', $programs)
            ->setParameter('validated', SessionStatus::Validated)
            ->orderBy('s.completedAt', 'ASC')
            ->getQuery()->getResult();

        $latest = [];
        foreach ($sessions as $session) {
            $latest[$session->getProgram()->getId()->toRfc4122().'|'.$session->getModule()->getId()->toRfc4122()] = $session;
        }

        return $latest;
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
