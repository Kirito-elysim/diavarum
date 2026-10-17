<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Date à laquelle l'éligibilité du patient a été statuée.
 * Inconnue pour les décisions antérieures : la colonne reste vide plutôt que d'afficher une date approximative.
 */
final class Version20261017130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Patient : date de la décision d’éligibilité';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE patient ADD eligibility_decided_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE patient DROP eligibility_decided_at');
    }
}
