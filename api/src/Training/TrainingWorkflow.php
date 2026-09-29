<?php

namespace App\Training;

use App\Entity\InterruptionReason;
use App\Entity\SessionCompetencyValidation;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\ProgramStatus;
use App\Enum\SessionStatus;
use App\Exception\WorkflowException;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Règles du déroulement d'un programme d'entraînement (cahier des charges §2 à §4).
 */
final class TrainingWorkflow
{
    /** Garde-fou : une séance dure 30 à 40 min, on refuse les durées absurdes */
    private const MAX_DURATION_SECONDS = 6 * 3600;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ScoreCalculator $scoreCalculator,
    ) {
    }

    /**
     * Lancement d'une séance depuis le parcours du patient : le cours est considéré commencé.
     * Une séance restée ouverte pour ce patient est interrompue (une seule séance à la fois).
     */
    public function start(TrainingSession $session): void
    {
        $patient = $session->getPatient();
        $program = $session->getProgram();
        $module = $session->getModule();

        if (!$patient->getId()->equals($program->getPatient()->getId())) {
            throw new WorkflowException('Ce programme n\'est pas celui du patient.');
        }
        if (EligibilityStatus::Eligible !== $patient->getEligibilityStatus()) {
            throw new WorkflowException('Le patient n\'est pas éligible au programme.');
        }
        if (!$program->acceptsSessions()) {
            throw new WorkflowException(ProgramStatus::Completed === $program->getStatus()
                ? 'Le programme est achevé.'
                : 'Le programme est interrompu : reprenez-le avant de lancer une séance.');
        }

        $selection = $program->findModule($module);
        if (null === $selection || !$selection->isSelected()) {
            throw new WorkflowException('Ce cours ne fait pas partie des séances sélectionnées du parcours.');
        }

        $openSessions = $this->entityManager->getRepository(TrainingSession::class)->findBy([
            'patient' => $patient,
            'status' => SessionStatus::InProgress,
        ]);
        foreach ($openSessions as $open) {
            $open->markInterrupted();
        }

        $selection->markStarted();
        $program->markActive();
    }

    /**
     * « Terminer le cours » : l'IDE valide la séance. Durée, score et compétences sont enregistrés.
     *
     * @param list<array{blockId: string, correct: int, total: int}> $answers
     * @param array<string, bool>                                    $competencies identifiant de compétence => validée
     */
    public function validate(TrainingSession $session, int $durationSeconds, array $answers, array $competencies, User $nurse): void
    {
        $this->assertInProgress($session);
        if ($durationSeconds < 0 || $durationSeconds > self::MAX_DURATION_SECONDS) {
            throw new WorkflowException('Durée de séance invalide.');
        }

        $module = $session->getModule();
        $expected = [];
        foreach ($module->getCompetencies() as $competency) {
            $expected[$competency->getId()->toRfc4122()] = $competency;
        }
        if ([] !== array_diff_key($competencies, $expected)) {
            throw new WorkflowException('Une compétence ne fait pas partie de ce cours.');
        }
        if (\count($competencies) !== \count($expected)) {
            throw new WorkflowException('Chaque compétence du cours doit être évaluée (validée ou non).');
        }

        $score = $this->scoreCalculator->score($module, $answers);
        $session->markValidated($durationSeconds, $score, $answers);

        foreach ($competencies as $id => $validated) {
            $validation = (new SessionCompetencyValidation())->setCompetency($expected[$id])->setValidated($validated);
            $validation->setAuthor($nurse);
            $session->addCompetencyValidation($validation);
        }

        // Le cours passe « validé » dans le programme (même s'il a été désélectionné depuis)
        $session->getProgram()->findModule($module)?->markValidated($score, $durationSeconds);
        $this->entityManager->flush();
    }

    public function interrupt(TrainingSession $session): void
    {
        $this->assertInProgress($session);
        $session->markInterrupted();
        $this->entityManager->flush();
    }

    /** Validation du programme par un cadre : le programme passe « achevé » et n'est plus modifiable */
    public function complete(TrainingProgram $program, User $cadre): void
    {
        if (ProgramStatus::Active !== $program->getStatus()) {
            throw new WorkflowException('Seul un programme en cours peut être validé.');
        }
        if (0 === $program->getValidatedCount()) {
            throw new WorkflowException('Aucune séance n\'a encore été validée.');
        }

        $this->interruptOpenSessions($program);
        $program->markCompleted($cadre);
        $this->entityManager->flush();
    }

    /**
     * Clôture anticipée d'un programme non achevé, justifiée par des motifs cochés (+ texte libre).
     *
     * @param list<InterruptionReason> $reasons
     */
    public function interruptProgram(TrainingProgram $program, array $reasons, ?string $notes, User $by): void
    {
        if (!$program->acceptsSessions()) {
            throw new WorkflowException('Ce programme est déjà achevé ou interrompu.');
        }
        if ([] === $reasons) {
            throw new WorkflowException('Indiquez au moins un motif d\'interruption.');
        }

        $this->interruptOpenSessions($program);
        $program->markInterrupted($by, $reasons, $notes);
        $this->entityManager->flush();
    }

    public function resumeProgram(TrainingProgram $program): void
    {
        if (ProgramStatus::Interrupted !== $program->getStatus()) {
            throw new WorkflowException('Seul un programme interrompu peut être repris.');
        }

        $program->resume();
        $this->entityManager->flush();
    }

    private function assertInProgress(TrainingSession $session): void
    {
        if (!$session->isInProgress()) {
            throw new WorkflowException('Cette séance est déjà terminée.');
        }
    }

    private function interruptOpenSessions(TrainingProgram $program): void
    {
        $open = $this->entityManager->getRepository(TrainingSession::class)->findBy([
            'program' => $program,
            'status' => SessionStatus::InProgress,
        ]);
        foreach ($open as $session) {
            $session->markInterrupted();
        }
    }
}
