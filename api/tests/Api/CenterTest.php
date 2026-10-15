<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Enum\UserRole;

/**
 * Fiche d'un centre : informations administratives, indicateurs calculés, archivage.
 */
final class CenterTest extends ApiTestCaseBase
{
    public function testAdminCreatesCenterWithFullDetails(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $center = $this->requestAs($admin, 'POST', '/api/centers', [
            'name' => 'Diaverum Rennes', 'city' => 'Rennes', 'finess' => '350 012 345', 'address' => '1 rue de Brest',
            'postalCode' => '35000', 'region' => 'Bretagne', 'phone' => '02 99 00 00 00', 'email' => 'rennes@diaverum.test',
            'stations' => 12,
        ])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame('350012345', $center['finess'], 'Espaces retirés du FINESS');
        self::assertSame('Bretagne', $center['region']);
        self::assertSame(12, $center['stations']);
    }

    public function testInvalidDetailsAreRejectedWithFieldMessages(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $response = $this->requestAs($admin, 'POST', '/api/centers', [
            'name' => 'Centre', 'city' => 'Ville', 'finess' => '12', 'postalCode' => 'ABC', 'region' => 'Atlantide', 'email' => 'pas-un-email',
        ]);

        self::assertResponseStatusCodeSame(422);
        $fields = array_column($response->toArray(false)['violations'], 'propertyPath');
        foreach (['finess', 'postalCode', 'region', 'email'] as $field) {
            self::assertContains($field, $fields);
        }
    }

    public function testEmptyOptionalFieldsAreStoredAsNull(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $center = $this->requestAs($admin, 'POST', '/api/centers', ['name' => 'Centre', 'city' => 'Ville', 'finess' => '', 'region' => '', 'email' => ''])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertNull($center['finess']);
        self::assertNull($center['region']);
    }

    public function testListIncludesPatientNurseAndManagerCounts(): void
    {
        $center = $this->createCenter('Indicateurs');
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $this->createUser(UserRole::Ide, [$center])->archive();
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $this->createPatient($center, $ide);
        $this->createPatient($center, $ide)->archive();
        $this->em()->flush();

        $centers = $this->requestAs($this->createUser(UserRole::AdminNational), 'GET', '/api/centers')->toArray();
        $row = array_values(array_filter($centers, static fn (array $c) => 'Indicateurs' === $c['name']))[0];

        self::assertSame(1, $row['patientCount'], 'Patient sorti de la file active exclu');
        self::assertSame(1, $row['nurseCount'], 'Compte désactivé exclu');
        self::assertSame([['id' => (string) $cadre->getId(), 'name' => $cadre->getFirstName().' '.$cadre->getLastName()]], $row['managers']);
    }

    public function testCenterWithActivePatientsCannotBeArchived(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $center = $this->createCenter('Occupé');
        $this->createPatient($center, $this->createUser(UserRole::Ide, [$center]));

        $this->requestAs($admin, 'DELETE', '/api/centers/'.$center->getId());
        self::assertResponseStatusCodeSame(422);

        $empty = $this->createCenter('Vide');
        $this->requestAs($admin, 'DELETE', '/api/centers/'.$empty->getId());
        self::assertResponseStatusCodeSame(204);
        $this->em()->clear();
        self::assertTrue($this->em()->find(Center::class, $empty->getId())->isArchived());
    }
}
