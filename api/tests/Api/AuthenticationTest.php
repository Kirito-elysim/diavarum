<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Enum\UserRole;

final class AuthenticationTest extends ApiTestCaseBase
{
    public function testLoginReturnsShortLivedJwtAndHttpOnlyRefreshCookie(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);

        $response = $this->login($user);

        self::assertResponseIsSuccessful();
        $body = $response->toArray();
        self::assertArrayHasKey('token', $body);
        self::assertArrayNotHasKey('refresh_token', $body, 'Le refresh token ne doit jamais être lisible par le JavaScript');

        $cookie = $response->getHeaders()['set-cookie'][0];
        self::assertStringContainsString('refresh_token=', $cookie);
        self::assertStringContainsStringIgnoringCase('httponly', $cookie);
        self::assertStringContainsStringIgnoringCase('path=/api/auth', $cookie);
        self::assertStringContainsStringIgnoringCase('samesite=strict', $cookie);
    }

    public function testWrongPasswordIsRejected(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);

        $this->login($user, 'mauvais-mot-de-passe');

        self::assertResponseStatusCodeSame(401);
    }

    public function testLoginIsLockedAfterFiveFailures(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        for ($i = 0; $i < 5; ++$i) {
            $this->login($user, 'mauvais-mot-de-passe');
        }

        // Même le bon mot de passe est refusé pendant le blocage
        $this->login($user);

        self::assertResponseStatusCodeSame(401);
    }

    public function testShiftChangeFromSharedCenterIpIsNotBlocked(): void
    {
        // Toutes les tablettes d'un centre partagent souvent la même IP : une relève ne doit pas bloquer le centre
        $center = $this->createCenter();
        $team = array_map(fn () => $this->createUser(UserRole::Ide, [$center]), range(1, 30));

        foreach ($team as $i => $nurse) {
            $this->login($nurse);
            self::assertResponseIsSuccessful(\sprintf('Connexion n°%d refusée', $i + 1));
        }
    }

    public function testArchivedAccountCannotLogIn(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $user->archive();
        $this->em()->flush();

        $this->login($user);

        self::assertResponseStatusCodeSame(401);
    }

    public function testArchivedAccountIsRejectedEvenWithAValidToken(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $token = $this->tokenFor($user);

        $this->em()->find(User::class, $user->getId())->archive();
        $this->em()->flush();

        $this->client->request('GET', '/api/me', ['auth_bearer' => $token]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testApiRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/patients');
        self::assertResponseStatusCodeSame(401);

        $this->client->request('GET', '/api/health');
        self::assertResponseIsSuccessful();
    }

    public function testRefreshIssuesNewTokenAndLogoutRevokesIt(): void
    {
        $user = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $this->login($user);

        $refreshed = $this->client->request('POST', '/api/auth/refresh');
        self::assertResponseIsSuccessful();
        self::assertArrayHasKey('token', $refreshed->toArray());

        $this->client->request('POST', '/api/auth/logout');
        self::assertResponseIsSuccessful();

        $this->client->request('POST', '/api/auth/refresh');
        self::assertResponseStatusCodeSame(401);
    }

    public function testMeDescribesTheConnectedUser(): void
    {
        $center = $this->createCenter('Diaverum Test');
        $user = $this->createUser(UserRole::Cadre, [$center]);

        $me = $this->requestAs($user, 'GET', '/api/me')->toArray();

        self::assertSame($user->getEmail(), $me['email']);
        self::assertSame('cadre', $me['role']);
        self::assertSame('Diaverum Test', $me['centers'][0]['name']);
        self::assertFalse($me['securityCodeConfigured']);
        self::assertArrayNotHasKey('password', $me);
    }
}
