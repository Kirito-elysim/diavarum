<?php

namespace App\Service;

use App\Entity\Center;
use App\Entity\Patient;
use App\Import\SpreadsheetReader;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Doublons d'un patient parmi ceux des centres de l'auteur (rien n'est révélé hors de ce périmètre) :
 * erreur si le même patient existe, actif ou archivé, dans le même centre ; avertissement s'il existe dans
 * un autre centre ou si un homonyme (mêmes nom et prénom, autre date de naissance) existe.
 * Partagé par l'import en masse, la création manuelle et sa vérification préalable.
 */
final class PatientDuplicates
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param list<Center> $centers
     *
     * @return array{active: array<string, true>, archived: array<string, true>, people: array<string, list<array{center: string, archived: bool}>>, names: array<string, list<array{center: string, birth: ?string, archived: bool}>>}
     */
    public function index(array $centers): array
    {
        $index = ['active' => [], 'archived' => [], 'people' => [], 'names' => []];
        if ([] === $centers) {
            return $index;
        }
        foreach ($this->entityManager->getRepository(Patient::class)->findBy(['center' => $centers]) as $patient) {
            $archived = null !== $patient->getRemovedAt();
            $index[$archived ? 'archived' : 'active'][self::identity($patient, $patient->getCenter())] = true;
            $index['people'][self::person($patient)][] = ['center' => $patient->getCenter()->getName(), 'archived' => $archived];
            $index['names'][self::name($patient)][] = [
                'center' => $patient->getCenter()->getName(),
                'birth' => $patient->getDateOfBirth()?->format('Y-m-d'),
                'archived' => $archived,
            ];
        }

        return $index;
    }

    /**
     * @param array<string, mixed> $index résultat de index()
     *
     * @return array{errors: list<string>, warnings: list<string>}
     */
    public function inspect(array $index, Patient $patient, Center $center): array
    {
        $errors = [];
        $warnings = [];
        $identity = self::identity($patient, $center);
        if (isset($index['active'][$identity])) {
            $errors[] = 'Ce patient existe déjà dans ce centre (même nom, prénom et date de naissance).';
        } elseif (isset($index['archived'][$identity])) {
            $errors[] = 'Ce patient existe en archive dans ce centre : restaurez-le depuis la liste des archivés plutôt que de le recréer.';
        }

        foreach ($index['people'][self::person($patient)] ?? [] as $other) {
            if ($other['center'] !== $center->getName()) {
                $warnings[] = \sprintf('Ce patient existe déjà dans un autre centre : %s (%s).', $other['center'], $other['archived'] ? 'archivé' : 'actif');
            }
        }
        foreach (\array_slice($index['names'][self::name($patient)] ?? [], 0, 3) as $same) {
            if ($same['birth'] !== $patient->getDateOfBirth()?->format('Y-m-d')) {
                $warnings[] = \sprintf(
                    'Homonyme : un patient de même nom et prénom, né(e) le %s, existe déjà (%s, %s).',
                    $same['birth'] ? (new \DateTimeImmutable($same['birth']))->format('d/m/Y') : 'date inconnue',
                    $same['center'],
                    $same['archived'] ? 'archivé' : 'actif',
                );
            }
        }

        return ['errors' => $errors, 'warnings' => array_values(array_unique($warnings))];
    }

    public static function identity(Patient $patient, Center $center): string
    {
        return self::person($patient).'|'.$center->getId()->toRfc4122();
    }

    private static function person(Patient $patient): string
    {
        return self::name($patient).'|'.$patient->getDateOfBirth()?->format('Y-m-d');
    }

    private static function name(Patient $patient): string
    {
        return SpreadsheetReader::normalize($patient->getLastName()).'|'.SpreadsheetReader::normalize($patient->getFirstName());
    }
}
