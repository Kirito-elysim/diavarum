<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\Module;
use App\Entity\User;
use App\Enum\UserRole;

/**
 * Une IDE (ou un cadre) n'accède qu'aux patients des centres où elle est affiliée.
 */
final class CenterScopeTest extends ApiTestCaseBase
{
    private Center $paris;
    private Center $lyon;
    private User $ideParis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
        $this->lyon = $this->createCenter('Lyon');
        $this->ideParis = $this->createUser(UserRole::Ide, [$this->paris]);
    }

    public function testIdeOnlyListsPatientsOfHerCenters(): void
    {
        $this->createPatient($this->paris, $this->ideParis, 'Parisien');
        $this->createPatient($this->lyon, $this->ideParis, 'Lyonnais');

        $patients = $this->requestAs($this->ideParis, 'GET', '/api/patients')->toArray();

        self::assertSame(['Parisien'], array_column($patients, 'lastName'));
    }

    public function testNurseAffiliatedToSeveralCentersSeesThemAll(): void
    {
        $this->createPatient($this->paris, $this->ideParis, 'Parisien');
        $this->createPatient($this->lyon, $this->ideParis, 'Lyonnais');
        $multi = $this->createUser(UserRole::Ide, [$this->paris, $this->lyon]);

        $patients = $this->requestAs($multi, 'GET', '/api/patients')->toArray();

        self::assertCount(2, $patients);
    }

    public function testNationalAdminSeesEveryCenter(): void
    {
        $this->createPatient($this->paris, $this->ideParis, 'Parisien');
        $this->createPatient($this->lyon, $this->ideParis, 'Lyonnais');

        $patients = $this->requestAs($this->createUser(UserRole::AdminNational), 'GET', '/api/patients')->toArray();

        self::assertCount(2, $patients);
    }

    public function testPatientOfAnotherCenterIsNotFound(): void
    {
        $lyonnais = $this->createPatient($this->lyon, $this->ideParis);

        $this->requestAs($this->ideParis, 'GET', $this->iri($lyonnais));

        self::assertResponseStatusCodeSame(404);
    }

    public function testIdeCreatesPatientInHerCenterAndIsRecordedAsAuthor(): void
    {
        $response = $this->requestAs($this->ideParis, 'POST', '/api/patients', [
            'firstName' => 'Paul',
            'lastName' => 'Martin',
            'dateOfBirth' => '1950-05-01',
            'center' => $this->iri($this->paris),
        ]);

        self::assertResponseStatusCodeSame(201);
        $patient = $response->toArray();
        self::assertSame('enregistre', $patient['eligibilityStatus']);
        self::assertSame($this->ideParis->getId()->toRfc4122(), $patient['createdBy']['id']);
    }

    public function testIdeCannotCreatePatientInAnotherCenter(): void
    {
        $this->requestAs($this->ideParis, 'POST', '/api/patients', [
            'firstName' => 'Paul',
            'lastName' => 'Martin',
            'center' => $this->iri($this->lyon),
        ]);

        // Un centre hors périmètre est introuvable pour elle : sa référence n'est pas résolue
        self::assertResponseStatusCodeSame(400);
    }

    public function testIdeCannotMovePatientToAnotherCenter(): void
    {
        $patient = $this->createPatient($this->paris, $this->ideParis);

        $this->requestAs($this->ideParis, 'PATCH', $this->iri($patient), ['center' => $this->iri($this->lyon)]);

        self::assertResponseStatusCodeSame(400);
    }

    public function testIdeCannotStartSessionForPatientOfAnotherCenter(): void
    {
        $lyonnais = $this->createPatient($this->lyon, $this->ideParis);
        $module = (new Module())->setCode('S99')->setTitle('Cours');
        $this->em()->persist($module);
        $this->em()->flush();

        $this->requestAs($this->ideParis, 'POST', '/api/sessions', [
            'patient' => $this->iri($lyonnais),
            'module' => $this->iri($module),
        ]);

        // L'IRI d'un patient hors périmètre n'est même pas résolue
        self::assertResponseStatusCodeSame(400);
    }

    public function testNonEligiblePatientRequiresAReason(): void
    {
        $this->requestAs($this->ideParis, 'POST', '/api/patients', [
            'firstName' => 'Paul',
            'lastName' => 'Martin',
            'center' => $this->iri($this->paris),
            'eligibilityStatus' => 'non_eligible',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testOnlyCadreCanRemovePatientAndHistoryIsKept(): void
    {
        $patient = $this->createPatient($this->paris, $this->ideParis);
        $cadre = $this->createUser(UserRole::Cadre, [$this->paris]);

        $this->requestAs($this->ideParis, 'DELETE', $this->iri($patient));
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($cadre, 'DELETE', $this->iri($patient));
        self::assertResponseStatusCodeSame(204);

        self::assertSame([], $this->requestAs($cadre, 'GET', '/api/patients')->toArray(), 'Sorti de la file active');
        $archived = $this->requestAs($cadre, 'GET', $this->iri($patient))->toArray();
        self::assertNotNull($archived['removedAt'], 'Toujours consultable pour l\'historique');
    }

    public function testCentersListIsLimitedToAffiliations(): void
    {
        $centers = $this->requestAs($this->ideParis, 'GET', '/api/centers')->toArray();

        self::assertSame(['Paris'], array_column($centers, 'name'));
    }
}
