<?php

namespace App\Controller;

use App\Dto\ModuleContentRequest;
use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\SessionCompetencyValidation;
use App\Exception\WorkflowException;
use App\Training\ContentValidator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * API d'intégration des contenus (cahier des charges §4), désignée par le code stable de la séance (S4, O2, PT…).
 *
 * Accès : administrateur national (JWT) ou prestataire de contenus avec l'en-tête X-Content-Token.
 * Ce jeton technique ne donne accès qu'aux contenus, jamais aux données patients.
 */
final class ContentIntegrationController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ContentValidator $validator,
        private readonly Security $security,
        #[Autowire(env: 'default::CONTENT_API_TOKEN')]
        private readonly ?string $contentToken,
    ) {
    }

    #[Route('/api/content/modules/{code}', name: 'api_content_module_get', requirements: ['code' => '[A-Z0-9]{1,10}'], methods: ['GET'])]
    public function get(string $code, Request $request): JsonResponse
    {
        $this->assertAllowed($request);

        return new JsonResponse($this->export($this->module($code)));
    }

    #[Route('/api/content/modules/{code}', name: 'api_content_module_put', requirements: ['code' => '[A-Z0-9]{1,10}'], methods: ['PUT'])]
    public function put(string $code, Request $request, #[MapRequestPayload] ModuleContentRequest $payload): JsonResponse
    {
        $this->assertAllowed($request);
        $module = $this->module($code);

        $errors = $this->validator->validate($payload->content);
        if ([] !== $errors) {
            return new JsonResponse(['title' => 'Contenu invalide', 'detail' => implode(' ', $errors), 'errors' => $errors], 422);
        }

        $module->setTitle($payload->title)
            ->setDescription($payload->description)
            ->setEstimatedDuration($payload->estimatedDuration)
            ->setPublished($payload->published)
            ->setContent($payload->content);
        $this->syncCompetencies($module, array_values($payload->competencies));
        $this->entityManager->flush();

        return new JsonResponse($this->export($module));
    }

    /**
     * Compétences mises à jour par position ; une compétence déjà évaluée en séance ne peut pas être supprimée.
     *
     * @param list<string> $labels
     */
    private function syncCompetencies(Module $module, array $labels): void
    {
        $existing = $module->getCompetencies()->toArray();
        usort($existing, static fn (ModuleCompetency $a, ModuleCompetency $b) => $a->getPosition() <=> $b->getPosition());

        foreach ($labels as $position => $label) {
            $competency = $existing[$position] ?? null;
            if (null === $competency) {
                $competency = (new ModuleCompetency())->setModule($module);
                $module->getCompetencies()->add($competency);
                $this->entityManager->persist($competency);
            }
            $competency->setLabel($label)->setPosition($position);
        }

        foreach (\array_slice($existing, \count($labels)) as $removed) {
            $used = $this->entityManager->getRepository(SessionCompetencyValidation::class)->count(['competency' => $removed]);
            if ($used > 0) {
                throw new WorkflowException(\sprintf('La compétence « %s » a déjà été évaluée en séance : elle ne peut pas être supprimée.', $removed->getLabel()));
            }
            $module->getCompetencies()->removeElement($removed);
            $this->entityManager->remove($removed);
        }
    }

    private function assertAllowed(Request $request): void
    {
        if ($this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            return;
        }

        $token = $request->headers->get('X-Content-Token');
        if (null === $token && null === $this->security->getUser()) {
            throw new UnauthorizedHttpException('X-Content-Token', 'Authentification requise.');
        }
        if (null === $token || '' === (string) $this->contentToken || !hash_equals((string) $this->contentToken, $token)) {
            throw new AccessDeniedHttpException('Accès réservé au prestataire de contenus et aux administrateurs nationaux.');
        }
    }

    private function module(string $code): Module
    {
        return $this->entityManager->getRepository(Module::class)->findOneBy(['code' => $code])
            ?? throw new NotFoundHttpException(\sprintf('Séance %s inconnue.', $code));
    }

    /**
     * @return array<string, mixed>
     */
    private function export(Module $module): array
    {
        $competencies = $module->getCompetencies()->toArray();
        usort($competencies, static fn (ModuleCompetency $a, ModuleCompetency $b) => $a->getPosition() <=> $b->getPosition());

        return [
            'code' => $module->getCode(),
            'title' => $module->getTitle(),
            'description' => $module->getDescription(),
            'estimatedDuration' => $module->getEstimatedDuration(),
            'published' => $module->isPublished(),
            'competencies' => array_map(static fn (ModuleCompetency $c) => $c->getLabel(), $competencies),
            'content' => $module->getContent(),
        ];
    }
}
