<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Catalogue des séances selon « Détail programme + guide IDE EHD » (doc/) :
 * - la thématique « Voies d'abord » passe avant « Notions utiles » : ses séances deviennent S6 à S8,
 *   les anciennes S6 à S12 deviennent S9 à S15 (mêmes séances : parcours, historique et contenu suivent) ;
 * - intitulés mis à jour, objectifs de chaque séance en description ;
 * - compétences = « Évaluation IDE » du guide (5 au plus par séance). Une compétence qui n'y figure
 *   plus est archivée : les évaluations déjà faites en séance sont conservées.
 */
final class Version20261017090000 extends AbstractMigration
{
    /** Ancien code → nouveau code */
    private const RENUMBER = [
        'S13' => 'S6', 'S14' => 'S7', 'S15' => 'S8',
        'S6' => 'S9', 'S7' => 'S10', 'S8' => 'S11', 'S9' => 'S12', 'S10' => 'S13', 'S11' => 'S14', 'S12' => 'S15',
    ];

    /** Nouveau code → [intitulé, objectifs (description), compétences « Évaluation IDE »] */
    private const CATALOGUE = [
        'S1' => ['Droits et devoirs du patient – Personne de confiance – Directives anticipées', [
            'Identifier ses principaux droits en tant que patient et comprendre son rôle dans les décisions concernant sa santé.',
            'Expliquer le rôle de la personne de confiance et des directives anticipées et savoir comment les désigner ou les rédiger.',
        ], [
            'Le patient sait définir la personne de confiance et expliquer son rôle',
            'Le patient comprend l’intérêt des directives anticipées',
        ]],
        'S2' => ['Hygiène au centre de dialyse', [
            'Identifier les principales mesures d’hygiène à respecter avant, pendant et après une séance de dialyse.',
            'Reconnaître les situations à risque infectieux et adopter les comportements adaptés pour protéger son abord vasculaire et sa santé.',
        ], [
            'Le patient sait décrire les étapes d’hygiène avant et après la séance',
            'Le patient sait identifier les signes d’alerte pouvant évoquer une infection',
            'Le patient adopte les comportements contribuant à la sécurité de tous',
        ]],
        'S3' => ['Confort et sécurité en séance + la tenue vestimentaire', [
            'Identifier les mesures favorisant son confort et son bien-être pendant la séance de dialyse.',
            'Reconnaître les signes d’alerte nécessitant de prévenir l’équipe soignante pendant ou après la séance.',
        ], [
            'Le patient identifie les comportements favorisant son confort',
            'Le patient peut expliquer pourquoi il est indispensable d’avoir une tenue adaptée',
            'Le patient comprend l’importance du respect de la prescription de dialyse',
        ]],
        'S4' => ['IRCT et hémodialyse', [
            'Expliquer ce qu’est l’insuffisance rénale chronique terminale et ses conséquences sur l’organisme.',
            'Décrire le rôle de l’hémodialyse et comprendre l’importance du respect de son traitement.',
        ], [
            'Le patient peut expliquer les principales fonctions du rein',
            'Le patient décrit le principe de l’hémodialyse',
            'Le patient reconnaît et explique son rôle dans la réussite de son traitement',
        ]],
        'S5' => ['Les traitements de suppléance rénale : DAD – DP – Greffe (simples notions)', [
            'Identifier les principales caractéristiques de l’hémodialyse à domicile, de la dialyse péritonéale et de la transplantation rénale.',
            'Exprimer les avantages et les contraintes de chaque méthode en fonction de sa situation personnelle.',
        ], [
            'Le patient peut citer les différences principales entre l’hémodialyse à domicile et la dialyse péritonéale',
        ]],
        'S6' => ['Les voies d’abord en hémodialyse : fistule artérioveineuse (FAV) et cathéter veineux central (CVC)', [
            'Identifier les différents types de voies d’abord utilisées en hémodialyse et comprendre leur rôle.',
            'Reconnaître les règles de surveillance et les signes d’alerte nécessitant de prévenir l’équipe soignante.',
        ], [
            'Le patient distingue la FAV du CVC',
            'Le patient comprend les avantages et les limites de chaque voie d’abord',
            'Le patient connaît les règles de protection de son accès vasculaire',
            'Le patient identifie les principaux signaux d’alerte',
            'Le patient participe activement à la surveillance et à la préservation de sa voie d’abord',
        ]],
        'S7' => ['VA – FAV : hygiène et surveillance – aspects pratiques – compression', [
            'Appliquer les mesures d’hygiène et de surveillance nécessaires au bon fonctionnement de sa fistule artérioveineuse.',
            'Réaliser correctement les gestes pratiques de protection et de compression de la fistule après une séance de dialyse.',
        ], [
            'Le patient réalise une surveillance quotidienne de sa fistule',
            'Le patient connaît les règles d’hygiène avant et après sa séance',
            'Le patient applique correctement les techniques de compression',
            'Le patient identifie les signes d’alerte nécessitant de prévenir l’équipe soignante',
            'Le patient adopte les mesures permettant de préserver durablement son accès vasculaire',
        ]],
        'S8' => ['VA – FAV / CVC : complications et CAT', [
            'Identifier les principales complications pouvant survenir sur une FAV ou un CVC.',
            'Adopter la conduite à tenir adaptée et savoir quand contacter rapidement l’équipe de dialyse.',
        ], [
            'Le patient peut citer les signes de complications liés à son accès vasculaire',
            'Le patient connaît les signes d’alerte nécessitant une prise en charge rapide',
            'Le patient applique la conduite à tenir adaptée à la situation',
            'Le patient participe activement à la surveillance de sa voie d’abord',
            'Le patient comprend que la préservation de son accès vasculaire contribue à la qualité et à la continuité de son traitement',
        ]],
        'S9' => ['Notion de poids sec / équilibre hydrique', [
            'Définir la notion de poids sec et comprendre son importance dans le traitement par hémodialyse.',
            'Identifier les comportements permettant de maintenir un bon équilibre hydrique entre les séances de dialyse.',
        ], [
            'Le patient définit correctement la notion de poids sec',
            'Le patient identifie les signes de surcharge hydrique et de déshydratation',
            'Le patient connaît son poids sec et son objectif de prise de poids interdialytique',
            'Le patient peut expliquer comment il adapte ses apports en fonction de ses objectifs de poids',
        ]],
        'S10' => ['Gestion de la TA et apprentissage de l’automesure', [
            'Expliquer l’importance de la surveillance de la tension artérielle dans le cadre de l’IRC et de l’hémodialyse.',
            'Réaliser correctement une automesure tensionnelle et transmettre des résultats fiables à l’équipe soignante.',
        ], [
            'Le patient comprend l’importance de la surveillance tensionnelle',
            'Le patient peut réaliser correctement une mesure de tension',
            'Le patient connaît les risques liés à une tension trop élevée ou trop basse',
            'Le patient identifie les situations nécessitant de contacter l’équipe soignante',
        ]],
        'S11' => ['Surveillance biologique', [
            'Identifier les principaux examens biologiques réalisés en dialyse et comprendre leur utilité.',
            'Comprendre l’importance de la surveillance biologique dans l’adaptation du traitement et de son hygiène de vie.',
        ], [
            'Le patient connaît les principaux examens biologiques réalisés en dialyse',
            'Le patient comprend le rôle du potassium, du phosphore, du calcium, de l’hémoglobine et de l’albumine',
            'Le patient identifie le lien entre les résultats biologiques et les traitements',
            'Le patient participe activement à la surveillance de sa santé',
        ]],
        'S12' => ['Les médicaments en dialyse, comprendre et maintenir son équilibre phosphocalcique', [
            'Identifier les principales catégories de médicaments prescrits en dialyse et comprendre leur rôle.',
            'Appliquer les bonnes pratiques pour prendre ses traitements en toute sécurité.',
            'Expliquer le rôle du phosphore et du calcium dans l’organisme et les conséquences de leur déséquilibre.',
            'Identifier les moyens de maintenir un bon équilibre phosphocalcique grâce à l’alimentation, à la dialyse et aux traitements prescrits.',
        ], [
            'Le patient identifie les principales catégories de médicaments et comprend leur rôle',
            'Le patient connaît les règles de bonne observance',
            'Le patient comprend le rôle du phosphore et du calcium',
            'Le patient connaît les principes alimentaires adaptés',
            'Le patient sait identifier un effet indésirable',
        ]],
        'S13' => ['La vaccination', [
            'Comprendre l’intérêt de la vaccination dans le contexte de l’insuffisance rénale chronique et de l’hémodialyse.',
            'Identifier les vaccinations recommandées et participer activement au suivi de son calendrier vaccinal.',
        ], [
            'Le patient comprend l’intérêt de la vaccination dans l’insuffisance rénale chronique',
            'Le patient connaît les principales vaccinations recommandées',
            'Le patient comprend l’importance des rappels vaccinaux',
            'Le patient peut citer au moins un vaccin recommandé',
        ]],
        'S14' => ['L’adéquation en dialyse : critères de surveillance (Kt/V, temps, débit sang…) + explication IPPS', [
            'Comprendre la notion d’adéquation en dialyse et son importance pour sa santé.',
            'Identifier les principaux critères de surveillance permettant d’évaluer l’efficacité du traitement.',
            'Connaître les indicateurs suivis dans le cadre des IPPS.',
        ], [
            'Le patient comprend la notion d’adéquation en dialyse',
            'Le patient connaît les principaux indicateurs de surveillance (Kt/V, URR)',
            'Le patient peut citer au moins deux critères d’une bonne dialyse',
        ]],
        'S15' => ['Complications inter et intra-dialytiques', [
            'Identifier les principales complications pouvant survenir pendant une séance de dialyse (complications intradialytiques).',
            'Reconnaître les signes d’alerte pouvant apparaître entre les séances (complications interdialytiques) et savoir quand prévenir l’équipe soignante.',
        ], [
            'Le patient distingue les complications inter et intradialytiques',
            'Le patient identifie les principaux signes d’alerte',
            'Le patient connaît les situations nécessitant une prise de contact rapide avec l’équipe soignante',
            'Le patient adopte les comportements favorisant sa sécurité en dialyse',
        ]],
        'S16' => ['Gestion de la douleur', [], [
            'Le patient peut évaluer et communiquer l’intensité de sa douleur',
            'Le patient sait identifier et mettre en œuvre une stratégie adaptée pour la soulager',
        ]],
        'S17' => ['Alimentation et diététique', [], [
            'Le patient participe activement à la maîtrise de son équilibre nutritionnel',
            'Le patient peut décrire une adaptation alimentaire quotidienne',
        ]],
        'S18' => ['Eau et sel + potassium – phosphore – protéines', [], [
            'Le patient sait identifier les aliments riches en potassium ou en phosphore',
            'Le patient peut expliquer les adaptations qu’il fait au quotidien',
        ]],
        'S19' => ['Vécu et prise en charge psychologique', [], [
            'Le patient sait exprimer ses besoins et ses objectifs personnels',
            'Le patient sait identifier les ressources d’aide (équipe soignante, psychologue, associations…)',
        ]],
        'S20' => ['Les droits sociaux', [], [
            'Le patient peut citer une aide dont il est bénéficiaire',
        ]],
        'S21' => ['Les transports sanitaires', [], [
            'Le patient organise ses rendez-vous et ses transports éventuels',
        ]],
        'S22' => ['DMP : Mon espace santé + identitovigilance et INS', [
            'Comprendre et utiliser les outils numériques de santé pour faciliter son parcours de soins et sécuriser son identité.',
        ], [
            'Le patient sait expliquer à quoi sert « Mon espace santé »',
            'Le patient peut identifier les documents qui peuvent y être consultés',
            'Le patient peut citer les informations utilisées pour vérifier son identité',
        ]],
        'S23' => ['Lutte contre la sédentarité et APA', [], [
            'Le patient peut définir la sédentarité et expliquer ce qu’il met en place',
            'Le patient maintient une activité physique adaptée',
        ]],
        'S24' => ['Vie quotidienne et dialyse', [
            'Identifier les principales adaptations nécessaires dans la vie quotidienne pour vivre avec un traitement par dialyse.',
            'Repérer les ressources et les solutions permettant de concilier dialyse et projets de vie.',
        ], [
            'Le patient cite au moins trois domaines de vie concernés par la dialyse',
            'Le patient identifie des solutions favorisant son autonomie',
            'Le patient exprime une ou plusieurs stratégies d’adaptation à sa situation',
        ]],
        'O1' => ['Les AVK', [], [
            'Le patient connaît le rôle de son traitement',
            'Le patient peut identifier les signes d’alerte',
            'Le patient peut expliquer le suivi biologique lié à son traitement',
        ]],
        'O2' => ['Gestion du diabète + surveillance des pieds des patients diabétiques', [], [
            'Le patient est autonome dans sa surveillance glycémique',
            'Le patient est capable de citer les mesures de prévention des plaies du pied',
        ]],
        'O3' => ['La rhéophérèse (centres lourds uniquement)', [], [
            'Le patient peut expliquer le principe de la rhéophérèse',
        ]],
        'O4' => ['Dialyse et vie professionnelle (guide France Rein)', [], [
            'Le patient sait expliquer son projet professionnel',
            'Le patient peut expliquer comment il adapte son quotidien entre travail et dialyse',
        ]],
        'O5' => ['Greffe rénale – parcours', [], [
            'Le patient peut expliquer le principe de la greffe',
            'Le patient sait identifier les étapes du parcours',
        ]],
        'O6' => ['FAV / CVC si applicable : transition CVC / FAV – création de la FAV', [], [
            'Le patient sait expliquer l’intérêt de la FAV par rapport au CVC',
            'Le patient sait décrire les étapes de création et de suivi',
        ]],
        'O7' => ['Dialyse et vacances en France et à l’étranger', [], [
            'Le patient peut préparer un projet de vacances',
            'Le patient sait expliquer l’organisation d’un séjour',
        ]],
    ];

