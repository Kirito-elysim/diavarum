<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Suivi des séances dans le parcours (non démarrée / non terminée / validée, score, durée) ;
 * une séance appartient toujours à un programme.
 */
final class Version20260929154231 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Suivi des séances dans le parcours';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE program_module ADD started_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE program_module ADD validated_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE program_module ADD score INT DEFAULT NULL');
        $this->addSql('ALTER TABLE program_module ADD duration_seconds INT DEFAULT NULL');
        $this->addSql('ALTER TABLE training_session ALTER program_id SET NOT NULL');
        $this->addSql('ALTER TABLE program_module ADD CONSTRAINT chk_program_module_score CHECK (score IS NULL OR score BETWEEN 0 AND 100)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE program_module DROP CONSTRAINT chk_program_module_score');
        $this->addSql('ALTER TABLE program_module DROP started_at');
        $this->addSql('ALTER TABLE program_module DROP validated_at');
        $this->addSql('ALTER TABLE program_module DROP score');
        $this->addSql('ALTER TABLE program_module DROP duration_seconds');
        $this->addSql('ALTER TABLE training_session ALTER program_id DROP NOT NULL');
    }
}
