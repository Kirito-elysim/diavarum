<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\SessionCompetencyValidation;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
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

    public function testPeriodFiltersActivityButNotHeadcounts(): void
    {
        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $yesterday = (new \DateTimeImmutable('yesterday', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $course = static fn (array $stats) => array_values(array_filter($stats['courses'], static fn (array $c) => 'S97' === $c['code']))[0];

        $current = $this->statisticsAs($this->cadreParis, "?from=$today&to=$today");
        self::assertSame(['from' => $today, 'to' => $today], $current['period']);
        self::assertSame(1, $current['total']['activity']['validatedSessions']);
        self::assertSame(80, $current['total']['activity']['averageSessionScore']);
        self::assertSame(1, $course($current)['validations']);
        self::assertSame([['month' => substr($today, 0, 7), 'validatedSessions' => 1, 'averageScore' => 80]], $current['monthly']);

        $past = $this->statisticsAs($this->cadreParis, "?to=$yesterday");
        self::assertSame(0, $past['total']['activity']['validatedSessions']);
        self::assertSame(0, $course($past)['validations']);
        self::assertSame(2, $past['total']['patients']['registered'], 'Effectifs à date, quelle que soit la période');
        self::assertSame(1, $past['total']['programs']['active']['count']);
    }

    public function testNurseSeesOnlyHerOwnSessionsInHerCenters(): void
    {
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'S97']);
        $program = $this->em()->getRepository(TrainingProgram::class)->findOneBy(['patient' => $this->dupont]);
        $competency = (new ModuleCompetency())->setModule($module)->setLabel('Compétence de test');
        $this->em()->persist($competency);
        $colleague = $this->createUser(UserRole::Ide, [$this->paris]);
        $lyonPatient = $this->em()->getRepository(Patient::class)->findOneBy(['lastName' => 'Lyonnais']);
        $session = function (User $nurse, Patient $patient, bool $validated = true) use ($module, $program): TrainingSession {
            $session = (new TrainingSession())->setPatient($patient)->setModule($module)->setProgram($program);
            $session->setAuthor($nurse);
            if ($validated) {
                $session->markValidated(1800, 80, []);
            }
            $this->em()->persist($session);

            return $session;
        };
        $mine = $session($this->ideParis, $this->dupont);
        $validation = (new SessionCompetencyValidation())->setCompetency($competency)->setValidated(true);
        $validation->setAuthor($this->ideParis);
        $mine->addCompetencyValidation($validation);
        $this->em()->persist($validation);
        $session($colleague, $this->dupont);
        $session($this->ideParis, $this->dupont, false);
        $session($this->ideParis, $lyonPatient);
        $this->em()->flush();

        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $activity = $this->requestAs($this->ideParis, 'GET', "/api/statistics/me?from=$today&to=$today")->toArray();
        self::assertSame(['validatedSessions' => 1, 'patients' => 1, 'averageScore' => 80, 'totalDurationSeconds' => 1800, 'validatedCompetencies' => 1], $activity['totals']);
        self::assertSame([['month' => substr($today, 0, 7), 'validatedSessions' => 1, 'averageScore' => 80]], $activity['monthly']);
        self::assertSame([['code' => 'S97', 'title' => 'Séance de test', 'validations' => 1, 'averageScore' => 80]], $activity['courses']);
        self::assertSame('DUPONT Jean', $activity['patients'][0]['name']);
        self::assertSame(['status' => 'actif', 'validated' => 1, 'selected' => 1], $activity['patients'][0]['program']);

        $yesterday = (new \DateTimeImmutable('yesterday', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        self::assertSame(0, $this->requestAs($this->ideParis, 'GET', "/api/statistics/me?to=$yesterday")->toArray()['totals']['validatedSessions']);
        $this->requestAs($this->ideParis, 'GET', '/api/statistics/me?from=2026-13-01');
        self::assertResponseStatusCodeSame(400);
    }

    public function testInterruptionReasonsAreCounted(): void
    {
        $reason = $this->em()->getRepository(\App\Entity\InterruptionReason::class)->findOneBy([]);
        $martin = $this->em()->getRepository(Patient::class)->findOneBy(['lastName' => 'Martin']);
        $program = (new TrainingProgram())->setPatient($martin);
        $program->setAuthor($this->ideParis);
        $program->markInterrupted($this->cadreParis, [$reason], null);
        $this->em()->persist($program);
        $this->em()->flush();

        $stats = $this->statisticsAs($this->cadreParis);

        self::assertSame([['label' => $reason->getLabel(), 'count' => 1]], $stats['interruptionReasons']);
        self::assertSame(1, $stats['total']['activity']['interruptedPrograms']);
    }

    public function testInvalidPeriodIsRejected(): void
    {
        foreach (['?from=2026-13-01', '?to=hier', '?from=2026-10-02&to=2026-10-01'] as $query) {
            $this->requestAs($this->cadreParis, 'GET', '/api/statistics'.$query);
            self::assertResponseStatusCodeSame(400, $query);
        }
    }
}
