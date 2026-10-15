<?php

namespace App\Import;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Modèles Excel des imports : en-têtes attendus, exemples, listes déroulantes et mode d'emploi.
 */
final class TemplateBuilder
{
    private const HEADER_COLOR = '004138';
    private const REQUIRED_COLOR = 'E86825';
    private const ROWS = 500;

    public function __construct(private readonly CenterResolver $centerResolver)
    {
    }

    public function centers(): string
    {
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('Centres');
        $this->headers($sheet, ['Nom *', 'Ville *', 'N° FINESS', 'Adresse', 'Code postal', 'Région', 'Téléphone', 'Email', 'Postes de dialyse'], 2);
        $sheet->fromArray([
            ['Diaverum Exemple Nord', 'Lille', '590012345', '10 rue de la Gare', '59000', 'Hauts-de-France', '03 20 00 00 00', 'lille@exemple.fr', 20],
        ], null, 'A2', true);
        $this->textColumns($sheet, ['C', 'E', 'G']);

        $regions = $book->createSheet()->setTitle('Régions');
        $regions->fromArray(array_map(static fn (string $r) => [$r], Center::REGIONS), null, 'A1');
        $regions->getColumnDimension('A')->setAutoSize(true);
        $this->dropdown($sheet, 'F', "'Régions'!\$A\$1:\$A\$".\count(Center::REGIONS));

        $this->help($book, [
            ['Nom', 'Oui', 'Nom du centre de dialyse', 'Diaverum Lille Nord'],
            ['Ville', 'Oui', 'Commune du centre', 'Lille'],
            ['N° FINESS', 'Non', '9 caractères, unique (2A/2B pour la Corse)', '590012345'],
            ['Adresse', 'Non', 'Numéro et rue', '10 rue de la Gare'],
            ['Code postal', 'Non', '5 chiffres', '59000'],
            ['Région', 'Non', 'Liste déroulante (feuille « Régions »)', 'Hauts-de-France'],
            ['Téléphone', 'Non', '10 chiffres, espaces acceptés', '03 20 00 00 00'],
            ['Email', 'Non', 'Adresse de contact du centre', 'lille@exemple.fr'],
            ['Postes de dialyse', 'Non', 'Nombre entier (1 à 200)', '20'],
        ], [
            'Supprimez la ligne d\'exemple avant l\'import.',
            'Un centre déjà existant (même nom et même ville, ou même FINESS) est refusé.',
            'Si une ligne contient une erreur, aucun centre n\'est créé : corrigez le fichier puis rechargez-le.',
        ]);

        return $this->save($book);
    }

    public function users(User $actor): string
    {
        $isAdmin = UserRole::AdminNational === $actor->getRole();
        $centers = $this->centerResolver->allowedCenters($actor);

        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('Utilisateurs');
        $headers = ['Nom *', 'Prénom *', 'Email *', ...($isAdmin ? ['Rôle'] : []), 'Centres'];
        $this->headers($sheet, $headers, 3);
        $example = static fn (string $last, string $first, string $email, string $role, string $centers) => [
            $last, $first, $email, ...($isAdmin ? [$role] : []), $centers,
        ];
        $first = $centers[0] ?? null;
        $sheet->fromArray([
            $example('DURAND', 'Julie', 'julie.durand@exemple.fr', 'IDE', $first?->getName() ?? ''),
            $example('MARTIN', 'Paul', 'paul.martin@exemple.fr', 'Cadre de service', $first?->getFiness() ?? $first?->getName() ?? ''),
        ], null, 'A2', true);

        $centersColumn = $isAdmin ? 'E' : 'D';
        $list = $book->createSheet()->setTitle('Centres disponibles');
        $this->headers($list, ['Centre', 'Ville', 'N° FINESS'], 0);
        $list->fromArray(array_map(static fn (Center $c) => [$c->getName(), $c->getCity(), $c->getFiness()], $centers), null, 'A2', true);
        $this->dropdown($sheet, $centersColumn, "'Centres disponibles'!\$A\$2:\$A\$".max(2, \count($centers) + 1), false);
        if ($isAdmin) {
            $this->dropdown($sheet, 'D', '"'.implode(',', array_keys(UserImporter::ROLE_LABELS)).'"');
        }

        $this->help($book, [
            ['Nom', 'Oui', 'Nom de famille', 'DURAND'],
            ['Prénom', 'Oui', '', 'Julie'],
            ['Email', 'Oui', 'Identifiant de connexion, unique', 'julie.durand@exemple.fr'],
            ...($isAdmin ? [['Rôle', 'Non (IDE par défaut)', 'IDE, Cadre de service ou Administrateur national', 'IDE']] : []),
            ['Centres', $isAdmin ? 'Oui (sauf administrateur)' : (1 === \count($centers) ? 'Non' : 'Oui'), 'Nom ou N° FINESS du centre ; plusieurs centres séparés par « ; » (voir « Centres disponibles »)', 'Diaverum Paris Nord ; 690099999'],
        ], [
            'Supprimez les lignes d\'exemple avant l\'import.',
            ...($isAdmin ? [] : ['En tant que cadre de service, vous ne pouvez importer que des IDE, dans vos centres.']),
            'Un mot de passe provisoire est généré pour chaque compte et affiché une seule fois à la fin de l\'import.',
            'Chaque personne choisira son code de sécurité à sa première connexion.',
            'Si une ligne contient une erreur, aucun compte n\'est créé : corrigez le fichier puis rechargez-le.',
        ]);

        return $this->save($book);
    }

