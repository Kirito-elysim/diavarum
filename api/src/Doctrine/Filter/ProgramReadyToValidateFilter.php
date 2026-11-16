<?php

namespace App\Doctrine\Filter;

use ApiPlatform\Doctrine\Orm\Filter\FilterInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

/**
 * Parcours à valider par un cadre : ni achevé ni interrompu, avec au moins une séance sélectionnée
 * et toutes les séances sélectionnées validées.
 */
final class ProgramReadyToValidateFilter implements FilterInterface
{
    public function getDescription(string $resourceClass): array { return []; }

    public static function condition(string $alias): string
    {
        return "$alias.status IN ('non_actif', 'actif')"
            ." AND EXISTS (SELECT sel.id FROM App\\Entity\\ProgramModule sel WHERE sel.program = $alias AND sel.selected = true)"
            ." AND NOT EXISTS (SELECT todo.id FROM App\\Entity\\ProgramModule todo WHERE todo.program = $alias AND todo.selected = true AND todo.validatedAt IS NULL)";
    }

    public function apply(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        if ('true' !== (string) ($context['parameter']?->getValue() ?? '')) {
            return;
        }
        $queryBuilder->andWhere(self::condition($queryBuilder->getRootAliases()[0]));
    }
}
