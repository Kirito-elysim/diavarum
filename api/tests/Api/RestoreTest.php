<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;

/**
 * Comptes désactivés et centres archivés : consultables sur demande, réactivables.
 */
final class RestoreTest extends ApiTestCaseBase
{
    private Center $paris;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
    }

    /** @return list<string> */
    private function emails(User $as, string $query = ''): array
    {
        return array_column($this->requestAs($as, 'GET', '/api/users'.$query)->toArray(), 'email');
    }

    public function testDeactivatedUsersAreListedOnlyOnRequest(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $active = $this->createUser(UserRole::Ide, [$this->paris]);
        $gone = $this->createUser(UserRole::Ide, [$this->paris]);
        $gone->archive();
        $this->em()->flush();

        self::assertNotContains($gone->getEmail(), $this->emails($cadre));
        self::assertContains($active->getEmail(), $this->emails($cadre));

        $archived = $this->emails($cadre, '?status=archived');
        self::assertContains($gone->getEmail(), $archived);
        self::assertNotContains($active->getEmail(), $archived);

        self::assertContains($gone->getEmail(), $this->emails($cadre, '?status=all'));
        self::assertContains($active->getEmail(), $this->emails($cadre, '?status=all'));
    }

    public function testCadreDoesNotSeeDeactivatedUsersOfOtherCenters(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $elsewhere = $this->createUser(UserRole::Ide, [$this->createCenter('Lyon')]);
        $elsewhere->archive();
        $this->em()->flush();

        self::assertNotContains($elsewhere->getEmail(), $this->emails($cadre, '?status=archived'));
    }

    public function testCadreRestoresIdeWhoCanLogInAgain(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $ide = $this->createUser(UserRole::Ide, [$this->paris]);
        $this->requestAs($cadre, 'DELETE', '/api/users/'.$ide->getId());
        $this->login($ide);
        self::assertResponseStatusCodeSame(401);

        $this->requestAs($cadre, 'POST', '/api/users/'.$ide->getId().'/restore');
        self::assertResponseStatusCodeSame(204);

        $this->login($ide);
        self::assertResponseIsSuccessful();
    }

    public function testCadreCannotRestoreAnotherCadreOrAnIdeOutsideHisCenters(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $otherCadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $ideLyon = $this->createUser(UserRole::Ide, [$this->createCenter('Lyon')]);
        $otherCadre->archive();
        $ideLyon->archive();
        $this->em()->flush();

        foreach ([$otherCadre, $ideLyon] as $target) {
            $this->requestAs($cadre, 'POST', '/api/users/'.$target->getId().'/restore');
            self::assertResponseStatusCodeSame(403);
        }
    }

    public function testArchivedCentersAreListedAndRestoredByNationalAdminOnly(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);
        $closed = $this->createCenter('Fermé');
        $closed->archive();
        $this->em()->flush();

        $names = array_column($this->requestAs($admin, 'GET', '/api/centers?status=archived')->toArray(), 'name');
        self::assertSame(['Fermé'], $names);
        $names = array_column($this->requestAs($cadre, 'GET', '/api/centers?status=all')->toArray(), 'name');
        self::assertNotContains('Fermé', $names, 'Un cadre ne liste jamais les centres archivés');

        $this->requestAs($cadre, 'POST', '/api/centers/'.$closed->getId().'/restore');
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($admin, 'POST', '/api/centers/'.$closed->getId().'/restore');
        self::assertResponseStatusCodeSame(204);
        $this->em()->clear();
        self::assertFalse($this->em()->find(Center::class, $closed->getId())->isArchived());
    }

    public function testUnknownStatusIsRejected(): void
    {
        $this->requestAs($this->createUser(UserRole::AdminNational), 'GET', '/api/users?status=deleted');

        self::assertResponseStatusCodeSame(422);
    }
}
