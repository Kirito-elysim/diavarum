<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Post-test de fin de programme (« Fin du programme » dans doc/Liste-seances.pdf) : séance d'évaluation
 * finale, code PT, sélectionnée par défaut.
 */
final class Version20260929173827 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Post-test de fin de programme';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("INSERT INTO chapter (id, title, description, position) VALUES ('5fc61609-1e05-58a3-ad77-2114f45f9ce0', 'Fin du programme', 'Évaluation finale des connaissances.', 9)");
        $this->addSql("INSERT INTO module (id, code, position, title, description, chapter_id, estimated_duration, mandatory, intro, published, content, created_at, updated_at) VALUES ('69aea0ec-6dc3-54f5-bcb3-fb5046e2ca31', 'PT', 32, 'Post-test', 'Évaluation finale des connaissances acquises au cours du programme.', '5fc61609-1e05-58a3-ad77-2114f45f9ce0', 30, true, false, true, '[]', NOW(), NOW())");

    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM module WHERE code = 'PT'");
        $this->addSql("DELETE FROM chapter WHERE id = '5fc61609-1e05-58a3-ad77-2114f45f9ce0'");

    }
}
