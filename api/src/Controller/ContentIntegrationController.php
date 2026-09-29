<?php

namespace App\Controller;

use App\Dto\ModuleContentRequest;
use App\Training\ModuleContentImporter;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
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
        private readonly ModuleContentImporter $importer,
        private readonly Security $security,
        #[Autowire(env: 'default::CONTENT_API_TOKEN')]
        private readonly ?string $contentToken,
    ) {
    }

    #[Route('/api/content/modules/{code}', name: 'api_content_module_get', requirements: ['code' => '[A-Z0-9]{1,10}'], methods: ['GET'])]
    public function get(string $code, Request $request): JsonResponse
    {
        $this->assertAllowed($request);

        return new JsonResponse($this->importer->export($this->importer->find($code)));
    }

    #[Route('/api/content/modules/{code}', name: 'api_content_module_put', requirements: ['code' => '[A-Z0-9]{1,10}'], methods: ['PUT'])]
    public function put(string $code, Request $request, #[MapRequestPayload] ModuleContentRequest $payload): JsonResponse
    {
        $this->assertAllowed($request);
        $module = $this->importer->find($code);

        $errors = $this->importer->import(
            $module, $payload->title, $payload->description, $payload->estimatedDuration,
            $payload->published, $payload->content, $payload->competencies,
        );
        if ([] !== $errors) {
            return new JsonResponse(['title' => 'Contenu invalide', 'detail' => implode(' ', $errors), 'errors' => $errors], 422);
        }

        return new JsonResponse($this->importer->export($module));
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
}
