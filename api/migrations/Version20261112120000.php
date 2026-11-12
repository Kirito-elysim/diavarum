<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261112120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Dernière activité du parcours : lancement ou validation, avec reprise de l’historique';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE training_program ADD last_activity_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
        $this->addSql('UPDATE training_program p SET last_activity_at = GREATEST(p.started_at, (SELECT MAX(s.started_at) FROM training_session s WHERE s.program_id = p.id), (SELECT MAX(s.completed_at) FROM training_session s WHERE s.program_id = p.id AND s.status = \'validee\'), (SELECT MAX(m.started_at) FROM program_module m WHERE m.program_id = p.id), (SELECT MAX(m.validated_at) FROM program_module m WHERE m.program_id = p.id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE training_program DROP last_activity_at');
    }
}
