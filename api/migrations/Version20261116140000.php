<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Intitulés définitifs des séances S1 à S16, fournis par Diaverum. */
final class Version20261116140000 extends AbstractMigration
{
    private const TITLES = [
        'S1' => 'Droits et devoirs du patient – Personne de confiance et directives anticipées',
        'S2' => 'Hygiène au centre de dialyse',
        'S3' => 'Confort et sécurité en séance de dialyse',
        'S4' => 'Insuffisance rénale chronique terminale (IRCT) et hémodialyse',
        'S5' => 'Traitements de suppléance rénale : Hémodialyse à domicile - Dialyse péritonéale - Greffe',
        'S6' => 'Voies d’abord en hémodialyse : fistule artérioveineuse (FAV) et cathéter veineux central (CVC)',
        'S7' => 'Bonnes pratiques et préservation de la FAV',
        'S8' => 'Complications des voies d’abord (FAV et CVC) et leurs conduites à tenir',
        'S9' => 'Notion de poids sec et équilibre hydrique',
        'S10' => 'Gestion de la tension artérielle et de l’automesure',
        'S11' => 'Surveillance biologique',
        'S12' => 'Médicaments et dialyse : comprendre et maintenir son équilibre phosphocalcique',
        'S13' => 'Vaccination et dialyse',
        'S14' => 'Qualité du traitement de dialyse et ses critères de surveillance',
        'S15' => 'Complications inter et intra dialytiques',
        'S16' => 'Gestion de la douleur en hémodialyse',
    ];

    public function getDescription(): string
    {
        return 'Intitulés définitifs des séances S1 à S16';
    }

    public function up(Schema $schema): void
    {
        foreach (self::TITLES as $code => $title) {
            $this->addSql('UPDATE module SET title = :title WHERE code = :code', ['title' => $title, 'code' => $code]);
        }
    }

    public function down(Schema $schema): void
    {
    }
}
