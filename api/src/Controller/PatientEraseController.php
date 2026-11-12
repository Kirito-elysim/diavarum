<?php

namespace App\Controller;

use App\Dto\ErasePatientRequest;
use App\Entity\Patient;
use App\EventListener\AccessLogSubscriber;
use App\Service\PatientEraser;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Suppression définitive d'un patient archivé : cadre ou administrateur national, dans leurs centres,
 * avec saisie de confirmation. Seule une ligne d'audit sans donnée de santé est conservée.
 */
final class PatientEraseController
{
    public function __construct(private readonly PatientEraser $eraser)
    {
    }

    #[Route('/api/patients/{id}/erase', name: 'api_patient_erase', methods: ['POST'])]
    #[IsGranted('ROLE_CADRE')]
    #[IsGranted('CENTER_SCOPE', subject: 'patient')]
    public function __invoke(
        Patient $patient,
        #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] ErasePatientRequest $payload,
        Request $request,
    ): Response {
        $id = $patient->getId()->toRfc4122();
        $center = $patient->getCenter()->getName();
        $counts = $this->eraser->erase($patient, $payload->confirmation);

        $request->attributes->set(AccessLogSubscriber::OVERRIDE, [
            'action' => 'delete',
            'resourceType' => 'patient',
            'resourceId' => $id,
            'detail' => \sprintf('Suppression définitive · %s · %d parcours · %d séances · %d tests CODEX', $center, $counts['programs'], $counts['sessions'], $counts['codexTests']),
        ]);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
