<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;
use Symfony\Component\Uid\Uuid;

/**
 * Journalise chaque appel à l'API (qui, quand, quoi, résultat, adresse IP), connexions comprises.
 * Écrit après l'envoi de la réponse et directement en base (DBAL) : ne ralentit ni ne fait échouer la requête.
 */
final class AccessLogSubscriber
{
    /** Routes techniques, sans donnée personnelle */
    private const IGNORED = '#^/api/(health|docs|contexts|auth/refresh)(/|\.|$)#';
    private const LOGIN_EMAIL = '_access_log_login_email';

    public function __construct(
        private readonly Connection $connection,
        private readonly Security $security,
        private readonly LoggerInterface $logger,
    ) {
    }

    /** Email saisi lors d'une connexion échouée (aucun utilisateur authentifié à ce stade) */
    #[AsEventListener]
    public function onLoginFailure(LoginFailureEvent $event): void
    {
        // Déclenché aussi par un refresh token refusé : on ne s'intéresse qu'au formulaire de connexion
        $request = $event->getRequest();
        if ('/api/auth/login' !== $request->getPathInfo()) {
            return;
        }

        // Lecture défensive : corps vide ou JSON invalide ne doivent rien casser
        $payload = json_decode($request->getContent(), true);
        $email = \is_array($payload) && \is_string($payload['email'] ?? null) ? mb_substr($payload['email'], 0, 180) : null;
        $request->attributes->set(self::LOGIN_EMAIL, $email);
    }

    #[AsEventListener(event: KernelEvents::TERMINATE)]
    public function onTerminate(TerminateEvent $event): void
    {
        $request = $event->getRequest();
        $path = $request->getPathInfo();
        if (!str_starts_with($path, '/api') || 'OPTIONS' === $request->getMethod() || preg_match(self::IGNORED, $path)) {
            return;
        }

        $status = $event->getResponse()->getStatusCode();
        $user = $this->security->getUser();
        [$resourceType, $resourceId] = $this->resource($path);

        try {
            $this->connection->insert('access_log', [
                'id' => Uuid::v7()->toRfc4122(),
                'occurred_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:sP'),
                'user_id' => $user instanceof User ? $user->getId()->toRfc4122() : null,
                'user_email' => $user instanceof User ? $user->getEmail() : $request->attributes->get(self::LOGIN_EMAIL),
                'action' => $this->action($request, $path, $status),
                'method' => $request->getMethod(),
                'path' => mb_substr($path, 0, 255),
                'resource_type' => $resourceType,
                'resource_id' => $resourceId,
                'status_code' => $status,
                'ip' => $request->getClientIp(),
                'user_agent' => mb_substr((string) $request->headers->get('User-Agent'), 0, 255) ?: null,
            ]);
        } catch (\Throwable $e) {
            // Le journal ne doit jamais faire échouer l'utilisateur, mais l'anomalie doit être visible
            $this->logger->error('Journal des accès : écriture impossible', ['exception' => $e, 'path' => $path]);
        }
    }

    private function action(Request $request, string $path, int $status): string
    {
        return match (true) {
            '/api/auth/login' === $path => $status < 400 ? 'login_success' : 'login_failure',
            '/api/auth/logout' === $path => 'logout',
            str_starts_with($path, '/api/exports/') => 'export',
            'GET' === $request->getMethod() => 'read',
            'DELETE' === $request->getMethod() => 'delete',
            \in_array($request->getMethod(), ['PATCH', 'PUT'], true) => 'update',
            (bool) preg_match('#/[0-9a-f-]{36}/[a-z-]+$#', $path) => 'action',
            default => 'create',
        };
    }

    /**
     * @return array{0: string|null, 1: string|null} type de ressource (segment d'URL) et identifiant
     */
    private function resource(string $path): array
    {
        if (!preg_match('#^/api/(?:exports/)?([a-z_\-]+)(?:\.[a-z]+)?(?:/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?#', $path, $m)) {
            return [null, null];
        }

        return [$m[1], $m[2] ?? null];
    }
}
