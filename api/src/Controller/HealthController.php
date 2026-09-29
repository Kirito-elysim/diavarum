<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sonde de santé : vérifie que l'API répond et que PostgreSQL est joignable.
 */
final class HealthController
{
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(Connection $connection): JsonResponse
    {
        try {
            $connection->executeQuery('SELECT 1');
            $database = 'ok';
        } catch (\Throwable) {
            $database = 'unreachable';
        }

        $healthy = 'ok' === $database;

        return new JsonResponse(
            ['status' => $healthy ? 'ok' : 'degraded', 'database' => $database],
            $healthy ? 200 : 503,
        );
    }
}
