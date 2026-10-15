<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Module;
use App\Entity\TrainingProgram;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Création d'un parcours : tous les cours publiés y sont ajoutés, les systématiques
 * pré-cochés et les optionnels à cocher par l'IDE (cahier des charges §2).
 *
 * @implements ProcessorInterface<TrainingProgram, TrainingProgram>
 */
final class TrainingProgramProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<TrainingProgram, TrainingProgram> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): TrainingProgram
    {
        $modules = $this->entityManager->getRepository(Module::class)->findBy(['published' => true, 'archivedAt' => null], ['position' => 'ASC']);
        foreach ($modules as $module) {
            $data->addModule($module);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
