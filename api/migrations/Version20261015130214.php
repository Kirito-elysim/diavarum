<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261015130214 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Archivage (soft delete) des cours, thématiques et compétences';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chapter ADD archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE module ADD archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE module_competency ADD archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chapter DROP archived_at');
        $this->addSql('ALTER TABLE module DROP archived_at');
        $this->addSql('ALTER TABLE module_competency DROP archived_at');
    }
}
