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

    public function testNationalCodeUnlocksEveryNurse(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $this->requestAs($this->ide, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '909090']);
        self::assertResponseStatusCodeSame(403, 'Réservé aux administrateurs nationaux');

        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '909090']);
        self::assertResponseStatusCodeSame(204);
        self::assertQueuedEmailCount(0, null, 'Plus d\'email : les administrateurs sont prévenus dans l\'application');

        $this->requestAs($this->ide, 'POST', '/api/security-code/verify', ['code' => '909090']);
        self::assertResponseStatusCodeSame(204, 'Le code national déverrouille la séance de n\'importe quelle IDE');
    }

    public function testEveryNationalAdminCanDisplayTheCodeAfterConfirmingHerPassword(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $other = $this->createUser(UserRole::AdminNational);
        $cadre = $this->createUser(UserRole::Cadre, [$this->createCenter()]);

        $status = $this->requestAs($other, 'GET', '/api/national-security-code')->toArray();
        self::assertFalse($status['configured']);
        self::assertFalse($status['notice']);

        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '909090']);
        $status = $this->requestAs($other, 'GET', '/api/national-security-code')->toArray();
        self::assertTrue($status['configured'] && $status['revealable']);
        self::assertTrue($status['notice'], 'L\'autre administrateur doit être prévenu');
        self::assertSame($admin->getFullName(), $status['updatedBy']);
        self::assertFalse($this->requestAs($admin, 'GET', '/api/national-security-code')->toArray()['notice'], 'Celui qui change le code n\'est pas prévenu');
        self::assertArrayNotHasKey('code', $status);

        $this->requestAs($other, 'POST', '/api/national-security-code/reveal', ['password' => 'faux']);
        self::assertResponseStatusCodeSame(403);
        $response = $this->requestAs($other, 'POST', '/api/national-security-code/reveal', ['password' => self::PASSWORD]);
        self::assertSame('909090', $response->toArray()['code']);
        self::assertStringContainsString('no-store', $response->getHeaders()['cache-control'][0]);
        self::assertFalse($this->requestAs($other, 'GET', '/api/national-security-code')->toArray()['notice'], 'Après affichage, plus de notification');

        $this->requestAs($cadre, 'POST', '/api/national-security-code/reveal', ['password' => self::PASSWORD]);
        self::assertResponseStatusCodeSame(403, 'Ni les cadres ni les IDE ne voient le code');
        $this->requestAs($this->ide, 'GET', '/api/national-security-code');
        self::assertResponseStatusCodeSame(403);

        self::assertSame(1, (int) $this->em()->getConnection()->fetchOne("SELECT COUNT(*) FROM access_log WHERE detail = 'Code national affiché' AND user_email = :email", ['email' => $other->getEmail()]), 'Chaque affichage est tracé');
    }

    public function testNewChangeNotifiesAdminsAgainAndAcknowledgementClearsIt(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $other = $this->createUser(UserRole::AdminNational);

        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '111111']);
        $this->requestAs($other, 'POST', '/api/national-security-code/acknowledge');
        self::assertResponseStatusCodeSame(204);
        self::assertFalse($this->requestAs($other, 'GET', '/api/national-security-code')->toArray()['notice']);

        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '222222']);
        self::assertTrue($this->requestAs($other, 'GET', '/api/national-security-code')->toArray()['notice'], 'Un nouveau changement prévient de nouveau');
        self::assertSame('222222', $this->requestAs($other, 'POST', '/api/national-security-code/reveal', ['password' => self::PASSWORD])->toArray()['code']);
    }

    public function testCodeDefinedBeforeDisplayExistedCannotBeRevealed(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '333333']);
        $this->em()->getConnection()->executeStatement('UPDATE national_security_code SET code_encrypted = NULL, seen_by = \'[]\'');

        $status = $this->requestAs($admin, 'GET', '/api/national-security-code')->toArray();
        self::assertTrue($status['configured']);
        self::assertFalse($status['revealable']);
        self::assertFalse($status['notice'], 'Pas de popup pour un code qu\'on ne peut pas afficher');
        $this->requestAs($admin, 'POST', '/api/national-security-code/reveal', ['password' => self::PASSWORD]);
        self::assertResponseStatusCodeSame(409);
    }

    public function testDisplayIsRateLimited(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $this->requestAs($admin, 'PUT', '/api/national-security-code', ['password' => self::PASSWORD, 'code' => '444444']);
        $token = $this->tokenFor($admin);
        $reveal = fn (string $password) => $this->client->request('POST', '/api/national-security-code/reveal', ['auth_bearer' => $token, 'json' => ['password' => $password]]);

        for ($i = 0; $i < 5; ++$i) {
            $reveal('faux');
        }
        $reveal(self::PASSWORD);

        self::assertResponseStatusCodeSame(429, 'Même le bon mot de passe est refusé après 5 échecs');
    }
}
