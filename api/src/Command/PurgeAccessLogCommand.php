<?php

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Purge des entrées anciennes du journal des accès, selon la durée de conservation retenue
 * (à fixer avec le DPO de Diaverum). À planifier, par exemple chaque nuit :
 *   bin/console app:access-log:purge --days=365
 */
#[AsCommand(name: 'app:access-log:purge', description: 'Supprime les entrées du journal des accès plus anciennes que N jours')]
final class PurgeAccessLogCommand
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function __invoke(SymfonyStyle $io, #[Option('Durée de conservation en jours')] int $days = 365): int
    {
        if ($days < 30) {
            $io->error('Durée de conservation trop courte (30 jours minimum).');

            return Command::INVALID;
        }

        $deleted = $this->connection->executeStatement(
            'DELETE FROM access_log WHERE occurred_at < :limit',
            ['limit' => (new \DateTimeImmutable("-$days days"))->format('Y-m-d H:i:sP')],
        );
        $io->success(\sprintf('%d entrée(s) de plus de %d jours supprimée(s).', $deleted, $days));

        return Command::SUCCESS;
    }
}
