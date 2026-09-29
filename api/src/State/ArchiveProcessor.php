<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Contract\ArchivableInterface;
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
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): null
    {
        $data->archive();
        $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        return null;
    }
}
