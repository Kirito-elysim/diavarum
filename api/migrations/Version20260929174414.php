<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Journal des accès (traçabilité RGPD / HDS).
 */
final class Version20260929174414 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Journal des accès';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE access_log (id UUID NOT NULL, occurred_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, user_id UUID DEFAULT NULL, user_email VARCHAR(180) DEFAULT NULL, action VARCHAR(20) NOT NULL, method VARCHAR(10) NOT NULL, path VARCHAR(255) NOT NULL, resource_type VARCHAR(50) DEFAULT NULL, resource_id VARCHAR(36) DEFAULT NULL, status_code INT NOT NULL, ip VARCHAR(45) DEFAULT NULL, user_agent VARCHAR(255) DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_EF7F351087C03D1B ON access_log (occurred_at)');
        $this->addSql('CREATE INDEX IDX_EF7F351083FEF79389329D25 ON access_log (resource_type, resource_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE access_log');
    }
}
