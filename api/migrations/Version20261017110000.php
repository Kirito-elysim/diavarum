<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Séance 12 : les 6 critères d'évaluation du guide IDE EHD (6 compétences au plus par séance désormais).
 * Le critère fusionné est archivé : une évaluation déjà faite est conservée.
 */
final class Version20261017110000 extends AbstractMigration
{
    private const MERGED = 'Le patient identifie les principales catégories de médicaments et comprend leur rôle';

    private const S12 = [
        'Le patient identifie les principales catégories de médicaments',
        'Le patient comprend le rôle de ses médicaments',
        'Le patient connaît les règles de bonne observance',
        'Le patient comprend le rôle du phosphore et du calcium',
        'Le patient connaît les principes alimentaires adaptés',
        'Le patient sait identifier un effet indésirable',
    ];

    public function getDescription(): string
    {
        return 'Séance 12 : les 6 compétences du guide IDE';
    }

    public function up(Schema $schema): void
    {
        $module = "(SELECT id FROM module WHERE code = 'S12')";
        $this->addSql("UPDATE module_competency SET archived_at = NOW() WHERE module_id = $module AND archived_at IS NULL AND label = :label", ['label' => self::MERGED]);
        foreach (self::S12 as $position => $label) {
            $this->addSql("UPDATE module_competency SET position = :position WHERE module_id = $module AND archived_at IS NULL AND label = :label", ['position' => $position, 'label' => $label]);
            $this->addSql(
                "INSERT INTO module_competency (id, module_id, label, position)
                 SELECT gen_random_uuid(), m.id, :label, :position FROM module m
                 WHERE m.code = 'S12' AND NOT EXISTS (
                     SELECT 1 FROM module_competency mc WHERE mc.module_id = m.id AND mc.archived_at IS NULL AND mc.label = :label
                 )",
                ['label' => $label, 'position' => $position],
            );
        }
    }

    public function down(Schema $schema): void
    {
        $module = "(SELECT id FROM module WHERE code = 'S12')";
        $this->addSql("UPDATE module_competency SET archived_at = NOW() WHERE module_id = $module AND archived_at IS NULL AND label IN (:a, :b)", ['a' => self::S12[0], 'b' => self::S12[1]]);
        $this->addSql(
            "INSERT INTO module_competency (id, module_id, label, position) SELECT gen_random_uuid(), m.id, :label, 0 FROM module m WHERE m.code = 'S12'",
            ['label' => self::MERGED],
        );
    }
}