    public function getDescription(): string
    {
        return 'Catalogue des séances selon le guide IDE EHD : ordre, intitulés, objectifs et compétences';
    }

    public function up(Schema $schema): void
    {
        // « Voies d'abord » avant « Notions utiles »
        $this->addSql("UPDATE chapter SET position = 5 WHERE title = 'Notions utiles'");
        $this->addSql("UPDATE chapter SET position = 4 WHERE title LIKE 'Voies d''abord%'");

        // Renumérotation en deux temps (codes uniques) : les séances gardent leur identifiant
        foreach (array_keys(self::RENUMBER) as $old) {
            $this->addSql('UPDATE module SET code = :tmp WHERE code = :old', ['tmp' => 'X'.$old, 'old' => $old]);
        }
        foreach (self::RENUMBER as $old => $new) {
            $this->addSql('UPDATE module SET code = :new WHERE code = :tmp', ['new' => $new, 'tmp' => 'X'.$old]);
        }
        $this->addSql("UPDATE module SET position = CASE
            WHEN code = 'PT' THEN 32
            WHEN code LIKE 'O%' THEN 24 + CAST(SUBSTRING(code FROM 2) AS INTEGER)
            ELSE CAST(SUBSTRING(code FROM 2) AS INTEGER) END");

        foreach (self::CATALOGUE as $code => [$title, $objectives, $competencies]) {
            $this->addSql('UPDATE module SET title = :title WHERE code = :code', ['title' => $title, 'code' => $code]);
            if ([] !== $objectives) {
                $this->addSql('UPDATE module SET description = :description WHERE code = :code', [
                    'description' => implode("\n", $objectives),
                    'code' => $code,
                ]);
            }
            $this->syncCompetencies($code, $competencies);
        }
    }

    /** Compétences du guide : celles qui n'y figurent plus sont archivées, les nouvelles ajoutées, l'ordre suivi */
    private function syncCompetencies(string $code, array $labels): void
    {
        $module = '(SELECT id FROM module WHERE code = :code)';
        $this->addSql(
            "UPDATE module_competency SET archived_at = NOW() WHERE module_id = $module AND archived_at IS NULL AND label NOT IN (:labels)",
            ['code' => $code, 'labels' => $labels],
            ['labels' => ArrayParameterType::STRING],
        );
        foreach ($labels as $position => $label) {
            $this->addSql(
                "UPDATE module_competency SET position = :position WHERE module_id = $module AND archived_at IS NULL AND label = :label",
                ['position' => $position, 'code' => $code, 'label' => $label],
            );
            $this->addSql(
                "INSERT INTO module_competency (id, module_id, label, position)
                 SELECT gen_random_uuid(), m.id, :label, :position FROM module m
                 WHERE m.code = :code AND NOT EXISTS (
                     SELECT 1 FROM module_competency mc WHERE mc.module_id = m.id AND mc.archived_at IS NULL AND mc.label = :label
                 )",
                ['label' => $label, 'position' => $position, 'code' => $code],
            );
        }
    }

    public function down(Schema $schema): void
    {
        // Ordre et codes d'origine (intitulés, objectifs et compétences du guide sont conservés)
        $this->addSql("UPDATE chapter SET position = 4 WHERE title = 'Notions utiles'");
        $this->addSql("UPDATE chapter SET position = 5 WHERE title LIKE 'Voies d''abord%'");
        foreach (self::RENUMBER as $old => $new) {
            $this->addSql('UPDATE module SET code = :tmp WHERE code = :new', ['tmp' => 'X'.$new, 'new' => $new]);
        }
        foreach (self::RENUMBER as $old => $new) {
            $this->addSql('UPDATE module SET code = :old WHERE code = :tmp', ['old' => $old, 'tmp' => 'X'.$new]);
        }
        $this->addSql("UPDATE module SET position = CASE
            WHEN code = 'PT' THEN 32
            WHEN code LIKE 'O%' THEN 24 + CAST(SUBSTRING(code FROM 2) AS INTEGER)
            ELSE CAST(SUBSTRING(code FROM 2) AS INTEGER) END");
    }
}
