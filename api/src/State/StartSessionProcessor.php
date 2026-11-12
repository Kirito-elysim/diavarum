<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\TrainingSession;
use App\Training\TrainingWorkflow;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Lancement d'une séance (POST /api/sessions) : applique les règles du parcours avant d'enregistrer.
 *
 * @implements ProcessorInterface<TrainingSession, TrainingSession>
 */
final class StartSessionProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<TrainingSession, TrainingSession> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly TrainingWorkflow $workflow,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): TrainingSession
    {
        return $this->entityManager->getConnection()->transactional(function () use ($data, $operation, $uriVariables, $context): TrainingSession {
            $this->workflow->start($data);

            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        });
    }
}
