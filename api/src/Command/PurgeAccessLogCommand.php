<?php

namespace App\Command;

use App\Import\ImportArchive;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Purge des entrées anciennes du journal des accès et des fichiers d'import conservés, selon la durée de conservation retenue
 * (à fixer avec le DPO de Diaverum). À planifier, par exemple chaque nuit :
 *   bin/console app:access-log:purge --days=365
 */
#[AsCommand(name: 'app:access-log:purge', description: 'Supprime les entrées du journal des accès plus anciennes que N jours')]
final class PurgeAccessLogCommand
{
    public function __construct(
        private readonly Connection $connection,
        private readonly ImportArchive $imports,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Option('Durée de conservation en jours')] int $days = 365): int
    {
        if ($days < 30) {
            $io->error('Durée de conservation trop courte (30 jours minimum).');

            return Command::INVALID;
        }

        $limit = new \DateTimeImmutable("-$days days");
        $deleted = $this->connection->executeStatement(
            'DELETE FROM access_log WHERE occurred_at < :limit',
            ['limit' => $limit->format('Y-m-d H:i:sP')],
        );
        $files = $this->imports->purge($limit);
        $io->success(\sprintf('%d entrée(s) et %d fichier(s) d\'import de plus de %d jours supprimé(s).', $deleted, $files, $days));

        return Command::SUCCESS;
    }
}
