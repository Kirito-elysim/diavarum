<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\CodexTest;
use App\Exception\WorkflowException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Enregistrement d'un test CODEX : validation du protocole.
 * L'orientation n'est proposée qu'en cas d'échec à une seule des deux épreuves ;
 * l'éligibilité reste une décision de l'IDE, enregistrée ensuite sur le patient.
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
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): CodexTest
    {
        if (!in_array($data->getWords(), CodexTest::WORD_LISTS, true) || '05:10' !== $data->getClockTime()) {
            throw new WorkflowException('Utilisez une liste de mots du protocole et l’heure 05:10.');
        }
        $checks = $data->getClockChecks();
        if (null === $checks || !array_is_list($checks) || 4 !== count($checks) || count(array_filter($checks, 'is_bool')) !== 4) {
            throw new WorkflowException('Répondez oui ou non aux quatre critères de l’horloge.');
        }
        $data->setClockTestPassed(!in_array(false, $checks, true));
        $answers = $data->getOrientationAnswers();
        if ($data->isClockTestPassed() !== $data->isWordRecallPassed()) {
            if (null === $answers || !array_is_list($answers) || 5 !== count($answers) || count(array_filter($answers, static fn ($a) => in_array($a, [0, 1], true))) !== 5) {
                throw new WorkflowException('Les cinq questions d’orientation doivent être cotées 0 ou 1.');
            }
        } elseif (null !== $answers) {
            throw new WorkflowException('L’orientation ne doit être renseignée qu’en cas d’échec à une seule épreuve.');
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
