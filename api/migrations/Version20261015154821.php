<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261015154821 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Journal des accès : détail lisible ; fichiers d\'import conservés';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE import_file (id UUID NOT NULL, imported_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, type VARCHAR(20) NOT NULL, original_name VARCHAR(255) NOT NULL, stored_name VARCHAR(64) NOT NULL, size INT NOT NULL, sha256 VARCHAR(64) NOT NULL, created_count INT NOT NULL, imported_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_61B3D890DFD377A1 ON import_file (imported_at)');
        $this->addSql('CREATE INDEX IDX_61B3D89074953CEA ON import_file (imported_by_id)');
        $this->addSql('ALTER TABLE import_file ADD CONSTRAINT FK_61B3D89074953CEA FOREIGN KEY (imported_by_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE access_log ADD detail VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE import_file DROP CONSTRAINT FK_61B3D89074953CEA');
        $this->addSql('DROP TABLE import_file');
        $this->addSql('ALTER TABLE access_log DROP detail');
    }
}
