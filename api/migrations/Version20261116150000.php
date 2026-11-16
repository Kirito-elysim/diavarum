<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Retrait de la séance S0 (« Profil clinique du patient – Éligibilité aux thématiques ») : archivée, donc absente de la
 * bibliothèque et des nouveaux parcours. Dans les parcours existants, elle n'est retirée que si elle n'a jamais été lancée ;
 * une séance déjà lancée reste attachée au parcours pour l'historique.
 */
final class Version20261116150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Archive la séance S0 et la retire des parcours où elle n\'a jamais été lancée';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE module SET archived_at = NOW() WHERE code = 'S0' AND archived_at IS NULL");
        $this->addSql(<<<'SQL'
            DELETE FROM program_module pm USING module m
            WHERE pm.module_id = m.id AND m.code = 'S0'
              AND NOT EXISTS (SELECT 1 FROM training_session s WHERE s.program_id = pm.program_id AND s.module_id = m.id)
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE module SET archived_at = NULL WHERE code = 'S0'");
    }
}
