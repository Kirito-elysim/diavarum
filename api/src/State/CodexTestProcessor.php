<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\CodexTest;
use App\Entity\CodexWord;
use App\Exception\WorkflowException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Enregistrement d'un test CODEX : les 3 mots doivent être distincts et provenir de la pioche.
 *
 * @implements ProcessorInterface<CodexTest, CodexTest>
 */
final class CodexTestProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<CodexTest, CodexTest> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): CodexTest
    {
        $pioche = array_map(
            static fn (CodexWord $w) => $w->getWord(),
            $this->entityManager->getRepository(CodexWord::class)->findBy(['active' => true]),
        );
        $words = $data->getWords();

        if (\count(array_unique($words)) !== \count($words) || [] !== array_diff($words, $pioche)) {
            throw new WorkflowException('Les 3 mots doivent être distincts et tirés de la pioche du test CODEX.');
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
