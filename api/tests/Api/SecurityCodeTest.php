<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Enum\UserRole;

/**
 * Code personnel de l'IDE et code « garde-fou » national, demandés pour quitter une séance.
 */
final class SecurityCodeTest extends ApiTestCaseBase
{
    private User $ide;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
    }

    public function testIdeSetsHerCodeAfterConfirmingHerPassword(): void
    {
        $this->requestAs($this->ide, 'PUT', '/api/me/security-code', ['password' => 'faux', 'code' => '2468']);
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($this->ide, 'PUT', '/api/me/security-code', ['password' => self::PASSWORD, 'code' => '2468']);
        self::assertResponseStatusCodeSame(204);

        self::assertTrue($this->requestAs($this->ide, 'GET', '/api/me')->toArray()['securityCodeConfigured']);
        $this->requestAs($this->ide, 'POST', '/api/security-code/verify', ['code' => '2468']);
        self::assertResponseStatusCodeSame(204);
    }

    public function testCodeMustBe4To6Digits(): void
    {
        $this->requestAs($this->ide, 'PUT', '/api/me/security-code', ['password' => self::PASSWORD, 'code' => '12a4']);

        self::assertResponseStatusCodeSame(422);
    }

    public function testWrongCodeIsRejectedAndVerificationIsRateLimited(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()], securityCode: '1357');
        $token = $this->tokenFor($ide);
        $verify = fn (string $code) => $this->client->request('POST', '/api/security-code/verify', ['auth_bearer' => $token, 'json' => ['code' => $code]]);

        $verify('0000');
        self::assertResponseStatusCodeSame(403);

        for ($i = 0; $i < 4; ++$i) {
            $verify('0000');
        }
        $verify('1357');

        self::assertResponseStatusCodeSame(429, 'Même le bon code est refusé après 5 échecs');
    }

    public function testNationalCodeUnlocksEveryNurseAndIsSentToAllNationalAdmins(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $otherAdmin = $this->createUser(UserRole::AdminNational);

        $this->requestAs($this->ide, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '909090']);
        self::assertResponseStatusCodeSame(403, 'Réservé aux administrateurs nationaux');

        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '909090']);
        self::assertResponseStatusCodeSame(204);

        // Emails mis en file d'attente (envoyés par le worker), un par administrateur national
        self::assertQueuedEmailCount(2);
        $recipients = array_map(static fn ($email) => $email->getTo()[0]->getAddress(), self::getMailerMessages());
        sort($recipients);
        $expected = [$admin->getEmail(), $otherAdmin->getEmail()];
        sort($expected);
        self::assertSame($expected, $recipients);

        $this->requestAs($this->ide, 'POST', '/api/security-code/verify', ['code' => '909090']);
        self::assertResponseStatusCodeSame(204, 'Le code national déverrouille la séance de n\'importe quelle IDE');
    }
}
