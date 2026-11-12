<?php

namespace App\Controller;

use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use App\Import\CenterResolver;
use App\Service\PatientDuplicates;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Vérification préalable à la création manuelle d'un patient : erreurs bloquantes et avertissements,
 * sur les seuls centres de l'utilisateur. Rien n'est créé.
 */
#[IsGranted('ROLE_IDE')]
final class PatientDuplicateController
{
    public function __construct(private readonly CenterResolver $centers, private readonly PatientDuplicates $duplicates)
    {
    }

    #[Route('/api/patient-duplicates', name: 'api_patient_duplicates', methods: ['GET'])]
    public function __invoke(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $allowed = $this->centers->allowedCenters($user);
        $center = array_values(array_filter($allowed, static fn (Center $c) => $c->getId()->toRfc4122() === $request->query->getString('center')))[0]
            ?? throw new BadRequestHttpException('Centre hors de votre périmètre.');

        $birth = $request->query->getString('dateOfBirth');
        $patient = (new Patient())->setLastName($request->query->getString('lastName'))->setFirstName($request->query->getString('firstName'));
        if ('' !== $birth) {
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $birth);
            false === $date ? throw new BadRequestHttpException('Date de naissance invalide.') : $patient->setDateOfBirth($date);
        }

        return new JsonResponse($this->duplicates->inspect($this->duplicates->index($allowed), $patient, $center));
    }
}
