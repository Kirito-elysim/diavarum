<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261015170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Vocabulaire : « parcours » au lieu de « programme » dans les intitulés des thématiques et des séances';
    }

    public function up(Schema $schema): void
    {
        foreach (['chapter' => ['title', 'description'], 'module' => ['title', 'description']] as $table => $columns) {
            foreach ($columns as $column) {
                $this->addSql("UPDATE $table SET $column = regexp_replace(regexp_replace($column, '\\mprogrammes?\\M', 'parcours', 'g'), '\\mProgrammes?\\M', 'Parcours', 'g') WHERE $column ~* '\\mprogrammes?\\M'");
            }
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE chapter SET title = 'Démarrage du programme' WHERE title = 'Démarrage du parcours'");
        $this->addSql("UPDATE chapter SET title = 'Fin du programme' WHERE title = 'Fin du parcours'");
        $this->addSql("UPDATE module SET description = replace(description, 'présentation du parcours individualisé', 'présentation du programme individualisé') WHERE code = 'S0'");
        $this->addSql("UPDATE module SET description = replace(description, 'au cours du parcours', 'au cours du programme') WHERE code = 'PT'");
    }
}
