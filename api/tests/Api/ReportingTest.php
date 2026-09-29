<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\Module;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Bilans patients et synthèses statistiques (cahier des charges §3).
 */
final class ReportingTest extends ApiTestCaseBase
{
    private Center $paris;
    private Center $lyon;
    private User $ideParis;
    private User $cadreParis;
    private User $admin;
    private Patient $dupont;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
        $this->lyon = $this->createCenter('Lyon');
        $this->ideParis = $this->createUser(UserRole::Ide, [$this->paris]);
        $this->cadreParis = $this->createUser(UserRole::Cadre, [$this->paris]);
        $this->admin = $this->createUser(UserRole::AdminNational);

        // Paris : 1 patient éligible avec une séance validée (80 %, 30 min), 1 non éligible ; Lyon : 1 enregistré
        $this->dupont = $this->createPatient($this->paris, $this->ideParis, 'Dupont')->setEligibilityStatus(EligibilityStatus::Eligible);
        $this->createPatient($this->paris, $this->ideParis, 'Martin')->setEligibilityStatus(EligibilityStatus::NotEligible);
        $this->createPatient($this->lyon, $this->ideParis, 'Lyonnais');

        $module = (new Module())->setCode('S97')->setTitle('Séance de test')->setPosition(97);
        $this->em()->persist($module);
        $program = (new TrainingProgram())->setPatient($this->dupont);
        $program->setAuthor($this->ideParis);
        $program->addModule($module)->markValidated(80, 1800);
        $program->markActive();
        $this->em()->persist($program);
        $this->em()->flush();
    }

    /**
     * @return array<string, mixed>
     */
    private function statisticsAs(User $user, string $query = ''): array
    {
        return $this->requestAs($user, 'GET', '/api/statistics'.$query)->toArray();
    }

    public function testCadreStatisticsCoverOnlyHisCentersWithCountsAndProportions(): void
    {
        $stats = $this->statisticsAs($this->cadreParis);

        self::assertFalse($stats['national']);
        self::assertSame(['Paris'], array_column($stats['centers'], 'center'));
        self::assertSame(2, $stats['total']['patients']['registered']);
        self::assertSame(['count' => 1, 'percent' => 50], $stats['total']['patients']['eligible']);
        self::assertSame(['count' => 1, 'percent' => 100], $stats['total']['programs']['active']);
        self::assertSame(80, $stats['total']['averageProgramScore']);

        $course = array_values(array_filter($stats['courses'], static fn (array $c) => 'S97' === $c['code']))[0];
        self::assertSame(['validations' => 1, 'averageScore' => 80, 'averageDurationSeconds' => 1800], array_intersect_key($course, array_flip(['validations', 'averageScore', 'averageDurationSeconds'])));
    }

    public function testNationalAdminSeesEveryCenter(): void
    {
        $stats = $this->statisticsAs($this->admin);

        self::assertTrue($stats['national']);
        self::assertSame('National', $stats['total']['center']);
        self::assertGreaterThanOrEqual(3, $stats['total']['patients']['registered']);
    }

    public function testCadreCannotRequestAnotherCenter(): void
    {
        $this->requestAs($this->cadreParis, 'GET', '/api/statistics?centers[]='.$this->lyon->getId()->toRfc4122());

        self::assertResponseStatusCodeSame(403);
    }

    public function testNurseHasNoAccessToStatistics(): void
    {
        $this->requestAs($this->ideParis, 'GET', '/api/statistics');
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($this->ideParis, 'GET', '/api/exports/statistics.xlsx');
        self::assertResponseStatusCodeSame(403);
    }

    public function testPatientsSpreadsheetContainsSummaryAndSessionDetail(): void
    {
        $response = $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.xlsx');

        self::assertResponseIsSuccessful();
        self::assertStringContainsString('spreadsheetml', $response->getHeaders()['content-type'][0]);
        self::assertStringContainsString('no-store', $response->getHeaders()['cache-control'][0]);

        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $response->getContent());
        $book = IOFactory::load($file);
        unlink($file);

        // Valeurs brutes : les nombres doivent être de vrais nombres Excel (utilisables dans des formules)
        $summary = $book->getSheetByName('Synthèse')->toArray(null, true, false);
        self::assertSame('Nom', $summary[0][0]);
        self::assertSame(['DUPONT', 'MARTIN'], array_column(\array_slice($summary, 1), 0), 'Patients de Paris uniquement');
        self::assertSame(['En cours', 1, 1, 80], [$summary[1][5], $summary[1][6], $summary[1][7], $summary[1][8]]);
        self::assertEqualsWithDelta(30.0, $summary[1][9], 0.01, 'Durée totale en minutes');

        $detail = $book->getSheetByName('Détail des séances')->toArray(null, true, false);
        self::assertSame(['S97', 'Séance de test', 'Validé', 80], [$detail[1][3], $detail[1][4], $detail[1][7], $detail[1][8]]);
    }

    public function testPatientOfAnotherCenterCannotBeExported(): void
    {
        $lyonnais = $this->createPatient($this->lyon, $this->admin, 'Etranger');

        $this->requestAs($this->ideParis, 'GET', '/api/exports/patients/'.$lyonnais->getId()->toRfc4122().'.pdf');
        self::assertResponseStatusCodeSame(404);

        $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.xlsx?patients[]='.$lyonnais->getId()->toRfc4122());
        self::assertResponseStatusCodeSame(404);
    }

    public function testPdfExportsAreGenerated(): void
    {
        $bilan = $this->requestAs($this->ideParis, 'GET', '/api/exports/patients/'.$this->dupont->getId()->toRfc4122().'.pdf');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('%PDF', $bilan->getContent());
        self::assertStringContainsString('bilan-dupont-jean.pdf', $bilan->getHeaders()['content-disposition'][0]);

        $stats = $this->requestAs($this->cadreParis, 'GET', '/api/exports/statistics.pdf');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('%PDF', $stats->getContent());
    }
}
