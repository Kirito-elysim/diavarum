<?php

namespace App\Command;

use App\Training\ModuleContentImporter;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Exporte le contenu de séances de la base vers des fichiers JSON (retouches faites dans l'éditeur comprises), par exemple :
 *   bin/console app:content:export S1 S2
 * Le fichier content/<code>.json est ensuite versionné puis réimporté en production avec app:content:import.
 */
#[AsCommand(name: 'app:content:export', description: 'Exporte le contenu de séances de la base vers content/<code>.json')]
final class ExportContentCommand
{
    public function __construct(private readonly ModuleContentImporter $importer)
    {
    }

    /**
     * @param list<string> $codes
     */
    public function __invoke(
        SymfonyStyle $io,
        #[Argument('Codes de séances (S1, S2…)')] array $codes,
        #[Option('Dossier de destination')] string $dir = 'content',
    ): int {
        foreach ($codes as $code) {
            $data = $this->importer->export($this->importer->find($code));
            $file = \sprintf('%s/%s.json', rtrim($dir, '/'), $data['code']);
            file_put_contents($file, json_encode($data, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES)."\n");
            $io->success(\sprintf('%s : %d pages exportées vers %s.', $data['code'], \count($data['content']), $file));
        }

        return Command::SUCCESS;
    }
}
