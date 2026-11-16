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

    public function testProvisionalPasswordMustBeReplacedByThePersonAndOnlyOnce(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->ide->getCenters()->first()]);
        $this->requestAs($cadre, 'PATCH', '/api/users/'.$this->ide->getId(), ['plainPassword' => 'Lavande-Castor-47']);
        self::assertResponseIsSuccessful();

        $login = $this->client->request('POST', '/api/auth/login', ['json' => ['email' => $this->ide->getEmail(), 'password' => 'Lavande-Castor-47']]);
        $token = $login->toArray()['token'];
        $me = fn () => $this->client->request('GET', '/api/me', ['auth_bearer' => $token, 'headers' => ['Accept' => 'application/json']])->toArray();
        self::assertTrue($me()['mustChangePassword'], 'Mot de passe fixé par un cadre : à remplacer');

        $this->client->request('PATCH', '/api/me', ['auth_bearer' => $token, 'headers' => ['Content-Type' => 'application/merge-patch+json'], 'json' => [
            'firstName' => 'Claire', 'lastName' => 'Durand', 'email' => $this->ide->getEmail(), 'currentPassword' => 'Lavande-Castor-47',
        ]]);
        self::assertTrue($me()['mustChangePassword'], 'Changer son nom ne lève pas l\'obligation');

        $this->client->request('PATCH', '/api/me', ['auth_bearer' => $token, 'headers' => ['Content-Type' => 'application/merge-patch+json'], 'json' => [
            'firstName' => 'Claire', 'lastName' => 'Durand', 'email' => $this->ide->getEmail(), 'currentPassword' => 'Lavande-Castor-47', 'newPassword' => 'Mon-Propre-Secret-2026!',
        ]]);
        self::assertResponseStatusCodeSame(204);

        $token = $this->client->request('POST', '/api/auth/login', ['json' => ['email' => $this->ide->getEmail(), 'password' => 'Mon-Propre-Secret-2026!']])->toArray()['token'];
        self::assertFalse($me()['mustChangePassword'], 'Plus d\'obligation une fois le mot de passe personnel choisi');
    }

    public function testAccountCreatedByACadreStartsWithAProvisionalPassword(): void
    {
        $center = $this->ide->getCenters()->first();
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $created = $this->requestAs($cadre, 'POST', '/api/users', [
            'email' => 'recrue.provisoire@test.fr', 'firstName' => 'Rita', 'lastName' => 'Recrue', 'role' => 'ide',
            'centers' => ['/api/centers/'.$center->getId()], 'plainPassword' => 'Un-mot-de-passe-solide-2026',
        ])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($created['mustChangePassword']);
    }
}
