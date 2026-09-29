<?php

namespace App\Command;

use App\Training\ModuleContentImporter;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Importe le contenu de séances depuis des fichiers JSON (format de l'API d'intégration), par exemple :
 *   bin/console app:content:import content/S1.json
 * Mêmes contrôles que l'API : un fichier invalide n'est pas enregistré.
 */
#[AsCommand(name: 'app:content:import', description: 'Importe le contenu de séances depuis des fichiers JSON')]
final class ImportContentCommand
{
    public function __construct(private readonly ModuleContentImporter $importer)
    {
    }

    /**
     * @param list<string> $files
     */
    public function __invoke(SymfonyStyle $io, #[Argument('Fichiers JSON (un par séance)')] array $files): int
    {
        $failed = false;
        foreach ($files as $file) {
            try {
                $data = json_decode((string) file_get_contents($file), true, flags: \JSON_THROW_ON_ERROR);
                $module = $this->importer->find((string) ($data['code'] ?? ''));
                $errors = $this->importer->import(
                    $module,
                    (string) ($data['title'] ?? $module->getTitle()),
                    (string) ($data['description'] ?? ''),
                    (int) ($data['estimatedDuration'] ?? $module->getEstimatedDuration()),
                    (bool) ($data['published'] ?? true),
                    $data['content'] ?? [],
                    $data['competencies'] ?? [],
                );
            } catch (\Throwable $e) {
                $errors = [$e->getMessage()];
            }

            if ([] === $errors) {
                $io->success(\sprintf('%s : séance %s importée (%d pages).', $file, $module->getCode(), \count($module->getContent())));
            } else {
                $failed = true;
                $io->error([\sprintf('%s : non importé.', $file), ...$errors]);
            }
        }

        return $failed ? Command::FAILURE : Command::SUCCESS;
    }
}
