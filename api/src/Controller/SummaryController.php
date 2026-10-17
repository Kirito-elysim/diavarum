<?php

namespace App\Controller;

use ApiPlatform\Doctrine\Orm\Util\QueryNameGenerator;
use App\Doctrine\CenterScopeExtension;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\ProgramStatus;
use App\Enum\SessionStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Totaux des listes paginées (séances, parcours), avec les mêmes filtres et le même
 * cloisonnement par centre que les collections de l'API.
 */
#[IsGranted('ROLE_IDE')]
final class SummaryController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CenterScopeExtension $scope,
    ) {
    }

    /** Nombre de séances, score et durée moyens (séances validées) */
    #[Route('/api/summaries/sessions', name: 'api_summary_sessions', methods: ['GET'])]
    public function sessions(Request $request): JsonResponse
    {
        $qb = $this->scoped(TrainingSession::class, 's')->join('s.patient', 'sp')->join('s.module', 'sm');
        $this->filterCommon($qb, $request, 's', 'sp');
        if ($status = $request->query->getString('status')) {
            $qb->andWhere('s.status = :status')->setParameter('status', SessionStatus::tryFrom($status) ?? throw new BadRequestHttpException('Statut inconnu.'));
        }
        if ($nurse = self::id($request->query->getString('nurse'))) {
            $qb->andWhere('IDENTITY(s.nurse) = :nurse')->setParameter('nurse', $nurse, 'uuid');
        }
        if ($search = trim($request->query->getString('search'))) {
            $qb->andWhere('LOWER(sp.lastName) LIKE :search OR LOWER(sp.firstName) LIKE :search OR LOWER(sm.code) LIKE :search OR LOWER(sm.title) LIKE :search')
                ->setParameter('search', '%'.mb_strtolower(addcslashes($search, '%_')).'%');
        }
        $range = $request->query->all('startedAt');
        foreach (['after' => '>=', 'before' => '<='] as $key => $operator) {
            if (isset($range[$key]) && '' !== $range[$key]) {
                $date = date_create_immutable((string) $range[$key]) ?: throw new BadRequestHttpException('Date invalide.');
                $qb->andWhere("s.startedAt $operator :$key")->setParameter($key, $date);
            }
        }

        $row = $qb->select(
            'COUNT(s.id) AS total',
            'AVG(CASE WHEN s.status = :validated THEN s.score ELSE :none END) AS score',
            'AVG(CASE WHEN s.status = :validated THEN s.durationSeconds ELSE :none END) AS duration',
        )->setParameter('validated', SessionStatus::Validated)->setParameter('none', null)
            ->getQuery()->getSingleResult();

        return new JsonResponse([
            'count' => (int) $row['total'],
            'averageScore' => null === $row['score'] ? null : (int) round((float) $row['score']),
            'averageDurationSeconds' => null === $row['duration'] ? null : (int) round((float) $row['duration']),
        ]);
    }

    /** Nombre de parcours par statut (le filtre de statut de la liste n'est pas appliqué : on compte chaque statut) */
    #[Route('/api/summaries/training_programs', name: 'api_summary_programs', methods: ['GET'])]
    public function programs(Request $request): JsonResponse
    {
        $qb = $this->scoped(TrainingProgram::class, 'tp')->join('tp.patient', 'pp');
        $this->filterCommon($qb, $request, 'tp', 'pp');
        if ($search = trim($request->query->getString('search'))) {
            $qb->andWhere('LOWER(pp.lastName) LIKE :search OR LOWER(pp.firstName) LIKE :search')
                ->setParameter('search', '%'.mb_strtolower(addcslashes($search, '%_')).'%');
        }

        $counts = array_fill_keys(array_map(static fn (ProgramStatus $s) => $s->value, ProgramStatus::cases()), 0);
        foreach ($qb->select('tp.status AS status', 'COUNT(tp.id) AS total')->groupBy('tp.status')->getQuery()->getArrayResult() as $row) {
            $status = $row['status'] instanceof ProgramStatus ? $row['status']->value : (string) $row['status'];
            $counts[$status] = (int) $row['total'];
        }

        return new JsonResponse(['total' => array_sum($counts), 'byStatus' => $counts]);
    }

    /** Requête limitée aux centres de l'utilisateur, comme les collections de l'API */
    private function scoped(string $class, string $alias): QueryBuilder
    {
        $qb = $this->entityManager->createQueryBuilder()->select($alias)->from($class, $alias);
        $this->scope->applyToCollection($qb, new QueryNameGenerator(), $class);

        return $qb;
    }

    private function filterCommon(QueryBuilder $qb, Request $request, string $alias, string $patientAlias): void
    {
        if ($center = self::id($request->query->getString('center'))) {
            $qb->andWhere("IDENTITY($patientAlias.center) = :center")->setParameter('center', $center, 'uuid');
        }
    }

    /** « /api/centers/<uuid> » ou « <uuid> » → identifiant */
    private static function id(string $value): ?string
    {
        if ('' === $value) {
            return null;
        }
        $id = basename($value);

        return Uuid::isValid($id) ? $id : throw new BadRequestHttpException(\sprintf('Identifiant « %s » invalide.', $value));
    }
}
