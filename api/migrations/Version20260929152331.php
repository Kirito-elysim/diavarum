<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Catalogue officiel des séances : code stable par séance (S0 à S24, O1 à O7), 9 thématiques, 32 séances.
 */
final class Version20260929152331 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Catalogue officiel des 32 séances et code stable par séance';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE module ADD code VARCHAR(10) NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_C24262877153098 ON module (code)');

        // Catalogue officiel des 32 séances (doc/Liste-seances.pdf). Identifiants dérivés du code de séance :
        // identiques dans tous les environnements. Le contenu pédagogique est intégré séparément.
        $this->addSql("INSERT INTO chapter (id, title, description, position) VALUES ('556b4500-5362-5265-bcfa-bef2dab68f7b', 'Démarrage du programme', 'Profil clinique du patient et éligibilité aux thématiques.', 0), ('2a555466-0fa3-5332-9845-644a058b112b', 'Informations d''accueil du patient', NULL, 1), ('473088f6-9ff6-54a0-9b37-033e36fd5b97', 'Notions générales d''hygiène et de sécurité', NULL, 2), ('16d5a19f-c463-5a01-a567-6415c2af4ed9', 'Traitement de l''IRCT – Méthodes de suppléance rénale', NULL, 3), ('cd6a3736-200e-5a05-861e-292239ce2ffd', 'Notions utiles', NULL, 4), ('4d453393-f90e-5a94-8c3b-c9ad0bcfb11c', 'Voies d''abord pour hémodialyse et complications éventuelles', NULL, 5), ('50fe58b0-2c96-5ad8-8568-973d0382e339', 'Prise en charge pluridisciplinaire', NULL, 6), ('7859df84-e877-51a4-81a2-a442f0ccb277', 'Vie quotidienne', NULL, 7), ('e116aa87-c852-5fef-a36c-df4503863a5c', 'Notions spécifiques – Modules optionnels', 'Séances à sélectionner par l''IDE selon le profil du patient.', 8)");
        $this->addSql("INSERT INTO module (id, code, position, title, description, chapter_id, estimated_duration, mandatory, intro, published, content, created_at, updated_at) VALUES "
            ."('e0ee1015-0601-5a68-acbf-82dbc8d24097', 'S0', 0, 'Profil clinique du patient – Éligibilité aux thématiques', 'Questionnaire, test CODEX, présentation du programme individualisé, consentement du patient (document à part).', '556b4500-5362-5265-bcfa-bef2dab68f7b', 30, true, true, true, '[]', NOW(), NOW())"
            .", ('cef7bade-bfbc-54fd-840d-8641c1cd4bba', 'S1', 1, 'Droits et devoirs du patient – Personne de confiance – Directives anticipées', '', '2a555466-0fa3-5332-9845-644a058b112b', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('76549a99-346f-5125-a7b1-330deabbda57', 'S2', 2, 'Hygiène au centre de dialyse', '', '473088f6-9ff6-54a0-9b37-033e36fd5b97', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('338e0de1-1425-5a5f-abc7-61a26f8c4823', 'S3', 3, 'Confort et sécurité en séance + la tenue vestimentaire', '', '473088f6-9ff6-54a0-9b37-033e36fd5b97', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('1c393b63-68d7-5bcc-a6ac-bffffabf875b', 'S4', 4, 'IRCT et hémodialyse', '', '16d5a19f-c463-5a01-a567-6415c2af4ed9', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('a0773237-b6f5-57bc-9318-a58d46db504a', 'S5', 5, 'Les traitements de suppléance rénale : DAD – DP – Greffe', 'Simples notions.', '16d5a19f-c463-5a01-a567-6415c2af4ed9', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('9d5a78cd-073b-5bde-99c6-5e04c06cc99e', 'S6', 6, 'Notion de poids sec / équilibre hydrique', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('75bb36d5-5438-50ee-a5c7-4823607d4312', 'S7', 7, 'Gestion de la TA et apprentissage de l''automesure', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('4771bc9b-5826-534b-81a5-6e59755fa2a6', 'S8', 8, 'Surveillance biologique', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('5037d747-007a-5ce5-ae94-0b712c97b3a0', 'S9', 9, 'Les médicaments en dialyse, comprendre et maintenir son équilibre phosphocalcique', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('732926e3-ef4f-5496-8211-5b53ad6e43b7', 'S10', 10, 'La vaccination', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('6c11c74b-ce1b-5dcc-87dc-12f594639cf5', 'S11', 11, 'L''adéquation en dialyse : critères de surveillance (Kt/V, temps, débit sang…)', 'Avec explication de l''IPPS.', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('356ff05d-4076-5ef4-ba03-92dfd96b41e1', 'S12', 12, 'Complications inter et intra-dialytiques', '', 'cd6a3736-200e-5a05-861e-292239ce2ffd', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('f630816a-58c9-5bb1-9b24-24ece764f4cb', 'S13', 13, 'Les voies d''abord en hémodialyse : fistule artérioveineuse (FAV) et cathéter veineux central (CVC)', '', '4d453393-f90e-5a94-8c3b-c9ad0bcfb11c', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('dab37151-fb3f-5f9d-805a-558636ed77df', 'S14', 14, 'VA – FAV : hygiène et surveillance – aspects pratiques – compression', '', '4d453393-f90e-5a94-8c3b-c9ad0bcfb11c', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('b8b31bf0-9d03-5e76-b554-e547e9de2963', 'S15', 15, 'Voie d''abord – FAV / CVC : complications et CAT', '', '4d453393-f90e-5a94-8c3b-c9ad0bcfb11c', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('3280648c-c017-5989-bfe4-e8d881abb906', 'S16', 16, 'Gestion de la douleur', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('46e789b5-0f5b-5d7f-9a52-d408c981abe4', 'S17', 17, 'Alimentation et diététique', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('b9ca7836-8c89-5de6-896f-962ad6ab2dcb', 'S18', 18, 'Eau et sel + potassium – phosphore – protéines', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('3d2bc989-3b2c-5b16-bb4f-e09695426515', 'S19', 19, 'Vécu de la maladie rénale et prise en charge psychologique', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('49059e77-769d-58b1-a5ff-2e5fa7c36e5a', 'S20', 20, 'Les droits sociaux', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('6150e3cb-35a9-53f8-89a7-3d19e0b15718', 'S21', 21, 'Les transports sanitaires', '', '50fe58b0-2c96-5ad8-8568-973d0382e339', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('9a85efeb-8816-5e1b-9626-5425ac2f2e97', 'S22', 22, 'DMP : Mon espace santé + identitovigilance et INS', '', '7859df84-e877-51a4-81a2-a442f0ccb277', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('8444eb99-9727-57be-81ea-f887fcf85ef3', 'S23', 23, 'Lutte contre la sédentarité et APA', '', '7859df84-e877-51a4-81a2-a442f0ccb277', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('58ab7bd2-cc76-5834-9524-f5d4f69ee7ee', 'S24', 24, 'Vie quotidienne et dialyse', '', '7859df84-e877-51a4-81a2-a442f0ccb277', 30, true, false, true, '[]', NOW(), NOW())"
            .", ('e2f5f535-5bfa-5100-886d-4b61fd0298e7', 'O1', 25, 'Les AVK', '', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('6e954a38-2514-57f9-b9d5-f25510d3ef0d', 'O2', 26, 'Gestion du diabète + surveillance des pieds des patients diabétiques', '', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('a629cba0-03da-5558-9ee0-a3795e5e6baa', 'O3', 27, 'La rhéophérèse', 'Centres lourds uniquement.', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('d1c46e5e-049d-59dd-a33a-425861288de2', 'O4', 28, 'Dialyse et vie professionnelle', 'D''après le guide France Rein.', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('04d6ec96-42ed-5c36-b2c4-886a94bdab15', 'O5', 29, 'Greffe rénale – Parcours', '', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('04c04845-98e3-5436-b335-6176433ffabf', 'O6', 30, 'FAV / CVC : transition CVC / FAV – création de la FAV', 'Si applicable.', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())"
            .", ('5df367fc-6b36-5141-ac02-748415ceabae', 'O7', 31, 'Dialyse et vacances en France et à l''étranger', '', 'e116aa87-c852-5fef-a36c-df4503863a5c', 30, false, false, true, '[]', NOW(), NOW())");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM module WHERE code IN ('S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24', 'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7')");
        $this->addSql("DELETE FROM chapter WHERE id IN ('556b4500-5362-5265-bcfa-bef2dab68f7b', '2a555466-0fa3-5332-9845-644a058b112b', '473088f6-9ff6-54a0-9b37-033e36fd5b97', '16d5a19f-c463-5a01-a567-6415c2af4ed9', 'cd6a3736-200e-5a05-861e-292239ce2ffd', '4d453393-f90e-5a94-8c3b-c9ad0bcfb11c', '50fe58b0-2c96-5ad8-8568-973d0382e339', '7859df84-e877-51a4-81a2-a442f0ccb277', 'e116aa87-c852-5fef-a36c-df4503863a5c')");
        $this->addSql('DROP INDEX UNIQ_C24262877153098');
        $this->addSql('ALTER TABLE module DROP code');
    }
}
