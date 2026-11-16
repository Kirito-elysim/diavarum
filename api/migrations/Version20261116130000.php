<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261116130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Mot de passe provisoire : changement obligatoire à la prochaine connexion';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user ADD must_change_password BOOLEAN DEFAULT false NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user DROP must_change_password');
    }
}
