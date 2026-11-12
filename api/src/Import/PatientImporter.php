<?php

namespace App\Import;

use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use App\Service\PatientDuplicates;
use Doctrine\ORM\EntityManagerInterface;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Import de patients en masse : identité et centre uniquement (le profil, le test CODEX et
 * l'éligibilité se renseignent ensuite sur la fiche). Chaque patient est créé « Enregistré »,
 * avec l'auteur de l'import comme créateur. Import « tout ou rien ».
 */
final class PatientImporter
{
    public const COLUMNS = [
        'lastName' => ['nom', 'nom de naissance', 'nom d usage'],
        'firstName' => ['prenom'],
        'dateOfBirth' => ['date de naissance', 'naissance', 'ne le', 'nee le'],
        'center' => ['centre', 'centre de dialyse'],
    ];
    public const REQUIRED = ['lastName', 'firstName'];

    public function __construct(
        private readonly SpreadsheetReader $reader,
        private readonly ValidatorInterface $validator,
        private readonly EntityManagerInterface $entityManager,
        private readonly CenterResolver $centers,
        private readonly PatientDuplicates $duplicates,
    ) {
    }

    /**
     * @param Center|null $defaultCenter centre appliqué aux lignes sans centre (fiche centre, centre unique)
     *
     * @return array{valid: bool, rows: list<array{line: int, label: string, errors: list<string>, warnings: list<string>}>, created: int}
     */
    public function import(UploadedFile $file, User $actor, ?Center $defaultCenter, bool $commit): array
    {
        $allowed = $this->centers->allowedCenters($actor);
        $defaultCenter ??= 1 === \count($allowed) ? $allowed[0] : null;
        $findCenter = $this->centers->matcher($allowed);
        $index = $this->duplicates->index($allowed);
        $seen = [];

        $report = [];
        $patients = [];
        foreach ($this->reader->read($file, self::COLUMNS, self::REQUIRED) as ['line' => $line, 'values' => $v]) {
            $errors = [];
            $patient = (new Patient())->setLastName($v['lastName'] ?? '')->setFirstName($v['firstName'] ?? '');

            $birth = $v['dateOfBirth'] ?? '';
            if ('' !== $birth) {
                $date = self::date($birth);
                null === $date ? $errors[] = \sprintf('Date de naissance « %s » non reconnue : format attendu JJ/MM/AAAA.', $birth) : $patient->setDateOfBirth($date);
            }

            $centerName = $v['center'] ?? '';
            $center = '' === $centerName ? $defaultCenter : $findCenter($centerName);
            if (null === $center) {
                $errors[] = '' === $centerName
                    ? 'Centre : à préciser (vous avez accès à plusieurs centres).'
                    : \sprintf('Centre « %s » introuvable ou hors de votre périmètre.', $centerName);
            } else {
                $patient->setCenter($center);
            }

            foreach ($this->validator->validate($patient) as $violation) {
                if ('center' !== $violation->getPropertyPath()) {
                    $errors[] = self::label($violation->getPropertyPath()).' : '.$violation->getMessage();
                }
            }

            $warnings = [];
            if (null !== $center) {
                $found = $this->duplicates->inspect($index, $patient, $center);
                $identity = PatientDuplicates::identity($patient, $center);
                $errors = [...$errors, ...(isset($seen[$identity]) ? [\sprintf('Même patient que ligne %d.', $seen[$identity])] : $found['errors'])];
                $warnings = $found['warnings'];
                if ([] === $found['errors']) {
                    $seen[$identity] ??= $line;
                }
            }

            $report[] = [
                'line' => $line,
                'label' => trim(mb_strtoupper($patient->getLastName()).' '.$patient->getFirstName()
                    .($patient->getDateOfBirth() ? ' · '.$patient->getDateOfBirth()->format('d/m/Y') : '')
                    .($center ? ' · '.$center->getName() : '')),
                'errors' => array_values(array_unique($errors)),
                'warnings' => array_values(array_unique($warnings)),
            ];
            $patients[] = $patient;
        }

        $valid = [] === array_filter($report, static fn (array $r) => [] !== $r['errors']);
        if ($commit && $valid) {
            $this->entityManager->wrapInTransaction(function () use ($patients): void {
                foreach ($patients as $patient) {
                    $this->entityManager->persist($patient); // AuthorListener : créateur = auteur de l'import
                }
            });
        }

        return ['valid' => $valid, 'rows' => $report, 'created' => $commit && $valid ? \count($patients) : 0];
    }

    /** JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ ou date Excel (nombre de jours) */
    private static function date(string $value): ?\DateTimeImmutable
    {
        if (ctype_digit($value) && (int) $value > 0 && (int) $value < 80000) {
            return \DateTimeImmutable::createFromMutable(ExcelDate::excelToDateTimeObject((int) $value))->setTime(0, 0);
        }
        foreach (['!d/m/Y', '!d-m-Y', '!d.m.Y', '!Y-m-d'] as $format) {
            $date = \DateTimeImmutable::createFromFormat($format, $value);
            $problems = \DateTimeImmutable::getLastErrors();
            if (false !== $date && (false === $problems || 0 === $problems['warning_count'] + $problems['error_count'])) {
                return $date; // 31/02 ou 15/13 : avertissement de dépassement → refusé
            }
        }

        return null;
    }

    private static function label(string $property): string
    {
        return match ($property) {
            'lastName' => 'Nom', 'firstName' => 'Prénom', 'dateOfBirth' => 'Date de naissance', default => $property,
        };
    }
}
