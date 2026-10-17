<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Imports en masse (CSV ; même lecteur que pour Excel) : aperçu, « tout ou rien », droits.
 */
final class ImportTest extends ApiTestCaseBase
{
    /** @param list<list<string>> $rows première ligne = en-têtes */
    private function upload(User $as, string $type, array $rows, string $mode = 'import', array $parameters = []): ResponseInterface
    {
        $path = tempnam(sys_get_temp_dir(), 'import').'.csv';
        $handle = fopen($path, 'w');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ';', '"', '');
        }
        fclose($handle);

        return $this->client->request('POST', "/api/imports/$type", [
            'auth_bearer' => $this->tokenFor($as),
            'headers' => ['Content-Type' => 'multipart/form-data', 'Accept' => 'application/json'],
            'extra' => [
                'parameters' => ['mode' => $mode] + $parameters,
                'files' => ['file' => new UploadedFile($path, 'import.csv', 'text/csv', null, true)],
            ],
        ]);
    }

    private function countCenters(): int
    {
        return $this->em()->getRepository(Center::class)->count([]);
    }

    public function testNationalAdminImportsCenters(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $before = $this->countCenters();

        $report = $this->upload($admin, 'centers', [
            ['Nom *', 'Ville *', 'N° FINESS', 'Code postal', 'Région', 'Téléphone', 'Postes de dialyse'],
            ['Diaverum Bourg', 'Bourg-en-Bresse', '10012345', '1000', 'auvergne-rhone-alpes', '474000000', '12'],
            ['Diaverum Brest', 'Brest', '', '29200', 'Bretagne', '', ''],
        ])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame(2, $report['created']);
        self::assertSame($before + 2, $this->countCenters());
        $bourg = $this->em()->getRepository(Center::class)->findOneBy(['name' => 'Diaverum Bourg']);
        self::assertSame('010012345', $bourg->getFiness(), 'Zéro initial restauré');
        self::assertSame('01000', $bourg->getPostalCode());
        self::assertSame('0474000000', $bourg->getPhone());
        self::assertSame('Auvergne-Rhône-Alpes', $bourg->getRegion(), 'Région reconnue sans casse ni accents');
    }

    public function testPreviewListsErrorsPerLineAndCreatesNothing(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $this->createCenter('Existant')->setCity('Paris');
        $this->em()->flush();
        $before = $this->countCenters();
        $rows = [
            ['Nom', 'Ville', 'Finess', 'Région'],
            ['Valide', 'Nantes', '440012345', ''],
            ['Existant', 'Paris', '', ''],
            ['Mauvais', 'Lyon', '12', 'Atlantide'],
            ['Doublon', 'Lyon', '440012345', ''],
        ];

        $report = $this->upload($admin, 'centers', $rows, 'preview')->toArray();
        self::assertResponseIsSuccessful();
        self::assertFalse($report['valid']);
        self::assertSame([2, 3, 4, 5], array_column($report['rows'], 'line'));
        self::assertSame([], $report['rows'][0]['errors']);
        self::assertStringContainsString('existe déjà', $report['rows'][1]['errors'][0]);
        self::assertCount(2, $report['rows'][2]['errors']);
        self::assertStringContainsString('ligne 2', $report['rows'][3]['errors'][0]);

        $this->upload($admin, 'centers', $rows);
        self::assertResponseStatusCodeSame(422);
        self::assertSame($before, $this->countCenters(), 'Tout ou rien');
    }

    public function testMissingRequiredColumnIsExplained(): void
    {
        $response = $this->upload($this->createUser(UserRole::AdminNational), 'centers', [['Nom'], ['Centre sans ville']], 'preview');

        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('ville', $response->toArray(false)['detail']);
    }

    public function testNationalAdminImportsUsersWithRolesAndCenters(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $this->createCenter('Paris Import')->setFiness('750011111');
        $this->createCenter('Lyon Import');
        $this->em()->flush();

        $report = $this->upload($admin, 'users', [
            ['Nom', 'Prénom', 'Email', 'Rôle', 'Centres'],
            ['Durand', 'Julie', 'Julie.Durand@test.fr', '', '750011111'],
            ['Martin', 'Paul', 'paul.martin@test.fr', 'Cadre de service', 'paris import ; Lyon Import'],
            ['Petit', 'Anne', 'anne.petit@test.fr', 'Administrateur national', ''],
        ])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame(3, $report['created']);
        self::assertSame(['IDE', 'Cadre de service', 'Administrateur national'], array_column($report['credentials'], 'role'));

        $centerNames = fn (string $email) => array_map(
            static fn (Center $c) => $c->getName(),
            $this->em()->getRepository(User::class)->findOneBy(['email' => $email])->getCenters()->toArray(),
        );
        self::assertSame(['Paris Import'], $centerNames('julie.durand@test.fr'), 'Email mis en minuscules, centre trouvé par FINESS');
        self::assertEqualsCanonicalizing(['Paris Import', 'Lyon Import'], $centerNames('paul.martin@test.fr'));
        $julie = $this->em()->getRepository(User::class)->findOneBy(['email' => 'julie.durand@test.fr']);

        $this->login($julie, $report['credentials'][0]['password']);
        self::assertResponseIsSuccessful();
    }

    public function testCadreImportsOnlyIdeInHisCenters(): void
    {
        $paris = $this->createCenter('Paris Cadre');
        $this->createCenter('Lyon Ailleurs');
        $cadre = $this->createUser(UserRole::Cadre, [$paris]);

        $report = $this->upload($cadre, 'users', [
            ['Nom', 'Prénom', 'Email', 'Rôle', 'Centres'],
            ['Un', 'Ide', 'un.ide@test.fr', '', ''],
            ['Deux', 'Cadre', 'deux.cadre@test.fr', 'Cadre', ''],
            ['Trois', 'Ide', 'trois.ide@test.fr', 'IDE', 'Lyon Ailleurs'],
        ], 'preview')->toArray();

        self::assertSame([], $report['rows'][0]['errors'], 'Centre unique du cadre appliqué par défaut');
        self::assertStringContainsString('que des IDE', $report['rows'][1]['errors'][0]);
        self::assertStringContainsString('hors de votre périmètre', $report['rows'][2]['errors'][0]);
    }

    public function testExistingAndDuplicatedEmailsAreRejected(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $center = $this->createCenter('Centre Emails');
        $existing = $this->createUser(UserRole::Ide, [$center]);

        $report = $this->upload($admin, 'users', [
            ['Nom', 'Prénom', 'Email', 'Centres'],
            ['A', 'A', $existing->getEmail(), 'Centre Emails'],
            ['B', 'B', 'double@test.fr', 'Centre Emails'],
            ['C', 'C', 'DOUBLE@test.fr', 'Centre Emails'],
        ], 'preview')->toArray();

        self::assertStringContainsString('déjà utilisé', $report['rows'][0]['errors'][0]);
        self::assertSame([], $report['rows'][1]['errors']);
        self::assertStringContainsString('ligne 3', $report['rows'][2]['errors'][0]);
    }

    public function testCenterParameterIsAppliedAndScoped(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $center = $this->createCenter('Centre Défaut');
        $cadre = $this->createUser(UserRole::Cadre, [$this->createCenter('Autre')]);
        $rows = [['Nom', 'Prénom', 'Email'], ['Sans', 'Centre', 'sans.centre@test.fr']];

        $this->upload($admin, 'users', $rows, 'import', ['center' => (string) $center->getId()]);
        self::assertResponseStatusCodeSame(201);

        $this->upload($cadre, 'users', $rows, 'preview', ['center' => (string) $center->getId()]);
        self::assertResponseStatusCodeSame(403);
    }

    public function testOnlyNationalAdminImportsCentersAndIdeImportsNothing(): void
    {
        $center = $this->createCenter();
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $ide = $this->createUser(UserRole::Ide, [$center]);

        $this->upload($cadre, 'centers', [['Nom', 'Ville'], ['X', 'Y']], 'preview');
        self::assertResponseStatusCodeSame(403);
        $this->upload($ide, 'users', [['Nom', 'Prénom', 'Email']], 'preview');
        self::assertResponseStatusCodeSame(403);
        $this->upload($ide, 'patients', [['Nom', 'Prénom'], ['Martin', 'Louise']], 'preview');
        self::assertResponseStatusCodeSame(403);
        $this->requestAs($ide, 'GET', '/api/imports/patients/template.xlsx');
        self::assertResponseStatusCodeSame(403);
    }

    public function testCadreImportsPatientsInHisCenter(): void
    {
        $center = $this->createCenter('Centre Patients');
        $ide = $this->createUser(UserRole::Cadre, [$center]);
        $this->createPatient($center, $ide, 'Existant')->setFirstName('Paul')->setDateOfBirth(new \DateTimeImmutable('1950-01-01'));
        $this->em()->flush();

        $report = $this->upload($ide, 'patients', [
            ['Nom', 'Prénom', 'Date de naissance', 'Centre'],
            ['Dupont', 'Jean', '1/3/1948', ''],
            ['Durand', 'Marie', '17593', 'centre patients'],
            ['Existant', 'Paul', '01/01/1950', ''],
            ['Futur', 'Bébé', '01/01/2999', ''],
            ['Faux', 'Date', '31/02/1950', ''],
            ['Dupont', 'Jean', '01/03/1948', ''],
        ], 'preview')->toArray();

        self::assertResponseIsSuccessful();
        self::assertSame([], $report['rows'][0]['errors'], 'Centre unique appliqué par défaut');
        self::assertSame([], $report['rows'][1]['errors'], 'Date Excel et centre sans casse');
        self::assertStringContainsString('existe déjà', $report['rows'][2]['errors'][0]);
        self::assertStringContainsString('Date de naissance', $report['rows'][3]['errors'][0]);
        self::assertStringContainsString('non reconnue', $report['rows'][4]['errors'][0]);
        self::assertStringContainsString('ligne 2', $report['rows'][5]['errors'][0]);
    }

    public function testPatientsAreCreatedWithImporterAsAuthor(): void
    {
        $center = $this->createCenter('Centre Auteur');
        $ide = $this->createUser(UserRole::Cadre, [$center]);

        $report = $this->upload($ide, 'patients', [['Nom', 'Prénom', 'Date de naissance'], ['Martin', 'Louise', '24/07/1955']])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame(1, $report['created']);
        $patient = $this->em()->getRepository(\App\Entity\Patient::class)->findOneBy(['lastName' => 'Martin', 'firstName' => 'Louise']);
        self::assertSame($ide->getEmail(), $patient->getCreatedBy()->getEmail());
        self::assertSame('1955-07-24', $patient->getDateOfBirth()->format('Y-m-d'));
        self::assertSame('enregistre', $patient->getEligibilityStatus()->value);
    }

    public function testPatientCenterMustBeInScope(): void
    {
        $paris = $this->createCenter('Paris Scope');
        $this->createCenter('Lyon Scope');
        $ide = $this->createUser(UserRole::Cadre, [$paris, $this->createCenter('Nice Scope')]);

        $report = $this->upload($ide, 'patients', [
            ['Nom', 'Prénom', 'Centre'],
            ['A', 'A', 'Lyon Scope'],
            ['B', 'B', ''],
        ], 'preview')->toArray();

        self::assertStringContainsString('hors de votre périmètre', $report['rows'][0]['errors'][0]);
        self::assertStringContainsString('plusieurs centres', $report['rows'][1]['errors'][0]);
    }

    public function testSuccessfulImportIsLoggedWithFileNameAndFileIsKept(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $cadre = $this->createUser(UserRole::Cadre, [$this->createCenter('Centre Journal')]);
        $rows = [['Nom', 'Ville'], ['Diaverum Journal', 'Rennes']];

        $this->upload($admin, 'centers', $rows, 'preview');
        $this->upload($admin, 'centers', $rows);
        self::assertResponseStatusCodeSame(201);

        $connection = $this->em()->getConnection();
        $logs = $connection->fetchAllAssociative("SELECT action, resource_id, detail FROM access_log WHERE resource_type = 'imports' ORDER BY id");
        self::assertSame(['import_check', 'import'], array_column($logs, 'action'));
        self::assertSame('Import centres · import.csv', $logs[0]['detail']);
        self::assertSame('Import centres · import.csv (1 créé)', $logs[1]['detail']);
        self::assertNull($logs[0]['resource_id'], 'Une simple vérification ne conserve pas le fichier');

        $importId = $logs[1]['resource_id'];
        self::assertSame(1, (int) $connection->fetchOne('SELECT COUNT(*) FROM import_file'));

        $response = $this->client->request('GET', "/api/imports/$importId/file", ['auth_bearer' => $this->tokenFor($admin)]);
        self::assertResponseIsSuccessful();
        self::assertStringContainsString('"Diaverum Journal";Rennes', $response->getContent(), 'Fichier rendu tel que déposé');
        self::assertStringContainsString('import.csv', $response->getHeaders()['content-disposition'][0]);

        $this->client->request('GET', "/api/imports/$importId/file", ['auth_bearer' => $this->tokenFor($cadre)]);
        self::assertResponseStatusCodeSame(403);
    }

    public function testRefusedImportIsLoggedWithoutKeepingTheFile(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);

        $this->upload($admin, 'centers', [['Nom', 'Ville'], ['Sans ville', '']]);
        self::assertResponseStatusCodeSame(422);

        $connection = $this->em()->getConnection();
        self::assertSame('Import centres · import.csv (refusé)', $connection->fetchOne("SELECT detail FROM access_log WHERE action = 'import'"));
        self::assertSame(0, (int) $connection->fetchOne('SELECT COUNT(*) FROM import_file'));
    }
}
