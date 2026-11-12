<?php

namespace App\Tests\Api;

use App\Demo\RecetteDataLoader;
use App\Entity\User;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Base de recette fictive (RECETTE_BASE_FICTIVE.md) : les écrans et les exports sont comparés à des résultats calculés
 * à l'avance à la main, à partir de la description du jeu de données, et non à un second calcul du même code.
 */
final class RecetteDatasetTest extends ApiTestCaseBase
{
    protected function setUp(): void
    {
        parent::setUp();
        static::getContainer()->get(RecetteDataLoader::class)->load($this->em(), new \DateTimeImmutable());
        $this->em()->flush();
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        foreach ($this->em()->getRepository(User::class)->findAll() as $user) {
            $user->setPassword($hasher->hashPassword($user, self::PASSWORD));
        }
        $this->em()->flush();
    }

    private function user(string $email): User
    {
        return $this->em()->getRepository(User::class)->findOneBy(['email' => "recette.$email@diaverum.test"]);
    }

    private function day(int $daysAgo): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->modify("-$daysAgo days")->format('Y-m-d');
    }

    /** @return array<string, mixed> */
    private function stats(string $as, string $query = ''): array
    {
        return $this->requestAs($this->user($as), 'GET', '/api/statistics'.$query)->toArray();
    }

    /** @return array<string, mixed> */
    private function area(array $stats, string $center): array
    {
        return array_values(array_filter($stats['centers'], static fn (array $c) => $c['center'] === $center))[0];
    }

    /**
     * @param array<string, mixed> $a
     *
     * @return array<string, mixed>
     */
    private function figures(array $a): array
    {
        $p = $a['programs'];

        return [
            'patients' => [$a['patients']['registered'], $a['patients']['archived'], $a['patients']['eligible']['count'], $a['patients']['notEligible']['count'], $a['patients']['pending']['count']],
            'programs' => [$p['total'], $p['notStarted']['count'], $p['inactive']['count'], $p['active']['count'], $p['interrupted']['count'], $p['completed']['count']],
            'averageProgramScore' => $a['averageProgramScore'],
            'completedDuration' => $a['averageCompletedProgramDurationSeconds'],
            'activity' => [$a['activity']['validatedSessions'], $a['activity']['averageSessionScore'], $a['activity']['completedPrograms'], $a['activity']['interruptedPrograms']],
        ];
    }

    public function testNationalFiguresMatchTheExpectedResults(): void
    {
        $stats = $this->stats('admin');
        $total = $stats['total'];

        // Patients non archivés : 7 Paris + 2 Lyon + 1 Nice ; archivés 1 Paris + 1 Lyon, hors indicateurs
        self::assertSame(10, $total['patients']['registered']);
        self::assertSame(2, $total['patients']['archived']);
        self::assertEquals([6, 60.0], [$total['patients']['eligible']['count'], $total['patients']['eligible']['percent']]);
        self::assertEquals([2, 20.0], [$total['patients']['notEligible']['count'], $total['patients']['notEligible']['percent']]);
        self::assertEquals([2, 20.0], [$total['patients']['pending']['count'], $total['patients']['pending']['percent']]);

        // Parcours (patients non archivés) : achevé, en cours ×2, inactif, non démarré, interrompu
        self::assertSame(6, $total['programs']['total']);
        foreach (['notStarted' => [1, 16.7], 'inactive' => [1, 16.7], 'active' => [2, 33.3], 'interrupted' => [1, 16.7], 'completed' => [1, 16.7]] as $status => $expected) {
            self::assertEquals($expected, [$total['programs'][$status]['count'], $total['programs'][$status]['percent']], $status);
        }

        // Score moyen des parcours : (70 + 75 + 40 + 90 + 70) / 5 = 69 ; durée du seul parcours achevé : 600 + 900 + 300 + 0 s
        self::assertSame(69, $total['averageProgramScore']);
        self::assertSame(1800, $total['averageCompletedProgramDurationSeconds']);

        // Séances validées : 4 + 2 + 1 + 1 + 1 = 9 ; score moyen hors post-test et hors cours sans note : 490 / 7 = 70
        self::assertSame([9, 70, 1, 1], [$total['activity']['validatedSessions'], $total['activity']['averageSessionScore'], $total['activity']['completedPrograms'], $total['activity']['interruptedPrograms']]);
    }

    public function testFiguresPerCenterAndForTheCadreOfThatCenter(): void
    {
        $stats = $this->stats('admin');
        self::assertSame(
            ['patients' => [7, 1, 5, 1, 1], 'programs' => [5, 1, 1, 1, 1, 1], 'averageProgramScore' => 69, 'completedDuration' => 1800, 'activity' => [8, 70, 1, 1]],
            $this->figures($this->area($stats, 'Recette Paris')),
            '(70 + 75 + 40 + 90) / 4 = 68,75 → 69 ; 420 / 6 = 70',
        );
        self::assertSame(
            ['patients' => [2, 1, 1, 0, 1], 'programs' => [1, 0, 0, 1, 0, 0], 'averageProgramScore' => 70, 'completedDuration' => null, 'activity' => [1, 70, 0, 0]],
            $this->figures($this->area($stats, 'Recette Lyon')),
        );
        self::assertSame(
            ['patients' => [1, 0, 0, 1, 0], 'programs' => [0, 0, 0, 0, 0, 0], 'averageProgramScore' => null, 'completedDuration' => null, 'activity' => [0, null, 0, 0]],
            $this->figures($this->area($stats, 'Recette Nice')),
        );

        // Le cadre de Paris voit exactement les chiffres de Paris, et rien des autres centres
        $cadre = $this->stats('cadre.paris');
        self::assertSame($this->figures($this->area($stats, 'Recette Paris')), $this->figures($cadre['total']));
        self::assertSame(['Recette Paris'], array_column($cadre['centers'], 'center'));
        $this->requestAs($this->user('cadre.paris'), 'GET', '/api/statistics?centers[]='.$this->user('cadre.lyon')->getCenters()->first()->getId()->toRfc4122());
        self::assertResponseStatusCodeSame(403);
    }

    public function testPeriodsFollowTheExpectedResults(): void
    {
        // 30 derniers jours : S1 et S2 de P2, S1 de P3, S1 de L1 ; P5 (-32 j) et P1 (-40 j) sortent de la période
        $thirty = $this->stats('admin', '?from='.$this->day(30).'&to='.$this->day(0))['total'];
        self::assertSame(62, $thirty['averageProgramScore'], '(75 + 40 + 70) / 3 = 61,67');
        self::assertNull($thirty['averageCompletedProgramDurationSeconds'], 'Aucun parcours achevé dans la période');
        self::assertSame([4, 65, 0, 1], [$thirty['activity']['validatedSessions'], $thirty['activity']['averageSessionScore'], $thirty['activity']['completedPrograms'], $thirty['activity']['interruptedPrograms']], '(100 + 50 + 40 + 70) / 4');
        self::assertSame(10, $thirty['patients']['registered'], 'Les effectifs restent à date');
        self::assertSame(6, $thirty['programs']['total']);

        // 60 derniers jours : tout le jeu, y compris le parcours achevé il y a 40 jours
        $sixty = $this->stats('admin', '?from='.$this->day(60).'&to='.$this->day(0))['total'];
        self::assertSame([69, 1800, 9], [$sixty['averageProgramScore'], $sixty['averageCompletedProgramDurationSeconds'], $sixty['activity']['validatedSessions']]);

        // Période sans activité (avant le jeu de données)
        $empty = $this->stats('admin', '?from='.$this->day(400).'&to='.$this->day(300))['total'];
        self::assertNull($empty['averageProgramScore']);
        self::assertNull($empty['averageCompletedProgramDurationSeconds']);
        self::assertSame(0, $empty['activity']['validatedSessions']);

        // Bornes : le jour de clôture du parcours achevé (il y a 40 jours), puis la veille et le lendemain
        self::assertSame(1800, $this->stats('admin', '?from='.$this->day(40).'&to='.$this->day(40))['total']['averageCompletedProgramDurationSeconds']);
        self::assertNull($this->stats('admin', '?from='.$this->day(39).'&to='.$this->day(0))['total']['averageCompletedProgramDurationSeconds']);
        self::assertNull($this->stats('admin', '?from='.$this->day(60).'&to='.$this->day(41))['total']['averageCompletedProgramDurationSeconds']);
    }

    public function testNurseFiguresIgnoreArchivedPatientsAndSupersededValidations(): void
    {
        $expected = [
            // [séances validées (dernière validation par cours), patients, score moyen hors post-test, durée en secondes]
            'IdeParisA Alix' => [5, 2, 60, 2200],   // P1 : S1, S2, S3, PT (l'ancien S1 à 30 % est remplacé) + P3 ; P8 archivé exclu
            'IdeParisB Basile' => [3, 2, 80, 2000],
            'IdeLyon Lou' => [1, 1, 70, 500],
            'IdeNice Noa' => [0, 0, null, 0],
        ];
        $rows = array_column($this->stats('admin')['nurses'], null, 'name');
        foreach ($expected as $name => $values) {
            self::assertSame($values, [$rows[$name]['validatedSessions'], $rows[$name]['patients'], $rows[$name]['averageScore'], $rows[$name]['totalDurationSeconds']], $name);
        }

        foreach (['ide.paris.a' => 'IdeParisA Alix', 'ide.paris.b' => 'IdeParisB Basile', 'ide.lyon' => 'IdeLyon Lou'] as $email => $name) {
            $mine = $this->requestAs($this->user($email), 'GET', '/api/statistics/me')->toArray()['totals'];
            self::assertSame($expected[$name], [$mine['validatedSessions'], $mine['patients'], $mine['averageScore'], $mine['totalDurationSeconds']], "Écran personnel : $name");
        }
    }

    public function testExcelExportsMatchTheExpectedResults(): void
    {
        $load = function (string $as, string $url) {
            $response = $this->requestAs($this->user($as), 'GET', $url);
            self::assertResponseIsSuccessful();
            $file = tempnam(sys_get_temp_dir(), 'xlsx');
            file_put_contents($file, $response->getContent());
            $book = IOFactory::load($file);
            unlink($file);

            return $book;
        };
        $rows = static function ($book, string $sheet): array {
            return array_values(array_filter($book->getSheetByName($sheet)->toArray(null, true, false), static fn (array $r) => null !== $r[0]));
        };

        $last = static fn (array $list): array => $list[\count($list) - 1];

        // Statistiques nationales : ligne de total de chaque feuille
        $book = $load('admin', '/api/exports/statistics.xlsx');
        $patients = $last($rows($book, 'Patients'));
        self::assertSame([10, 6, 2], [$patients[1], $patients[2], $patients[8]]);
        $programs = $last($rows($book, 'Parcours'));
        self::assertSame([6, 1, 1, 2, 1, 1, 69], [$programs[1], $programs[2], $programs[4], $programs[6], $programs[8], $programs[10], $programs[12]]);
        self::assertEqualsWithDelta(30.0, $programs[13], 0.01, 'Durée moyenne : 1 800 s = 30 min');
        $nurses = array_column(array_filter($rows($book, 'IDE'), static fn (array $r) => \is_int($r[2] ?? null)), 2, 0);
        self::assertSame([5, 3, 1, 0], [$nurses['IdeParisA Alix'], $nurses['IdeParisB Basile'], $nurses['IdeLyon Lou'], $nurses['IdeNice Noa']]);

        // Bilan du patient achevé : synthèse, historique complet avec l'ancienne répétition
        $achevee = $this->em()->getRepository(\App\Entity\Patient::class)->findOneBy(['lastName' => 'Achevée']);
        $book = $load('ide.paris.a', '/api/exports/patients.xlsx?patients[]='.$achevee->getId()->toRfc4122());
        $summary = $rows($book, 'Synthèse')[1];
        self::assertSame(['ACHEVÉE', 'Alice', 'Recette Paris', 'Achevé', 4, 4, 70, 70], [$summary[0], $summary[1], $summary[3], $summary[5], $summary[6], $summary[7], $summary[8], $summary[9]]);
        self::assertEqualsWithDelta(30.0, $summary[10], 0.01);
        self::assertStringContainsString('CadreParis', (string) $summary[11]);
        $history = \array_slice($rows($book, 'Historique des séances'), 1);
        self::assertCount(5, $history, 'Quatre cours validés et l\'ancienne validation répétée de S1');
        $s1 = array_values(array_filter($history, static fn (array $r) => 'S1' === $r[3]));
        self::assertEqualsCanonicalizing([30, 80], array_column($s1, 9));
        $detail = $rows($book, 'Détail des séances');
        self::assertContains(null, array_column(array_filter($detail, static fn (array $r) => 'S3' === $r[3]), 8), 'Cours sans note : score vide, pas 0');

        // Patient au parcours non démarré : statut seulement, aucune séance
        $david = $this->em()->getRepository(\App\Entity\Patient::class)->findOneBy(['lastName' => 'NonDemarre']);
        $book = $load('ide.paris.b', '/api/exports/patients.xlsx?patients[]='.$david->getId()->toRfc4122());
        $summary = $rows($book, 'Synthèse')[1];
        self::assertSame('Non démarré', $summary[5]);
        self::assertNull($summary[6]);
        self::assertCount(1, $rows($book, 'Historique des séances'), 'En-tête seul');
    }

    public function testPatientReportStatusesUseTheScreenVocabulary(): void
    {
        $response = $this->requestAs($this->user('cadre.paris'), 'GET', '/api/exports/patients.xlsx');
        self::assertResponseIsSuccessful();
        $file = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($file, $response->getContent());
        $rows = IOFactory::load($file)->getSheetByName('Synthèse')->toArray(null, true, false);
        unlink($file);
        $statuses = array_column(\array_slice($rows, 1), 5, 0);

        self::assertEquals([
            'ACHEVÉE' => 'Achevé', 'ENCOURS' => 'En cours', 'INACTIVE' => 'Inactif (15 jours)', 'NONDEMARRE' => 'Non démarré',
            'INTERROMPUE' => 'Interrompu', 'NONELIGIBLE' => 'Aucun', 'ENATTENTE' => 'Aucun',
        ], $statuses, 'Sept patients non archivés de Paris, statut de suivi comme à l\'écran ; l\'archivé est exclu');
    }
}
