<?php

namespace App\Reporting;

use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

/**
 * Périmètre des exports (cahier des charges §3) : une IDE exporte les patients de ses centres,
 * un cadre les statistiques de ses centres, un administrateur national tout (par défaut : le national).
 */
final class ReportingScope
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
    ) {
    }

    public function isNationalAdmin(): bool
    {
        return $this->security->isGranted('ROLE_ADMIN_NATIONAL');
    }

    /**
     * Centres d'une synthèse statistique.
     *
     * @param list<string> $requestedIds vide = tous les centres autorisés (le national pour un administrateur)
     *
     * @return list<Center>
     */
    public function centers(User $user, array $requestedIds): array
    {
        $allowed = $this->isNationalAdmin()
            ? $this->entityManager->getRepository(Center::class)->findBy(['archivedAt' => null], ['name' => 'ASC'])
            : array_values(array_filter($user->getCenters()->toArray(), static fn (Center $c) => !$c->isArchived()));

        if ([] === $requestedIds) {
            return $allowed;
        }

        $byId = [];
        foreach ($allowed as $center) {
            $byId[$center->getId()->toRfc4122()] = $center;
        }

        return array_map(static function (string $id) use ($byId): Center {
            return $byId[Uuid::isValid($id) ? Uuid::fromString($id)->toRfc4122() : $id]
                ?? throw new AccessDeniedHttpException('Centre hors de votre périmètre.');
        }, array_values(array_unique($requestedIds)));
    }

    /**
     * Patients d'un bilan : ceux demandés (chacun doit relever d'un centre autorisé) ou toute la file active.
     *
     * @param list<string> $requestedIds
     *
     * @return list<Patient>
     */
    public function patients(User $user, array $requestedIds): array
    {
        $centers = $this->centers($user, []);
        if ([] === $centers) {
            return [];
        }

        $qb = $this->entityManager->createQueryBuilder()
            ->select('p', 'c')
            ->from(Patient::class, 'p')
            ->join('p.center', 'c')
            ->andWhere('c IN (:centers)')
            ->setParameter('centers', $centers)
            ->orderBy('p.lastName')
            ->addOrderBy('p.firstName');

        if ([] === $requestedIds) {
            return $qb->andWhere('p.removedAt IS NULL')->getQuery()->getResult();
        }

        $ids = array_values(array_unique(array_filter($requestedIds, Uuid::isValid(...))));
        $patients = $qb->andWhere('p.id IN (:ids)')
            ->setParameter('ids', array_map(static fn (string $id) => Uuid::fromString($id)->toRfc4122(), $ids))
            ->getQuery()->getResult();

        // Un patient hors périmètre est « introuvable », comme partout ailleurs dans l'API
        if (\count($patients) !== \count(array_unique($requestedIds))) {
            throw new NotFoundHttpException('Patient introuvable.');
        }

        return $patients;
    }
}
