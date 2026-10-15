<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261015134449 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Centres : FINESS, adresse, région, contact et nombre de postes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE center ADD finess VARCHAR(9) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD address VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD postal_code VARCHAR(5) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD region VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD phone VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD email VARCHAR(180) DEFAULT NULL');
        $this->addSql('ALTER TABLE center ADD stations INT DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_40F0EB24A3B6DB90 ON center (finess)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_40F0EB24A3B6DB90');
        $this->addSql('ALTER TABLE center DROP finess');
        $this->addSql('ALTER TABLE center DROP address');
        $this->addSql('ALTER TABLE center DROP postal_code');
        $this->addSql('ALTER TABLE center DROP region');
        $this->addSql('ALTER TABLE center DROP phone');
        $this->addSql('ALTER TABLE center DROP email');
        $this->addSql('ALTER TABLE center DROP stations');
    }
}
