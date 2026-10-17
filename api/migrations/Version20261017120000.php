<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Motif de non-éligibilité « CODEX anormal » toujours disponible : l'écran de fin du test le présélectionne.
 */
final class Version20261017120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Motif de non-éligibilité « CODEX anormal »';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            "INSERT INTO eligibility_reason (id, label, position, active)
             SELECT gen_random_uuid(), 'CODEX anormal', COALESCE(MAX(position), -1) + 1, true FROM eligibility_reason
             HAVING NOT EXISTS (SELECT 1 FROM eligibility_reason WHERE label = 'CODEX anormal')"
        );
        $this->addSql("UPDATE eligibility_reason SET active = true WHERE label = 'CODEX anormal'");
    }

    public function down(Schema $schema): void
    {
    }
}
