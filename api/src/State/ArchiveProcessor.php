<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Center;
use App\Entity\Contract\ArchivableInterface;
use App\Entity\Patient;
use App\Exception\WorkflowException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * DELETE « logique » : archive la ressource au lieu de l'effacer, pour conserver
 * l'historique des séances (traçabilité CPAM).
 *
 * @implements ProcessorInterface<ArchivableInterface, null>
 */
final class ArchiveProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<ArchivableInterface, ArchivableInterface> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): null
    {
        if ($data instanceof Center && $this->entityManager->getRepository(Patient::class)->count(['center' => $data, 'removedAt' => null]) > 0) {
            throw new WorkflowException('Des patients sont encore suivis dans ce centre : transférez-les ou sortez-les de la file active avant de l\'archiver.');
        }

        $data->archive();
        $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        return null;
    }
}
