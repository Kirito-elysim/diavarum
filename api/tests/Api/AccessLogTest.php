<?php

namespace App\Tests\Api;

use App\Enum\UserRole;
use Doctrine\DBAL\Connection;

/**
 * Journal des accès (cahier des charges §5 : traçabilité et journalisation des accès).
 */
final class AccessLogTest extends ApiTestCaseBase
{
    /**
     * @return array<string, mixed>|false dernière entrée correspondant aux critères
     */
    private function lastLog(string $where, array $params): array|false
    {
        return static::getContainer()->get(Connection::class)
            ->fetchAssociative("SELECT * FROM access_log WHERE $where ORDER BY occurred_at DESC, id DESC LIMIT 1", $params);
    }

    public function testReadingAPatientIsLoggedWithUserResourceAndIp(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);

        $this->requestAs($ide, 'GET', $this->iri($patient));

        $log = $this->lastLog('resource_id = :id', ['id' => $patient->getId()->toRfc4122()]);
        self::assertNotFalse($log);
        self::assertSame(['read', 'patients', 200, $ide->getId()->toRfc4122(), $ide->getEmail()], [$log['action'], $log['resource_type'], $log['status_code'], $log['user_id'], $log['user_email']]);
        self::assertNotEmpty($log['ip']);
    }

    public function testFailedLoginIsLoggedWithTheAttemptedEmail(): void
    {
        $this->client->request('POST', '/api/auth/login', ['json' => ['email' => 'inconnu@test.fr', 'password' => 'mauvais']]);

        $log = $this->lastLog("action = 'login_failure' AND user_email = :email", ['email' => 'inconnu@test.fr']);
        self::assertNotFalse($log);
        self::assertSame(401, $log['status_code']);
        self::assertNull($log['user_id']);
    }

    public function testExportsAreLogged(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);

        $this->requestAs($ide, 'GET', '/api/exports/patients.xlsx');

        self::assertNotFalse($this->lastLog("action = 'export' AND user_id = :id", ['id' => $ide->getId()->toRfc4122()]));
    }

    public function testOnlyNationalAdminsCanConsultTheLog(): void
    {
        $center = $this->createCenter();
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $admin = $this->createUser(UserRole::AdminNational);
        $patient = $this->createPatient($center, $cadre);
        $this->requestAs($cadre, 'GET', $this->iri($patient));

        $this->requestAs($cadre, 'GET', '/api/access_logs');
        self::assertResponseStatusCodeSame(403);

        $entries = $this->requestAs($admin, 'GET', '/api/access_logs?resourceId='.$patient->getId()->toRfc4122())->toArray();
        self::assertCount(1, $entries);
        self::assertSame($cadre->getEmail(), $entries[0]['userEmail']);
    }
}
