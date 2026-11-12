<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use App\Enum\UserRole;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\Uid\Uuid;

/**
 * Recette des droits sur les exports (bilans patients, statistiques) : IDE, cadre, administrateur national,
 * accès hors centre, patients archivés, anonymes.
 */
final class ExportRightsTest extends ApiTestCaseBase
{
    private Center $paris;
    private Center $lyon;
    private User $ideParis;
    private User $ideLyon;
    private User $ideNoCenter;
    private User $cadreParis;
    private User $cadreLyon;
    private User $admin;
    private Patient $pParis;
    private Patient $pLyon;
    private Patient $pArchived;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
        $this->lyon = $this->createCenter('Lyon');
        $this->ideParis = $this->createUser(UserRole::Ide, [$this->paris]);
        $this->ideLyon = $this->createUser(UserRole::Ide, [$this->lyon]);
        $this->ideNoCenter = $this->createUser(UserRole::Ide, []);
        $this->cadreParis = $this->createUser(UserRole::Cadre, [$this->paris]);
        $this->cadreLyon = $this->createUser(UserRole::Cadre, [$this->lyon]);
        $this->admin = $this->createUser(UserRole::AdminNational);
        $this->pParis = $this->createPatient($this->paris, $this->admin, 'Parisien');
        $this->pLyon = $this->createPatient($this->lyon, $this->admin, 'Lyonnais');
        $this->pArchived = $this->createPatient($this->paris, $this->admin, 'Archive');
        $this->pArchived->archive();
        $this->em()->flush();
    }

    private function id(object $entity): string
    {
        return $entity->getId()->toRfc4122();
    }

    /** @return list<string> noms de la feuille « Synthèse » d'un export de bilans */
    private function names(string $content): array
    {
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $content);
        $rows = IOFactory::load($file)->getSheetByName('Synthèse')->toArray(null, true, false);
        unlink($file);
        $names = array_column(\array_slice($rows, 1), 0);
        sort($names);

        return $names;
    }

    /** @return list<string> centres de la feuille « Patients » d'un export de statistiques (hors total) */
    private function statisticsCenters(string $content): array
    {
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $content);
        $rows = IOFactory::load($file)->getSheetByName('Patients')->toArray(null, true, false);
        unlink($file);
        $centers = array_column(array_filter($rows, static fn (array $r) => is_int($r[1] ?? null)), 0);
        array_pop($centers);
        sort($centers);

        return $centers;
    }

    public function testAnonymousUsersAreRefusedEverywhere(): void
    {
        foreach (['/api/exports/patients.xlsx', '/api/exports/patients.pdf?patients[]='.$this->id($this->pParis), '/api/exports/patients/'.$this->id($this->pParis).'.pdf',
            '/api/exports/statistics.xlsx', '/api/exports/statistics.pdf', '/api/statistics'] as $url) {
            $this->client->request('GET', $url, ['headers' => ['Accept' => 'application/json']]);
            self::assertResponseStatusCodeSame(401, $url);
        }
    }

    public function testPatientSpreadsheetFollowsTheCentersOfEachRole(): void
    {
        $expected = [
            [$this->ideParis, ['PARISIEN']],
            [$this->cadreParis, ['PARISIEN']],
            [$this->ideLyon, ['LYONNAIS']],
            [$this->cadreLyon, ['LYONNAIS']],
            [$this->admin, ['LYONNAIS', 'PARISIEN']],
            [$this->ideNoCenter, []],
        ];
        foreach ($expected as [$user, $names]) {
            $response = $this->requestAs($user, 'GET', '/api/exports/patients.xlsx');
            self::assertResponseIsSuccessful();
            self::assertSame($names, $this->names($response->getContent()), $user->getRole()->value.' : archivés et autres centres exclus');
        }
    }

    public function testRequestedPatientsOutsideTheCentersAreNotFound(): void
    {
        $lyon = $this->id($this->pLyon);
        $paris = $this->id($this->pParis);

        foreach ([$this->ideParis, $this->cadreParis, $this->ideNoCenter] as $user) {
            foreach (["/api/exports/patients.xlsx?patients[]=$lyon", "/api/exports/patients.pdf?patients[]=$lyon", "/api/exports/patients/$lyon.pdf",
                "/api/exports/patients.pdf?patients[]=$paris&patients[]=$lyon"] as $url) {
                $this->requestAs($user, 'GET', $url);
                self::assertResponseStatusCodeSame(404, $user->getRole()->value.' '.$url);
            }
        }
        $this->requestAs($this->ideNoCenter, 'GET', "/api/exports/patients/$paris.pdf");
        self::assertResponseStatusCodeSame(404, 'Un IDE sans centre ne voit aucun patient');

        foreach ([$this->ideParis, $this->cadreParis, $this->admin] as $user) {
            $this->requestAs($user, 'GET', "/api/exports/patients/$paris.pdf");
            self::assertResponseIsSuccessful();
        }
        foreach ([$this->ideLyon, $this->cadreLyon, $this->admin] as $user) {
            $this->requestAs($user, 'GET', "/api/exports/patients/$lyon.pdf");
            self::assertResponseIsSuccessful();
            $this->requestAs($user, 'GET', "/api/exports/patients.pdf?patients[]=$lyon");
            self::assertResponseIsSuccessful();
        }
    }

    public function testArchivedPatientsAreExportedOnlyWhenSelectedAndWithinTheCenters(): void
    {
        $archived = $this->id($this->pArchived);

        $response = $this->requestAs($this->cadreParis, 'GET', "/api/exports/patients.xlsx?patients[]=$archived");
        self::assertResponseIsSuccessful();
        self::assertSame(['ARCHIVE'], $this->names($response->getContent()));

        $this->requestAs($this->cadreLyon, 'GET', "/api/exports/patients.xlsx?patients[]=$archived");
        self::assertResponseStatusCodeSame(404);
        $this->requestAs($this->ideLyon, 'GET', "/api/exports/patients/$archived.pdf");
        self::assertResponseStatusCodeSame(404);
    }

    public function testMultiPatientPdfNeedsASelectionAndIsCapped(): void
    {
        foreach ([$this->ideParis, $this->cadreParis, $this->admin] as $user) {
            $this->requestAs($user, 'GET', '/api/exports/patients.pdf');
            self::assertResponseStatusCodeSame(400, 'Sélection obligatoire');
        }
        $tooMany = implode('&', array_map(static fn () => 'patients[]='.Uuid::v7()->toRfc4122(), range(1, 51)));
        $this->requestAs($this->admin, 'GET', "/api/exports/patients.pdf?$tooMany");
        self::assertResponseStatusCodeSame(400, 'Limité à 50 patients');
    }

    public function testStatisticsExportsAreReservedToCadreAndAdminWithinTheirCenters(): void
    {
        $lyon = $this->id($this->lyon);

        foreach (['/api/exports/statistics.xlsx', '/api/exports/statistics.pdf', '/api/statistics'] as $url) {
            foreach ([$this->ideParis, $this->ideLyon, $this->ideNoCenter] as $ide) {
                $this->requestAs($ide, 'GET', $url);
                self::assertResponseStatusCodeSame(403, 'IDE : '.$url);
            }
            foreach ([$this->cadreParis, $this->cadreLyon, $this->admin] as $user) {
                $this->requestAs($user, 'GET', $url);
                self::assertResponseIsSuccessful($user->getRole()->value.' '.$url);
            }
            $this->requestAs($this->cadreParis, 'GET', "$url?centers[]=$lyon");
            self::assertResponseStatusCodeSame(403, 'Cadre : centre hors périmètre '.$url);
            $this->requestAs($this->admin, 'GET', "$url?centers[]=$lyon");
            self::assertResponseIsSuccessful('Administrateur : tout centre');
        }
    }

    public function testStatisticsSpreadsheetOnlyListsTheCentersInScope(): void
    {
        self::assertSame(['Paris'], $this->statisticsCenters($this->requestAs($this->cadreParis, 'GET', '/api/exports/statistics.xlsx')->getContent()));
        self::assertSame(['Lyon'], $this->statisticsCenters($this->requestAs($this->cadreLyon, 'GET', '/api/exports/statistics.xlsx')->getContent()));
        self::assertSame(['Lyon', 'Paris'], $this->statisticsCenters($this->requestAs($this->admin, 'GET', '/api/exports/statistics.xlsx')->getContent()));
        self::assertSame(['Lyon'], $this->statisticsCenters($this->requestAs($this->admin, 'GET', '/api/exports/statistics.xlsx?centers[]='.$this->id($this->lyon))->getContent()));
    }

    public function testPersonalActivityIsAvailableToEveryRoleButOnlyForItsOwnCenters(): void
    {
        foreach ([$this->ideParis, $this->cadreParis, $this->admin] as $user) {
            $this->requestAs($user, 'GET', '/api/statistics/me');
            self::assertResponseIsSuccessful($user->getRole()->value);
        }
    }
}
