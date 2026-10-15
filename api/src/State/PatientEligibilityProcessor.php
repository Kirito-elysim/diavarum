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

/** @implements ProcessorInterface<Patient, Patient> */
final class PatientEligibilityProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Patient
    {
        $latest = $this->entityManager->getRepository(CodexTest::class)->findOneBy(['patient' => $data], ['createdAt' => 'DESC']);
        if ($latest?->isNephrologistReviewRequired() && EligibilityStatus::NotEligible !== $data->getEligibilityStatus()) {
            throw new WorkflowException('Le dernier CODEX est anormal : le patient n’est pas éligible au parcours. Transmettez le résultat au néphrologue.');
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
