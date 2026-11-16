<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Enum\UserRole;

/**
 * Modification de son propre compte : identité, email, mot de passe.
 */
final class ProfileTest extends ApiTestCaseBase
{
    private User $ide;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
    }

    private function update(array $changes): void
    {
        $this->requestAs($this->ide, 'PATCH', '/api/me', $changes + [
            'firstName' => 'Claire', 'lastName' => 'Durand', 'email' => $this->ide->getEmail(), 'currentPassword' => self::PASSWORD,
        ]);
    }

    public function testNameIsChangedAfterConfirmingThePassword(): void
    {
        $this->update(['firstName' => 'Camille', 'lastName' => 'Martin']);
        self::assertResponseStatusCodeSame(204);

        $me = $this->requestAs($this->ide, 'GET', '/api/me')->toArray();
        self::assertSame(['Camille', 'Martin'], [$me['firstName'], $me['lastName']]);
        self::assertSame(UserRole::Ide->value, $me['role'], 'Le rôle ne se modifie pas ici');
    }

    public function testWrongCurrentPasswordIsRefused(): void
    {
        $this->update(['currentPassword' => 'faux', 'firstName' => 'Pirate']);

        self::assertResponseStatusCodeSame(403);
        self::assertNotSame('Pirate', $this->requestAs($this->ide, 'GET', '/api/me')->toArray()['firstName']);
    }

    public function testEmailAlreadyUsedIsRefused(): void
    {
        $other = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $this->update(['email' => strtoupper($other->getEmail())]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testNewEmailAndPasswordWorkForTheNextLogin(): void
    {
        $this->update(['email' => 'nouvelle.adresse@diaverum.test', 'newPassword' => 'Nouveau-Secret-2026!']);
        self::assertResponseStatusCodeSame(204);

        self::assertSame(401, $this->login($this->ide)->getStatusCode(), 'Ancien email et ancien mot de passe');
        $response = $this->client->request('POST', '/api/auth/login', ['json' => ['email' => 'nouvelle.adresse@diaverum.test', 'password' => 'Nouveau-Secret-2026!']]);
        self::assertSame(200, $response->getStatusCode());
    }

    public function testWeakNewPasswordIsRefused(): void
    {
        $this->update(['newPassword' => 'court']);

        self::assertResponseStatusCodeSame(422);
    }
}
