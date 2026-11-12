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
        self::assertEqualsWithDelta(30.0, $summary[1][10], 0.01, 'Durée totale en minutes');

        $detail = $book->getSheetByName('Détail des séances')->toArray(null, true, false);
        self::assertSame(['S97', 'Séance de test', 'Validé', 80], [$detail[1][3], $detail[1][4], $detail[1][7], $detail[1][8]]);
        self::assertSame('IDE', $detail[0][11], 'Colonne IDE par séance');
        self::assertSame('Clôturé par', $summary[0][11]);

        self::assertSame('Début', $book->getSheetByName('Historique des séances')->getCell('G1')->getValue());
        self::assertSame('Avis néphrologue requis', $book->getSheetByName('CODEX')->getCell('K1')->getValue());
    }

    public function testPostTestIsReportedApartAndExcludedFromProgramAverage(): void
    {
        $postTest = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'PT']);
        $program = $this->em()->getRepository(TrainingProgram::class)->findOneBy(['patient' => $this->dupont]);
        $program->addModule($postTest)->markValidated(20, 600);
        $this->em()->flush();

        self::assertSame(80, $program->getAverageScore(), 'Moyenne des cours seulement (S97 = 80), sans le post-test à 20');
        self::assertSame(20, $program->getPostTestScore());

        $response = $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.xlsx');
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $response->getContent());
        $summary = IOFactory::load($file)->getSheetByName('Synthèse')->toArray(null, true, false);
        unlink($file);
        self::assertSame([80, 20], [$summary[1][8], $summary[1][9]]);
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

        $many = $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.pdf?patients[]='.$this->dupont->getId()->toRfc4122());
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('%PDF', $many->getContent());
        $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.pdf');
        self::assertResponseStatusCodeSame(400, 'Sélection obligatoire');

        $stats = $this->requestAs($this->cadreParis, 'GET', '/api/exports/statistics.pdf');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('%PDF', $stats->getContent());
    }

    public function testStatisticsExcelMatchesTheScreenFigures(): void
    {
        $archived = $this->createPatient($this->paris, $this->ideParis, 'Ancien');
        $archived->archive();
        $this->em()->flush();
        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $query = "?from=$today&to=$today";

        $screen = $this->statisticsAs($this->cadreParis, $query);
        $response = $this->requestAs($this->cadreParis, 'GET', '/api/exports/statistics.xlsx'.$query);
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $response->getContent());
        $book = IOFactory::load($file);
        unlink($file);
        $lastRow = static function (string $sheet) use ($book): array {
            $rows = array_values(array_filter($book->getSheetByName($sheet)->toArray(null, true, false), static fn (array $r) => null !== $r[0]));

            return end($rows);
        };

        $total = $screen['total'];
        $patients = $lastRow('Patients');
        self::assertSame([$total['patients']['registered'], $total['patients']['eligible']['count'], $total['patients']['archived']], [$patients[1], $patients[2], $patients[8]]);
        self::assertSame(1, $total['patients']['archived'], 'Archivé compté à part');
        self::assertSame(2, $total['patients']['registered'], 'Et jamais dans les indicateurs');

        $programs = $lastRow('Parcours');
        self::assertSame(
            [$total['programs']['total'], $total['programs']['notStarted']['count'], $total['programs']['inactive']['count'], $total['programs']['active']['count'], $total['programs']['interrupted']['count'], $total['programs']['completed']['count'], $total['averageProgramScore']],
            [$programs[1], $programs[2], $programs[4], $programs[6], $programs[8], $programs[10], $programs[12]],
        );

        $nurses = array_values(array_filter($book->getSheetByName('IDE')->toArray(null, true, false), static fn (array $r) => null !== $r[0] && 'IDE' !== $r[0] && !str_starts_with((string) $r[0], 'Activité')));
        self::assertSame(array_sum(array_column($screen['nurses'], 'validatedSessions')), array_sum(array_column($nurses, 2)));
    }

    public function testOnlyTheLatestValidationOfACourseCountsForSessionBasedFigures(): void
    {
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'S97']);
        $program = $this->em()->getRepository(TrainingProgram::class)->findOneBy(['patient' => $this->dupont]);
        // Ancienne répétition (avant la validation unique) : 50 % puis 90 %, même cours et même parcours
        foreach ([[1200, 50], [900, 90]] as [$duration, $score]) {
            $session = (new TrainingSession())->setPatient($this->dupont)->setModule($module)->setProgram($program);
            $session->setAuthor($this->ideParis);
            $session->markValidated($duration, $score, []);
            $this->em()->persist($session);
            $this->em()->flush();
            usleep(2000);
        }
        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');

        $mine = $this->requestAs($this->ideParis, 'GET', "/api/statistics/me?from=$today&to=$today")->toArray();
        self::assertSame([1, 90, 900], [$mine['totals']['validatedSessions'], $mine['totals']['averageScore'], $mine['totals']['totalDurationSeconds']]);

        $nurses = $this->statisticsAs($this->cadreParis)['nurses'];
        self::assertSame(1, array_sum(array_column($nurses, 'validatedSessions')));
        self::assertSame(90, array_values(array_filter($nurses, static fn (array $n) => $n['validatedSessions'] > 0))[0]['averageScore']);

        $kpis = $this->requestAs($this->ideParis, 'GET', '/api/dashboard')->toArray()['kpis'];
        self::assertSame(1, $kpis['validatedSessions']);
        self::assertSame(90, $kpis['averageScore']);
    }

    public function testProgramScoreAndDurationFollowThePeriodAndExcludeThePostTest(): void
    {
        $tz = new \DateTimeZone('Europe/Paris');
        $today = (new \DateTimeImmutable('now', $tz))->format('Y-m-d');

        // Parcours en cours de Dupont : S97 = 80 aujourd'hui, post-test = 20 (hors moyennes)
        $postTest = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'PT']);
        $running = $this->em()->getRepository(TrainingProgram::class)->findOneBy(['patient' => $this->dupont]);
        $running->addModule($postTest)->markValidated(20, 0);

        // Parcours achevé en janvier : S98 = 100, 10 minutes
        $martin = $this->em()->getRepository(\App\Entity\Patient::class)->findOneBy(['lastName' => 'Martin']);
        $old = (new \DateTimeImmutable('2026-01-10 10:00', $tz));
        $module = (new Module())->setCode('S98')->setTitle('Séance ancienne')->setPosition(98);
        $this->em()->persist($module);
        $done = (new TrainingProgram())->setPatient($martin);
        $done->setAuthor($this->ideParis);
        $done->addModule($module)->markValidated(100, 600, $old);
        $done->markCompleted($this->cadreParis);
        $done->setCompletedAt($old);
        $this->em()->persist($done);
        $this->em()->flush();

        $total = fn (string $query) => $this->statisticsAs($this->cadreParis, $query)['total'];

        $all = $total('');
        self::assertSame(90, $all['averageProgramScore'], '(80 + 100) / 2, post-test exclu');
        self::assertSame(600, $all['averageCompletedProgramDurationSeconds'], 'Seul parcours achevé');

        $january = $total('?from=2026-01-01&to=2026-01-31');
        self::assertSame(100, $january['averageProgramScore'], 'Parcours en cours sans validation en janvier : ignoré');
        self::assertSame(600, $january['averageCompletedProgramDurationSeconds']);

        $current = $total("?from=$today&to=$today");
        self::assertSame(80, $current['averageProgramScore'], 'Parcours en cours compté dès qu\'un cours est validé');
        self::assertNull($current['averageCompletedProgramDurationSeconds'], 'Aucun parcours achevé dans la période');

        $empty = $total('?from=2025-01-01&to=2025-01-31');
        self::assertNull($empty['averageProgramScore']);
        self::assertNull($empty['averageCompletedProgramDurationSeconds']);

        // Bornes incluses : le jour de clôture, le lendemain, la veille
        self::assertSame(600, $total('?from=2026-01-10&to=2026-01-10')['averageCompletedProgramDurationSeconds']);
        self::assertNull($total('?from=2026-01-11&to=2026-01-31')['averageCompletedProgramDurationSeconds']);
        self::assertNull($total('?from=2026-01-01&to=2026-01-09')['averageCompletedProgramDurationSeconds']);

        $courses = $this->statisticsAs($this->cadreParis, "?from=$today&to=$today")['courses'];
        $pt = array_values(array_filter($courses, static fn (array $c) => 'PT' === $c['code']))[0];
        self::assertTrue($pt['postTest']);
        self::assertSame(2, $this->statisticsAs($this->cadreParis, "?from=$today&to=$today")['total']['activity']['validatedSessions'], 'Le post-test reste une séance réalisée');
        self::assertSame(80, $this->statisticsAs($this->cadreParis, "?from=$today&to=$today")['total']['activity']['averageSessionScore'], 'Mais hors du score moyen des séances');
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
        // Un cours validé une seule fois par parcours : les autres séances portent sur d'autres cours
        $other = fn (string $code) => $this->em()->persist($m = (new Module())->setCode($code)->setTitle('Autre '.$code)->setPosition(90)) ?? $m;
        $session = function (User $nurse, Patient $patient, bool $validated = true, ?Module $on = null) use ($module, $program): TrainingSession {
            $session = (new TrainingSession())->setPatient($patient)->setModule($on ?? $module)->setProgram($program);
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
        $session($colleague, $this->dupont, true, $other('S96'));
        $session($this->ideParis, $this->dupont, false);
        $session($this->ideParis, $lyonPatient, true, $other('S95'));
        $this->em()->flush();

        $export = $this->requestAs($this->ideParis, 'GET', '/api/exports/patients.xlsx?patients[]='.$this->dupont->getId()->toRfc4122());
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $export->getContent());
        $history = IOFactory::load($file)->getSheetByName('Historique des séances')->toArray(null, true, false);
        unlink($file);
        self::assertSame(['Validée' => 3, 'Non terminée' => 1], array_count_values(array_column(\array_slice($history, 1), 5)), 'Chaque lancement, même non terminé');

        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $activity = $this->requestAs($this->ideParis, 'GET', "/api/statistics/me?from=$today&to=$today")->toArray();
        self::assertSame(['validatedSessions' => 1, 'patients' => 1, 'averageScore' => 80, 'totalDurationSeconds' => 1800, 'validatedCompetencies' => 1], $activity['totals']);
        self::assertSame([['month' => substr($today, 0, 7), 'validatedSessions' => 1, 'averageScore' => 80]], $activity['monthly']);
        self::assertSame([['code' => 'S97', 'title' => 'Séance de test', 'validations' => 1, 'averageScore' => 80]], $activity['courses']);
        self::assertSame('DUPONT Jean', $activity['patients'][0]['name']);
        self::assertSame(['status' => 'actif', 'activityStatus' => 'actif', 'validated' => 1, 'selected' => 1], $activity['patients'][0]['program']);

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
