<?php

namespace App\Import;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Centres utilisables dans un import et reconnaissance d'un centre saisi dans une cellule
 * (nom, sans tenir compte de la casse ni des accents, ou N° FINESS).
 */
final class CenterResolver
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * Centres actifs dans lesquels l'auteur de l'import peut créer (tous pour l'administrateur national).
     *
     * @return list<Center>
     */
    public function allowedCenters(User $actor): array
    {
        return UserRole::AdminNational === $actor->getRole()
            ? $this->entityManager->getRepository(Center::class)->findBy(['archivedAt' => null], ['name' => 'ASC'])
            : array_values(array_filter($actor->getCenters()->toArray(), static fn (Center $c) => !$c->isArchived()));
    }

    /**
     * @param list<Center> $centers
     *
     * @return \Closure(string): ?Center
     */
    public function matcher(array $centers): \Closure
    {
        $byKey = [];
        foreach ($centers as $center) {
            $byKey[SpreadsheetReader::normalize($center->getName())] = $center;
            if (null !== $center->getFiness()) {
                $byKey[strtolower($center->getFiness())] = $center;
            }
        }

        return static fn (string $value): ?Center => $byKey[SpreadsheetReader::normalize($value)]
            ?? $byKey[strtolower(str_replace(' ', '', $value))]
            ?? (preg_match('/^\d{8}$/', $value) ? $byKey['0'.$value] ?? null : null); // FINESS 01… à 09… saisi comme nombre
    }
}
