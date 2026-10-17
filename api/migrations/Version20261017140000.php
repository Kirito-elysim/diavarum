<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Motifs de non-éligibilité (recette CODEX) : « Test CODEX anormal » en premier, puis « Troubles cognitifs autres »,
 * les autres motifs dans leur ordre actuel et « Autre (à préciser) » en dernier.
 */
final class Version20261017140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Motifs de non-éligibilité : libellés et ordre de la recette CODEX';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE eligibility_reason SET label = 'Test CODEX anormal' WHERE label = 'CODEX anormal'");
        $this->addSql("UPDATE eligibility_reason SET label = 'Troubles cognitifs autres' WHERE label = 'Troubles cognitifs sévères'");
        // Les motifs intermédiaires gardent leur ordre relatif, encadrés par les deux premiers et « Autre »
        $this->addSql("UPDATE eligibility_reason SET position = position + 10 WHERE label NOT IN ('Test CODEX anormal', 'Troubles cognitifs autres', 'Autre (à préciser)')");
        $this->addSql("UPDATE eligibility_reason SET position = 0 WHERE label = 'Test CODEX anormal'");
        $this->addSql("UPDATE eligibility_reason SET position = 1 WHERE label = 'Troubles cognitifs autres'");
        $this->addSql("UPDATE eligibility_reason SET position = 1000 WHERE label = 'Autre (à préciser)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE eligibility_reason SET label = 'CODEX anormal' WHERE label = 'Test CODEX anormal'");
        $this->addSql("UPDATE eligibility_reason SET label = 'Troubles cognitifs sévères' WHERE label = 'Troubles cognitifs autres'");
    }
}
