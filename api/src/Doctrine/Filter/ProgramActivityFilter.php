<?php

namespace App\Doctrine\Filter;

use ApiPlatform\Doctrine\Orm\Filter\FilterInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/** Même classification que TrainingProgram::activityStatusAt, filtrée avant pagination. */
final class ProgramActivityFilter implements FilterInterface
{
    public function getDescription(string $resourceClass): array { return []; }

    public static function expression(string $alias, string $boundary): string
    {
        return "CASE WHEN $alias.status IN ('acheve', 'interrompu') THEN $alias.status WHEN COALESCE($alias.lastActivityAt, $alias.startedAt) IS NULL THEN 'non_demarre' WHEN COALESCE($alias.lastActivityAt, $alias.startedAt) <= :$boundary THEN 'non_actif' ELSE 'actif' END";
    }

    public function apply(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        $value = $context['parameter']?->getValue() ?? null;
        if (null === $value) return;
        if (!\is_string($value) || !\in_array($value, ['non_demarre', 'non_actif', 'actif', 'interrompu', 'acheve'], true)) {
            throw new BadRequestHttpException('Statut d’activité inconnu.');
        }
        $boundary = $queryNameGenerator->generateParameterName('activityBoundary');
        $status = $queryNameGenerator->generateParameterName('activityStatus');
        $queryBuilder->andWhere(self::expression($queryBuilder->getRootAliases()[0], $boundary)." = :$status")
            ->setParameter($boundary, new \DateTimeImmutable('-15 days'), Types::DATETIMETZ_IMMUTABLE)
            ->setParameter($status, $value);
    }
}
