<?php

namespace App\Reporting;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Exports Excel (format principal demandé par le cahier des charges).
 */
final class SpreadsheetWriter
{
    private const HEADER_COLOR = '004138'; // vert Diaverum (charte graphique)

    /**
     * @param list<array<string, mixed>> $reports bilans produits par PatientReportBuilder
     */
    public function patients(array $reports): string
    {
        $book = new Spreadsheet();
        $book->getProperties()->setTitle('Bilan des patients')->setCreator('Diaverum');

        $summary = $book->getActiveSheet()->setTitle('Synthèse');
        $this->table($summary, [
            'Nom', 'Prénom', 'Date de naissance', 'Centre', 'Éligibilité', 'Programme',
            'Séances validées', 'Séances du parcours', 'Score moyen (%)', 'Durée totale (min)', 'Validé par', 'Achevé le',
        ], array_map(static fn (array $r) => [
            mb_strtoupper($r['patient']['lastName']),
            $r['patient']['firstName'],
            $r['patient']['dateOfBirth']?->format('d/m/Y'),
            $r['patient']['center'],
            $r['patient']['eligibility'],
            $r['program']['status'] ?? 'Aucun',
            $r['program']['validatedCount'] ?? null,
            $r['program']['selectedCount'] ?? null,
            $r['program']['averageScore'] ?? null,
            isset($r['program']) ? self::minutes($r['program']['totalDurationSeconds']) : null,
            $r['program']['validatedBy'] ?? null,
            ($r['program']['completedAt'] ?? null)?->format('d/m/Y'),
        ], $reports));

        $detail = $book->createSheet()->setTitle('Détail des séances');
        $rows = [];
        foreach ($reports as $r) {
            foreach ($r['courses'] as $c) {
                $rows[] = [
                    mb_strtoupper($r['patient']['lastName']),
                    $r['patient']['firstName'],
                    $r['patient']['dateOfBirth']?->format('d/m/Y'),
                    $c['code'],
                    $c['title'],
                    $c['chapter'],
                    $c['selected'] ? 'Oui' : 'Non (désélectionnée)',
                    $c['status'],
                    $c['score'],
                    null === $c['durationSeconds'] ? null : self::minutes($c['durationSeconds']),
                    $c['validatedAt']?->setTimezone(new \DateTimeZone('Europe/Paris'))->format('d/m/Y H:i'),
                    implode(' ; ', $c['competencies']),
                    implode(' ; ', $c['competenciesNotValidated']),
                ];
            }
        }
        $this->table($detail, [
            'Nom', 'Prénom', 'Date de naissance', 'Code', 'Séance', 'Thématique', 'Sélectionnée', 'Statut',
            'Score (%)', 'Durée (min)', 'Validée le', 'Compétences validées', 'Compétences non validées',
        ], $rows);

        $book->setActiveSheetIndex(0);

        return $this->save($book);
    }

    /**
     * @param array<string, mixed> $stats synthèse produite par StatisticsBuilder
     */
    public function statistics(array $stats): string
    {
        $book = new Spreadsheet();
        $book->getProperties()->setTitle('Statistiques — '.$stats['scope'])->setCreator('Diaverum');
        $areas = [...$stats['centers'], $stats['total']];

        $patients = $book->getActiveSheet()->setTitle('Patients');
        $this->table($patients, [
            'Centre', 'Patients enregistrés', 'Éligibles', '% éligibles', 'Non éligibles', '% non éligibles', 'Éligibilité à statuer', '% à statuer',
        ], array_map(static fn (array $a) => [
            $a['center'], $a['patients']['registered'],
            $a['patients']['eligible']['count'], $a['patients']['eligible']['percent'],
            $a['patients']['notEligible']['count'], $a['patients']['notEligible']['percent'],
            $a['patients']['pending']['count'], $a['patients']['pending']['percent'],
        ], $areas), $this->caption($stats));

        $programs = $book->createSheet()->setTitle('Programmes');
        $this->table($programs, [
            'Centre', 'Programmes', 'Non actifs', '%', 'En cours', '%', 'Interrompus', '%', 'Achevés', '%',
            'Score moyen des programmes (%)', 'Durée moyenne d\'un programme achevé (min)',
        ], array_map(static fn (array $a) => [
            $a['center'], $a['programs']['total'],
            $a['programs']['inactive']['count'], $a['programs']['inactive']['percent'],
            $a['programs']['active']['count'], $a['programs']['active']['percent'],
            $a['programs']['interrupted']['count'], $a['programs']['interrupted']['percent'],
            $a['programs']['completed']['count'], $a['programs']['completed']['percent'],
            $a['averageProgramScore'],
            null === $a['averageCompletedProgramDurationSeconds'] ? null : self::minutes($a['averageCompletedProgramDurationSeconds']),
        ], $areas), $this->caption($stats));

        $courses = $book->createSheet()->setTitle('Séances');
        $this->table($courses, ['Code', 'Séance', 'Type', 'Validations', 'Score moyen (%)', 'Durée moyenne (min)'], array_map(static fn (array $c) => [
            $c['code'], $c['title'], $c['mandatory'] ? 'Systématique' : 'Optionnelle', $c['validations'],
            $c['averageScore'], null === $c['averageDurationSeconds'] ? null : self::minutes($c['averageDurationSeconds']),
        ], $stats['courses']), $this->caption($stats));

        $nurses = $book->createSheet()->setTitle('IDE');
        $this->table($nurses, ['IDE', 'Centres', 'Séances validées', 'Temps de séance (min)'], array_map(static fn (array $n) => [
            $n['name'], $n['centers'], $n['validatedSessions'], self::minutes($n['totalDurationSeconds']),
        ], $stats['nurses']), $this->caption($stats));

        $book->setActiveSheetIndex(0);

        return $this->save($book);
    }

    private function caption(array $stats): string
    {
        return \sprintf('Périmètre : %s — édité le %s', $stats['scope'], $stats['generatedAt']->setTimezone(new \DateTimeZone('Europe/Paris'))->format('d/m/Y à H:i'));
    }

    /**
     * @param list<string>            $headers
     * @param list<list<string|int|float|null>> $rows
     */
    private function table(Worksheet $sheet, array $headers, array $rows, ?string $caption = null): void
    {
        $firstRow = 1;
        if (null !== $caption) {
            $sheet->setCellValue('A1', $caption)->getStyle('A1')->getFont()->setItalic(true);
            $firstRow = 3;
        }

        $sheet->fromArray($headers, null, 'A'.$firstRow);
        $lastColumn = $sheet->getHighestColumn($firstRow);
        $header = $sheet->getStyle(\sprintf('A%d:%s%d', $firstRow, $lastColumn, $firstRow));
        $header->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $header->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::HEADER_COLOR);

        if ([] !== $rows) {
            $sheet->fromArray($rows, null, 'A'.($firstRow + 1), true);
        }
        $sheet->freezePane('A'.($firstRow + 1));
        $sheet->setAutoFilter(\sprintf('A%d:%s%d', $firstRow, $lastColumn, $firstRow + max(1, \count($rows))));
        foreach ($sheet->getColumnIterator('A', $lastColumn) as $column) {
            $sheet->getColumnDimension($column->getColumnIndex())->setAutoSize(true);
        }
    }

    private static function minutes(int $seconds): float
    {
        return round($seconds / 60, 1);
    }

    private function save(Spreadsheet $book): string
    {
        ob_start();
        (new Xlsx($book))->save('php://output');

        return (string) ob_get_clean();
    }
}
