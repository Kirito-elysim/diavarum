<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;

/**
 * Hiérarchie des droits : le cadre gère les IDE de ses centres, l'administrateur national gère tout.
 */
final class UserManagementTest extends ApiTestCaseBase
{
    private Center $paris;
    private Center $lyon;
    private User $cadreParis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
        $this->lyon = $this->createCenter('Lyon');
        $this->cadreParis = $this->createUser(UserRole::Cadre, [$this->paris]);
    }

    /**
     * @param list<Center> $centers
     *
     * @return array<string, mixed>
     */
    private function newUserPayload(string $role, array $centers): array
    {
        return [
            'email' => uniqid('nouveau.', true).'@test.fr',
            'firstName' => 'Nouvelle',
            'lastName' => 'Recrue',
            'role' => $role,
            'centers' => array_map($this->iri(...), $centers),
            'plainPassword' => 'Un-mot-de-passe-solide-2026',
        ];
    }

    public function testIdeCannotManageAccounts(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);

        $this->requestAs($ide, 'GET', '/api/users');
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($ide, 'POST', '/api/users', $this->newUserPayload('ide', [$this->paris]));
        self::assertResponseStatusCodeSame(403);
    }

    public function testCadreCreatesIdeInHisCenter(): void
    {
        $response = $this->requestAs($this->cadreParis, 'POST', '/api/users', $this->newUserPayload('ide', [$this->paris]));

        self::assertResponseStatusCodeSame(201);
        $created = $response->toArray();
        self::assertArrayNotHasKey('plainPassword', $created);
        self::assertArrayNotHasKey('password', $created);

        // Le compte créé peut se connecter avec le mot de passe choisi
        $this->client->request('POST', '/api/auth/login', ['json' => ['email' => $created['email'], 'password' => 'Un-mot-de-passe-solide-2026']]);
        self::assertResponseIsSuccessful();
    }

    public function testCadreCannotCreateCadreOrAdmin(): void
    {
        $this->requestAs($this->cadreParis, 'POST', '/api/users', $this->newUserPayload('cadre', [$this->paris]));
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($this->cadreParis, 'POST', '/api/users', $this->newUserPayload('admin_national', []));
        self::assertResponseStatusCodeSame(403);
    }

    public function testCadreCannotAffiliateIdeToAnotherCenter(): void
    {
        $this->requestAs($this->cadreParis, 'POST', '/api/users', $this->newUserPayload('ide', [$this->lyon]));

        // Centre hors de ses affiliations : introuvable pour lui
        self::assertResponseStatusCodeSame(400);
    }

    public function testCadreCannotRemoveAnAffiliationHeDoesNotManage(): void
    {
        $shared = $this->createUser(UserRole::Ide, [$this->paris, $this->lyon]);

        $this->requestAs($this->cadreParis, 'PATCH', $this->iri($shared), ['centers' => [$this->iri($this->paris)]]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testCadreDoesNotSeeIdeOfOtherCenters(): void
    {
        $ideLyon = $this->createUser(UserRole::Ide, [$this->lyon]);

        $this->requestAs($this->cadreParis, 'PATCH', $this->iri($ideLyon), ['lastName' => 'Piraté']);

        self::assertResponseStatusCodeSame(404);
    }

    public function testNobodyCanEditOwnAccountThroughUserManagement(): void
    {
        $this->requestAs($this->cadreParis, 'PATCH', $this->iri($this->cadreParis), ['role' => 'admin_national']);

        self::assertResponseStatusCodeSame(403);
    }

    public function testCadreArchivesIdeOfHisCenter(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);

        $this->requestAs($this->cadreParis, 'DELETE', $this->iri($ide));

        self::assertResponseStatusCodeSame(204);
        $this->login($ide);
        self::assertResponseStatusCodeSame(401);
    }

    public function testNationalAdminCreatesCadreInAnyCenter(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $this->requestAs($admin, 'POST', '/api/users', $this->newUserPayload('cadre', [$this->lyon]));

        self::assertResponseStatusCodeSame(201);
    }

    public function testIdeOrCadreMustHaveAtLeastOneCenter(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $this->requestAs($admin, 'POST', '/api/users', $this->newUserPayload('ide', []));

        self::assertResponseStatusCodeSame(422);
    }

    public function testWeakPasswordIsRejected(): void
    {
        $payload = $this->newUserPayload('ide', [$this->paris]);
        $payload['plainPassword'] = 'motdepasse';

        $this->requestAs($this->cadreParis, 'POST', '/api/users', $payload);

        self::assertResponseStatusCodeSame(422);
    }

    public function testCadreResetsPasswordOfIdeAndClosesItsSessions(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);
        $this->login($ide);
        $tokens = $this->em()->getRepository(\App\Entity\RefreshToken::class);
        self::assertGreaterThan(0, $tokens->count(['username' => $ide->getEmail()]));

        $this->requestAs($this->cadreParis, 'PATCH', '/api/users/'.$ide->getId(), ['plainPassword' => 'Lavande-Castor-47']);
        self::assertResponseIsSuccessful();
        self::assertSame(0, $tokens->count(['username' => $ide->getEmail()]), 'Les sessions ouvertes sont fermées');

        $this->login($ide);
        self::assertResponseStatusCodeSame(401);
        $this->login($ide, 'Lavande-Castor-47');
        self::assertResponseIsSuccessful();
    }

    public function testCadreCannotResetPasswordOutsideHisCenters(): void
    {
        $ideLyon = $this->createUser(UserRole::Ide, [$this->lyon]);

        $this->requestAs($this->cadreParis, 'PATCH', '/api/users/'.$ideLyon->getId(), ['plainPassword' => 'Lavande-Castor-47']);
        self::assertContains($this->client->getResponse()->getStatusCode(), [403, 404]);
    }

    public function testAdminAttachesAndDetachesExistingUserFromCenter(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);

        $user = $this->requestAs($admin, 'PATCH', '/api/users/'.$ide->getId(), ['centers' => [$this->iri($this->paris), $this->iri($this->lyon)]])->toArray();
        self::assertResponseIsSuccessful();
        self::assertEqualsCanonicalizing(['Paris', 'Lyon'], array_column($user['centers'], 'name'));

        $user = $this->requestAs($admin, 'PATCH', '/api/users/'.$ide->getId(), ['centers' => [$this->iri($this->lyon)]])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame(['Lyon'], array_column($user['centers'], 'name'));
    }

    public function testLastCenterCannotBeRemoved(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);

        $response = $this->requestAs($admin, 'PATCH', '/api/users/'.$ide->getId(), ['centers' => []]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('centers', $response->toArray(false)['violations'][0]['propertyPath']);
    }
}
