<?php

declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
final class Version20261012120000 extends AbstractMigration
{
    public function getDescription(): string { return 'CODEX : critères horloge et réponses orientation, anciens tests conservés'; }
    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE codex_test ADD clock_checks JSONB DEFAULT NULL, ADD orientation_answers JSONB DEFAULT NULL');
    }
    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE codex_test DROP clock_checks, DROP orientation_answers');
    }
}
