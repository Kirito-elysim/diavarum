<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\CodexTest;
use App\Entity\Patient;
use App\Enum\EligibilityStatus;
use App\Exception\WorkflowException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Modification d'un patient : on ne le déclare « éligible » qu'après son test CODEX.
 * Un patient déjà éligible (dossier antérieur à la règle) le reste.
 *
 * @implements ProcessorInterface<Patient, Patient>
 */
final class PatientProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<Patient, Patient> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Patient
    {
        $previous = $context['previous_data'] ?? null;
        $becomesEligible = EligibilityStatus::Eligible === $data->getEligibilityStatus()
            && $previous instanceof Patient && EligibilityStatus::Eligible !== $previous->getEligibilityStatus();
        if ($becomesEligible && 0 === $this->entityManager->getRepository(CodexTest::class)->count(['patient' => $data])) {
            throw new WorkflowException('Le test CODEX doit être passé avant de déclarer le patient éligible.');
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
