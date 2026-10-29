<?php

namespace App\Command;

use App\Entity\Module;
use App\Training\ContentValidator;
use App\Training\ModuleContentImporter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:content:reference', description: 'Crée le cours de référence S99 sans remplacer un cours existant')]
final class CreateReferenceCourseCommand
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ContentValidator $validator,
        private readonly ModuleContentImporter $importer,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        if (null !== $this->entityManager->getRepository(Module::class)->findOneBy(['code' => 'S99'])) {
            $io->note('S99 existe déjà : aucun contenu remplacé. Utilisez le constructeur pour le modifier.');

            return Command::SUCCESS;
        }
        $data = json_decode((string) file_get_contents(\dirname(__DIR__, 2).'/content/S99.json'), true, flags: \JSON_THROW_ON_ERROR);
        $errors = $this->validator->validate($data['content']);
        if ([] !== $errors) {
            $io->error($errors);

            return Command::FAILURE;
        }
        $module = (new Module())->setCode('S99')->setPosition(999)->setMandatory(false)->setPublished(false);
        $this->entityManager->persist($module);
        $errors = $this->importer->import($module, $data['title'], $data['description'], $data['estimatedDuration'], false, $data['content'], []);
        if ([] !== $errors) {
            $io->error($errors);

            return Command::FAILURE;
        }
        $io->success(\sprintf('S99 créé : %d écrans, non publié, accessible dans Contenus des séances.', \count($module->getContent())));

        return Command::SUCCESS;
    }
}
