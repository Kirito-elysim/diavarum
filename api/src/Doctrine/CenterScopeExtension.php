<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Center;
use App\Entity\CodexTest;
use App\Entity\Patient;
use App\Entity\ProgramModule;
use App\Entity\SessionCompetencyValidation;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Cloisonnement des données par centre, appliqué à toutes les lectures de l'API
 * (listes et éléments) : une IDE ou un cadre ne voit que ce qui relève de ses centres,
 * un administrateur national voit tout. Hors périmètre, un élément répond 404.
 *
 * Les éléments archivés (patients sortis de la file active, comptes, centres, cours, thématiques
 * et compétences supprimés)
 * sont masqués des listes mais restent consultables individuellement (historique).
 */
final class CenterScopeExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    /** Chemin d'associations de la ressource vers son centre */
    private const CENTER_PATHS = [
        Patient::class => 'center',
        TrainingProgram::class => 'patient.center',
        ProgramModule::class => 'program.patient.center',
        TrainingSession::class => 'patient.center',
        SessionCompetencyValidation::class => 'session.patient.center',
        CodexTest::class => 'patient.center',
    ];

    private const ARCHIVE_FIELDS = [
        Patient::class => 'removedAt',
        User::class => 'archivedAt',
        Center::class => 'archivedAt',
        \App\Entity\Module::class => 'archivedAt',
        \App\Entity\Chapter::class => 'archivedAt',
        \App\Entity\ModuleCompetency::class => 'archivedAt',
    ];

    public function __construct(private readonly Security $security)
    {
    }

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        $this->restrictToUserCenters($queryBuilder, $queryNameGenerator, $resourceClass);

        if (isset(self::ARCHIVE_FIELDS[$resourceClass])) {
            $condition = match ($this->archiveStatus($resourceClass, $context)) {
                'all' => null,
                'archived' => 'IS NOT NULL',
                default => 'IS NULL',
            };
            if (null !== $condition) {
                $alias = $queryBuilder->getRootAliases()[0];
                $queryBuilder->andWhere(\sprintf('%s.%s %s', $alias, self::ARCHIVE_FIELDS[$resourceClass], $condition));
            }
        }
    }

    /**
     * Comptes désactivés et centres archivés : listables sur demande (?status=archived|all)
     * par ceux qui peuvent les réactiver — cadre et administrateur pour les comptes,
     * administrateur pour les centres. Partout ailleurs, seuls les éléments actifs sont listés.
     */
    private function archiveStatus(string $resourceClass, array $context): string
    {
        $status = $context['filters']['status'] ?? 'active';
        $allowed = match ($resourceClass) {
            User::class => $this->security->isGranted('ROLE_CADRE'),
            Center::class => $this->security->isGranted('ROLE_ADMIN_NATIONAL'),
            default => false,
        };

        return $allowed && \in_array($status, ['archived', 'all'], true) ? $status : 'active';
    }

    public function applyToItem(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, array $identifiers, ?Operation $operation = null, array $context = []): void
    {
        $this->restrictToUserCenters($queryBuilder, $queryNameGenerator, $resourceClass);
    }

    private function restrictToUserCenters(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass): void
    {
        if (\App\Entity\Module::class === $resourceClass && !$this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            $queryBuilder->andWhere($queryBuilder->getRootAliases()[0].'.published = true');
        }
        $isScoped = isset(self::CENTER_PATHS[$resourceClass]) || Center::class === $resourceClass || User::class === $resourceClass;
        if (!$isScoped || $this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            return;
        }

        $root = $queryBuilder->getRootAliases()[0];
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            $queryBuilder->andWhere('1 = 0');

            return;
        }

        $userParam = $queryNameGenerator->generateParameterName('scope_user');
        $queryBuilder->setParameter($userParam, $user->getId(), 'uuid');
        $myCenterIds = $this->myCenterIdsDql($queryNameGenerator, $userParam);

        if (Center::class === $resourceClass) {
            $queryBuilder->andWhere(\sprintf('%s.id IN (%s)', $root, $myCenterIds));

            return;
        }

        if (User::class === $resourceClass) {
            // Soi-même, ou tout compte partageant au moins un centre
            $other = $queryNameGenerator->generateJoinAlias('scope_other');
            $otherCenter = $queryNameGenerator->generateJoinAlias('scope_other_center');
            $queryBuilder->andWhere(\sprintf(
                '%1$s.id = :%2$s OR EXISTS (SELECT %3$s.id FROM %4$s %3$s JOIN %3$s.centers %5$s WHERE %3$s = %1$s AND %5$s.id IN (%6$s))',
                $root, $userParam, $other, User::class, $otherCenter, $myCenterIds,
            ));

            return;
        }

        // Jointures successives jusqu'au dernier maillon (ex. patient.center → JOIN o.patient p … p.center)
        $segments = explode('.', self::CENTER_PATHS[$resourceClass]);
        $centerField = array_pop($segments);
        $alias = $root;
        foreach ($segments as $association) {
            $joinAlias = $queryNameGenerator->generateJoinAlias($association);
            $queryBuilder->innerJoin(\sprintf('%s.%s', $alias, $association), $joinAlias);
            $alias = $joinAlias;
        }

        $queryBuilder->andWhere(\sprintf('IDENTITY(%s.%s) IN (%s)', $alias, $centerField, $myCenterIds));
    }

    /** Sous-requête DQL : identifiants des centres de l'utilisateur connecté */
    private function myCenterIdsDql(QueryNameGeneratorInterface $queryNameGenerator, string $userParam): string
    {
        $me = $queryNameGenerator->generateJoinAlias('scope_me');
        $myCenter = $queryNameGenerator->generateJoinAlias('scope_my_center');

        return \sprintf('SELECT %2$s.id FROM %3$s %1$s JOIN %1$s.centers %2$s WHERE %1$s.id = :%4$s', $me, $myCenter, User::class, $userParam);
    }
}
