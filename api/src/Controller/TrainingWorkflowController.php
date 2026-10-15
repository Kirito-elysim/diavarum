<?php

namespace App\Controller;

use App\Dto\InterruptProgramRequest;
use App\Dto\ValidateSessionRequest;
use App\Entity\InterruptionReason;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Training\TrainingWorkflow;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Actions du déroulement d'une séance et d'un parcours. Chaque action vérifie que la ressource
 * relève d'un centre de l'utilisateur (CENTER_SCOPE) ; les règles métier sont dans TrainingWorkflow.
 */
#[IsGranted('ROLE_IDE')]
final class TrainingWorkflowController
{
    public function __construct(private readonly TrainingWorkflow $workflow)
    {
    }

    /** « Terminer le cours » : seule une séance validée compte (durée, score, compétences) */
    #[Route('/api/sessions/{id}/validate', name: 'api_session_validate', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    #[IsGranted('CENTER_SCOPE', subject: 'session')]
    public function validateSession(
        #[MapEntity] TrainingSession $session,
        #[MapRequestPayload] ValidateSessionRequest $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $this->workflow->validate($session, $request->durationSeconds, $request->answers, $request->competencyMap(), $user);

        return new JsonResponse([
            'status' => $session->getStatus()->value,
            'score' => $session->getScore(),
            'durationSeconds' => $session->getDurationSeconds(),
        ]);
    }

    /** Séance quittée sans validation : rien n'est comptabilisé, le cours sera à reprendre du début */
    #[Route('/api/sessions/{id}/interrupt', name: 'api_session_interrupt', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    #[IsGranted('CENTER_SCOPE', subject: 'session')]
    public function interruptSession(#[MapEntity] TrainingSession $session): JsonResponse
    {
        $this->workflow->interrupt($session);

        return new JsonResponse(['status' => $session->getStatus()->value]);
    }

    /** Validation du parcours par un cadre de service */
    #[Route('/api/training_programs/{id}/complete', name: 'api_program_complete', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    #[IsGranted('ROLE_CADRE')]
    #[IsGranted('CENTER_SCOPE', subject: 'program')]
    public function completeProgram(#[MapEntity] TrainingProgram $program, #[CurrentUser] User $user): JsonResponse
    {
        $this->workflow->complete($program, $user);

        return new JsonResponse(['status' => $program->getStatus()->value]);
    }

    /** Clôture anticipée d'un parcours, avec motifs */
    #[Route('/api/training_programs/{id}/interrupt', name: 'api_program_interrupt', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    #[IsGranted('CENTER_SCOPE', subject: 'program')]
    public function interruptProgram(
        #[MapEntity] TrainingProgram $program,
        #[MapRequestPayload] InterruptProgramRequest $request,
        #[CurrentUser] User $user,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $reasons = $entityManager->getRepository(InterruptionReason::class)->findBy(['id' => $request->reasons, 'active' => true]);
        $this->workflow->interruptProgram($program, $reasons, $request->notes, $user);

        return new JsonResponse(['status' => $program->getStatus()->value]);
    }

    #[Route('/api/training_programs/{id}/resume', name: 'api_program_resume', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    #[IsGranted('CENTER_SCOPE', subject: 'program')]
    public function resumeProgram(#[MapEntity] TrainingProgram $program): JsonResponse
    {
        $this->workflow->resumeProgram($program);

        return new JsonResponse(['status' => $program->getStatus()->value]);
    }
}
