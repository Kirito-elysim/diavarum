<?php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Lecture des centres enrichie de leurs indicateurs : patients de la file active,
 * IDE et cadres affiliés (comptes actifs). Deux requêtes groupées pour toute la page.
 *
 * @implements ProviderInterface<Center>
 */
final class CenterProvider implements ProviderInterface
{
    /**
     * @param ProviderInterface<Center> $collectionProvider
     * @param ProviderInterface<Center> $itemProvider
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private readonly ProviderInterface $collectionProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private readonly ProviderInterface $itemProvider,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            $centers = $this->collectionProvider->provide($operation, $uriVariables, $context);
            $this->addStatistics(is_iterable($centers) ? iterator_to_array($centers, false) : []);

            return $centers;
        }

        $center = $this->itemProvider->provide($operation, $uriVariables, $context);
        if ($center instanceof Center) {
            $this->addStatistics([$center]);
        }

        return $center;
    }

    /** @param list<Center> $centers */
    private function addStatistics(array $centers): void
    {
        if ([] === $centers) {
            return;
        }

        $patients = [];
        foreach ($this->entityManager->createQueryBuilder()
            ->select('IDENTITY(p.center) AS center', 'COUNT(p.id) AS total')
            ->from(Patient::class, 'p')
            ->where('p.center IN (:centers)')->andWhere('p.removedAt IS NULL')
            ->groupBy('p.center')
            ->setParameter('centers', $centers)
            ->getQuery()->getArrayResult() as $row) {
            $patients[(string) $row['center']] = (int) $row['total'];
        }

        $nurses = [];
        $managers = [];
        foreach ($this->entityManager->createQueryBuilder()
            ->select('c.id AS center', 'u.id', 'u.firstName', 'u.lastName', 'u.role')
            ->from(User::class, 'u')
            ->join('u.centers', 'c')
            ->where('c IN (:centers)')->andWhere('u.archivedAt IS NULL')
            ->andWhere('u.role IN (:roles)')
            ->orderBy('u.lastName', 'ASC')
            ->setParameter('centers', $centers)
            ->setParameter('roles', [UserRole::Ide, UserRole::Cadre])
            ->getQuery()->getArrayResult() as $row) {
            $center = (string) $row['center'];
            $role = $row['role'] instanceof UserRole ? $row['role'] : UserRole::from($row['role']);
            if (UserRole::Ide === $role) {
                $nurses[$center] = ($nurses[$center] ?? 0) + 1;
            } else {
                $managers[$center][] = ['id' => (string) $row['id'], 'name' => $row['firstName'].' '.$row['lastName']];
            }
        }

        foreach ($centers as $center) {
            $id = (string) $center->getId();
            $center->setStatistics($patients[$id] ?? 0, $nurses[$id] ?? 0, $managers[$id] ?? []);
        }
    }
}
