<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261116120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Code national : copie chiffrée (affichage aux administrateurs) et suivi des administrateurs prévenus du changement';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE national_security_code ADD code_encrypted TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE national_security_code ADD seen_by JSONB DEFAULT \'[]\' NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE national_security_code DROP code_encrypted');
        $this->addSql('ALTER TABLE national_security_code DROP seen_by');
    }
}
