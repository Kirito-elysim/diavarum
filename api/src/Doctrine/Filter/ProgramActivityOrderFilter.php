<?php

namespace App\Doctrine\Filter;

use ApiPlatform\Doctrine\Orm\Filter\FilterInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\QueryBuilder;

final class ProgramActivityOrderFilter implements FilterInterface
{
    public function getDescription(string $resourceClass): array { return []; }

    public function apply(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        $value = $context['parameter']?->getValue() ?? null;
        if (!\is_string($value) || !\in_array(strtolower($value), ['asc', 'desc'], true)) return;
        $boundary = $queryNameGenerator->generateParameterName('activityOrderBoundary');
        $alias = $queryNameGenerator->generateParameterName('activityOrder');
        $queryBuilder->addSelect(ProgramActivityFilter::expression($queryBuilder->getRootAliases()[0], $boundary)." AS HIDDEN $alias")
            ->setParameter($boundary, new \DateTimeImmutable('-15 days'), Types::DATETIMETZ_IMMUTABLE)
            ->orderBy($alias, strtoupper($value));
    }
}
