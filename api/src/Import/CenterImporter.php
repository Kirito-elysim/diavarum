<?php

namespace App\Import;

use App\Entity\Center;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Import de centres en masse (administrateur national). Chaque ligne est validée comme
 * une création via l'API ; l'import est « tout ou rien ».
 */
final class CenterImporter
{
    public const COLUMNS = [
        'name' => ['nom', 'nom du centre', 'centre'],
        'city' => ['ville', 'commune'],
        'finess' => ['n finess', 'finess', 'numero finess'],
        'address' => ['adresse', 'rue'],
        'postalCode' => ['code postal', 'cp'],
        'region' => ['region'],
        'phone' => ['telephone', 'tel'],
        'email' => ['email', 'mail', 'courriel'],
        'stations' => ['postes de dialyse', 'postes', 'nombre de postes'],
    ];
    public const REQUIRED = ['name', 'city'];

    public function __construct(
        private readonly SpreadsheetReader $reader,
        private readonly ValidatorInterface $validator,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @return array{valid: bool, rows: list<array{line: int, label: string, errors: list<string>}>, created: int}
     */
    public function import(UploadedFile $file, bool $commit): array
    {
        $regions = [];
        foreach (Center::REGIONS as $region) {
            $regions[SpreadsheetReader::normalize($region)] = $region;
        }
        $existingNames = [];
        foreach ($this->entityManager->getRepository(Center::class)->findAll() as $center) {
            $existingNames[self::key($center->getName(), $center->getCity())] = true;
        }

        $report = [];
        $centers = [];
        $seenFiness = [];
        foreach ($this->reader->read($file, self::COLUMNS, self::REQUIRED) as ['line' => $line, 'values' => $v]) {
            $errors = [];
            $center = (new Center())
                ->setName($v['name'] ?? '')->setCity($v['city'] ?? '')
                ->setFiness(self::finess($v['finess'] ?? null))->setAddress($v['address'] ?? null)
                ->setPostalCode(self::postalCode($v['postalCode'] ?? null))->setPhone(self::phone($v['phone'] ?? null))
                ->setEmail($v['email'] ?? null);

            $region = $v['region'] ?? '';
            if ('' !== $region) {
                $center->setRegion($regions[SpreadsheetReader::normalize($region)] ?? $region);
            }
            $stations = $v['stations'] ?? '';
            if ('' !== $stations) {
                ctype_digit($stations) ? $center->setStations((int) $stations) : $errors[] = 'Postes de dialyse : nombre entier attendu.';
            }

            foreach ($this->validator->validate($center) as $violation) {
                $errors[] = self::label($violation->getPropertyPath()).' : '.$violation->getMessage();
            }
            $key = self::key($center->getName(), $center->getCity());
            if (isset($existingNames[$key])) {
                $errors[] = 'Un centre de ce nom existe déjà dans cette ville.';
            }
            $existingNames[$key] = true;
            if (null !== $center->getFiness()) {
                if (isset($seenFiness[$center->getFiness()])) {
                    $errors[] = \sprintf('N° FINESS déjà présent ligne %d.', $seenFiness[$center->getFiness()]);
                }
                $seenFiness[$center->getFiness()] ??= $line;
            }

            $report[] = ['line' => $line, 'label' => trim($center->getName().' — '.$center->getCity(), ' —'), 'errors' => array_values(array_unique($errors))];
            $centers[] = $center;
        }

        $valid = [] === array_filter($report, static fn (array $r) => [] !== $r['errors']);
        if ($commit && $valid) {
            $this->entityManager->wrapInTransaction(function () use ($centers): void {
                foreach ($centers as $center) {
                    $this->entityManager->persist($center);
                }
            });
        }

        return ['valid' => $valid, 'rows' => $report, 'created' => $commit && $valid ? \count($centers) : 0];
    }

    private static function key(string $name, string $city): string
    {
        return SpreadsheetReader::normalize($name).'|'.SpreadsheetReader::normalize($city);
    }

    /** Excel enlève le zéro initial des codes postaux saisis comme nombres (01000 → 1000) */
    private static function postalCode(?string $value): ?string
    {
        return null !== $value && preg_match('/^\d{4}$/', $value) ? '0'.$value : $value;
    }

    /** … des numéros FINESS des départements 01 à 09 … */
    private static function finess(?string $value): ?string
    {
        return null !== $value && preg_match('/^\d{8}$/', $value) ? '0'.$value : $value;
    }

    /** … et des numéros de téléphone (0142… → 142…) */
    private static function phone(?string $value): ?string
    {
        return null !== $value && preg_match('/^[1-9]\d{8}$/', $value) ? '0'.$value : $value;
    }

    private static function label(string $property): string
    {
        return match ($property) {
            'name' => 'Nom', 'city' => 'Ville', 'finess' => 'N° FINESS', 'address' => 'Adresse',
            'postalCode' => 'Code postal', 'region' => 'Région', 'phone' => 'Téléphone',
            'email' => 'Email', 'stations' => 'Postes de dialyse', default => $property,
        };
    }
}
