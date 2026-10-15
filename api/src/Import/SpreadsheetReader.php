<?php

namespace App\Import;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Lit la première feuille d'un fichier Excel (xlsx, xls, ods) ou CSV et associe chaque colonne
 * à un champ d'après son en-tête (casse, accents, espaces et « * » ignorés).
 */
final class SpreadsheetReader
{
    public const MAX_ROWS = 500;
    public const MAX_BYTES = 2 * 1024 * 1024;
    private const EXTENSIONS = ['xlsx', 'xls', 'ods', 'csv'];

    /**
     * @param array<string, list<string>> $columns champ => en-têtes acceptés (normalisés)
     * @param list<string>                $required champs obligatoires
     *
     * @return list<array{line: int, values: array<string, string>}>
     *
     * @throws ImportException fichier illisible, trop gros ou colonnes obligatoires absentes
     */
    public function read(UploadedFile $file, array $columns, array $required): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        if (!\in_array($extension, self::EXTENSIONS, true)) {
            throw new ImportException('Format non pris en charge : utilisez un fichier Excel (.xlsx) ou CSV.');
        }
        if ($file->getSize() > self::MAX_BYTES) {
            throw new ImportException('Fichier trop volumineux (2 Mo maximum).');
        }

        try {
            $reader = IOFactory::createReader(match ($extension) {
                'xlsx' => 'Xlsx', 'xls' => 'Xls', 'ods' => 'Ods', default => 'Csv',
            });
            if ($reader instanceof Csv) {
                $reader->setInputEncoding(Csv::GUESS_ENCODING);
            }
            $reader->setReadDataOnly(true);
            $rows = $reader->load($file->getPathname())->getSheet(0)->toArray(null, true, false, false);
        } catch (\Throwable) {
            throw new ImportException('Fichier illisible : vérifiez qu\'il s\'agit bien d\'un fichier Excel ou CSV.');
        }

        $header = array_shift($rows) ?? [];
        $map = [];
        foreach ($header as $index => $label) {
            $key = self::normalize((string) $label);
            foreach ($columns as $field => $aliases) {
                if (\in_array($key, $aliases, true) && !\in_array($field, $map, true)) {
                    $map[$index] = $field;
                }
            }
        }
        $missing = array_diff($required, $map);
        if ([] !== $missing) {
            throw new ImportException(\sprintf('Colonne(s) obligatoire(s) absente(s) : %s. Partez du modèle à télécharger.', implode(', ', array_map(static fn (string $f) => $columns[$f][0], $missing))));
        }

        $result = [];
        foreach ($rows as $offset => $row) {
            $values = [];
            foreach ($map as $index => $field) {
                $values[$field] = self::cell($row[$index] ?? null);
            }
            if ('' === implode('', $values)) {
                continue; // ligne vide
            }
            $result[] = ['line' => $offset + 2, 'values' => $values];
        }

        if ([] === $result) {
            throw new ImportException('Le fichier ne contient aucune ligne à importer.');
        }
        if (\count($result) > self::MAX_ROWS) {
            throw new ImportException(\sprintf('Trop de lignes (%d) : %d maximum par import.', \count($result), self::MAX_ROWS));
        }

        return $result;
    }

    /** « Code postal * » → « code postal » */
    public static function normalize(string $text): string
    {
        $text = mb_strtolower(trim(str_replace(['*', '°', '_'], ' ', $text)));
        $text = (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', \Normalizer::normalize($text, \Normalizer::FORM_D) ?: $text);

        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $text));
    }

    private static function cell(mixed $value): string
    {
        if (\is_float($value) && floor($value) === $value) {
            $value = (int) $value; // 75018.0 → 75018
        }

        return trim((string) $value);
    }
}