    public function patients(User $actor): string
    {
        $centers = $this->centerResolver->allowedCenters($actor);
        $single = 1 === \count($centers);

        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('Patients');
        $this->headers($sheet, ['Nom *', 'Prénom *', 'Date de naissance', 'Centre'], 2);
        $sheet->fromArray([['DUPONT', 'Jean', '12/03/1948', ($centers[0] ?? null)?->getName() ?? '']], null, 'A2', true);
        $this->textColumns($sheet, ['C']);

        $list = $book->createSheet()->setTitle('Centres disponibles');
        $this->headers($list, ['Centre', 'Ville', 'N° FINESS'], 0);
        $list->fromArray(array_map(static fn (Center $c) => [$c->getName(), $c->getCity(), $c->getFiness()], $centers), null, 'A2', true);
        $this->dropdown($sheet, 'D', "'Centres disponibles'!\$A\$2:\$A\$".max(2, \count($centers) + 1));

        $this->help($book, [
            ['Nom', 'Oui', 'Nom de famille', 'DUPONT'],
            ['Prénom', 'Oui', '', 'Jean'],
            ['Date de naissance', 'Non (recommandée)', 'JJ/MM/AAAA ; distingue deux homonymes', '12/03/1948'],
            ['Centre', $single ? 'Non (votre centre par défaut)' : 'Oui', 'Liste déroulante, ou N° FINESS (voir « Centres disponibles »)', ($centers[0] ?? null)?->getName() ?? ''],
        ], [
            'Supprimez la ligne d\'exemple avant l\'import.',
            'Les patients sont créés au statut « Enregistré » : le profil, le test CODEX et l\'éligibilité se renseignent ensuite sur leur fiche.',
            'Un patient déjà présent dans le centre (même nom, prénom et date de naissance) est refusé.',
            'Ne saisissez aucune donnée médicale dans ce fichier.',
            'Si une ligne contient une erreur, aucun patient n\'est créé : corrigez le fichier puis rechargez-le.',
        ]);

        return $this->save($book);
    }

    /** @param list<string> $headers */
    private function headers(Worksheet $sheet, array $headers, int $requiredCount): void
    {
        $sheet->fromArray($headers, null, 'A1');
        $last = $sheet->getHighestColumn(1);
        $style = $sheet->getStyle("A1:{$last}1");
        $style->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::HEADER_COLOR);
        if ($requiredCount > 0) {
            $sheet->getStyle('A1:'.chr(64 + $requiredCount).'1')->getFill()->getStartColor()->setRGB(self::REQUIRED_COLOR);
        }
        $sheet->freezePane('A2');
        foreach ($sheet->getColumnIterator('A', $last) as $column) {
            $sheet->getColumnDimension($column->getColumnIndex())->setWidth(24);
        }
    }

    /** Colonnes saisies en texte : Excel ne retire pas les zéros initiaux (codes postaux, FINESS, téléphones) */
    private function textColumns(Worksheet $sheet, array $columns): void
    {
        foreach ($columns as $column) {
            $sheet->getStyle(\sprintf('%s2:%s%d', $column, $column, self::ROWS + 1))->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);
        }
    }

    private function dropdown(Worksheet $sheet, string $column, string $source, bool $strict = true): void
    {
        $validation = new DataValidation();
        $validation->setType(DataValidation::TYPE_LIST)->setFormula1($source)->setShowDropDown(true)->setAllowBlank(true)
            ->setShowErrorMessage($strict)->setErrorStyle(DataValidation::STYLE_STOP)->setError('Choisissez une valeur dans la liste.');
        $sheet->setDataValidation(\sprintf('%s2:%s%d', $column, $column, self::ROWS + 1), $validation);
    }

    /**
     * @param list<array{0: string, 1: string, 2: string, 3: string}> $columns
     * @param list<string>                                           $notes
     */
    private function help(Spreadsheet $book, array $columns, array $notes): void
    {
        $help = $book->createSheet()->setTitle('Mode d\'emploi');
        $this->headers($help, ['Colonne', 'Obligatoire', 'Format', 'Exemple'], 0);
        $help->fromArray($columns, null, 'A2', true);
        $row = \count($columns) + 3;
        foreach ($notes as $note) {
            $help->setCellValue('A'.$row++, '• '.$note);
        }
        $help->getColumnDimension('C')->setWidth(70);
        $book->setActiveSheetIndex(0);
    }

    private function save(Spreadsheet $book): string
    {
        ob_start();
        (new Xlsx($book))->save('php://output');

        return (string) ob_get_clean();
    }
}
