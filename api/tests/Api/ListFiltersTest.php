<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\Module;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

/**
 * Listes des séances et des parcours : filtres, tri et totaux côté serveur (listes paginées),
 * toujours dans le périmètre des centres de l'utilisateur.
 */
final class ListFiltersTest extends ApiTestCaseBase
{
    private Center $paris;
    private Center $lyon;
    private User $ideParis;
    private User $ideLyon;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paris = $this->createCenter('Paris');
        $this->lyon = $this->createCenter('Lyon');
        $this->ideParis = $this->createUser(UserRole::Ide, [$this->paris]);
        $this->ideLyon = $this->createUser(UserRole::Ide, [$this->lyon]);
        $this->admin = $this->createUser(UserRole::AdminNational);

        $hygiene = (new Module())->setCode('S90')->setTitle('Hygiène au centre')->setPosition(90);
        $tension = (new Module())->setCode('S91')->setTitle('Tension artérielle')->setPosition(91);
        $this->em()->persist($hygiene);
        $this->em()->persist($tension);

        // Paris : Dupont (2 séances validées 60 % et 90 %, 1 en cours) ; Lyon : Fontaine (1 séance validée 50 %)
        $dupont = $this->patientWithProgram($this->paris, $this->ideParis, 'Dupont');
        $fontaine = $this->patientWithProgram($this->lyon, $this->ideLyon, 'Fontaine');
        $this->session($dupont, $hygiene, $this->ideParis, 60, 1800, '2026-03-10');
        $this->session($dupont, $tension, $this->ideParis, 90, 2400, '2026-05-20');
        $this->session($dupont, $tension, $this->ideParis, null, 0, '2026-06-01');
        $this->session($fontaine, $hygiene, $this->ideLyon, 50, 2000, '2026-05-02');
        $this->em()->flush();
    }

    private function patientWithProgram(Center $center, User $ide, string $name): TrainingProgram
    {
        $patient = $this->createPatient($center, $ide, $name)->setEligibilityStatus(EligibilityStatus::Eligible);
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($ide);
        $program->markActive();
        $this->em()->persist($program);

        return $program;
    }

    private function session(TrainingProgram $program, Module $module, User $ide, ?int $score, int $seconds, string $day): void
    {
        $session = (new TrainingSession())->setPatient($program->getPatient())->setModule($module)->setProgram($program);
        $session->setAuthor($ide);
        $session->backdate(new \DateTimeImmutable($day.' 10:00:00'));
        if (null !== $score) {
            $session->markValidated($seconds, $score, []);
        }
        $this->em()->persist($session);
    }

    /** @return list<string> noms des patients des séances, dans l'ordre renvoyé */
    private function sessions(User $as, string $query): array
    {
        return array_map(static fn (array $s) => $s['patient']['lastName'].' '.$s['module']['title'], $this->requestAs($as, 'GET', '/api/sessions'.$query)->toArray());
    }

    public function testSessionsAreFilteredBySearchCenterStatusAndPeriod(): void
    {
        self::assertCount(1, $this->sessions($this->admin, '?search=FONT'), 'Recherche sans casse sur le patient');
        self::assertCount(2, $this->sessions($this->admin, '?search=hygi'), 'Recherche sur le titre de la séance');
        self::assertCount(3, $this->sessions($this->admin, '?center='.urlencode($this->iri($this->paris))));
        self::assertCount(3, $this->sessions($this->admin, '?status=validee'));
        self::assertSame(['Fontaine Hygiène au centre', 'Dupont Tension artérielle'], $this->sessions($this->admin, '?startedAt[after]=2026-05-01T00:00:00&startedAt[before]=2026-05-31T23:59:59&order[startedAt]=asc'));
    }

    public function testSessionsCanBeSortedByScoreWithEmptyScoresLast(): void
    {
        $sorted = array_map(static fn (array $s) => $s['score'], $this->requestAs($this->admin, 'GET', '/api/sessions?order[score]=asc')->toArray());

        self::assertSame([50, 60, 90, null], $sorted);
    }

    public function testFiltersNeverWidenTheNurseScope(): void
    {
        self::assertCount(0, $this->sessions($this->ideParis, '?center='.urlencode($this->iri($this->lyon))));
        self::assertCount(0, $this->sessions($this->ideParis, '?search=fontaine'));
    }

    public function testSessionSummaryMatchesTheFilters(): void
    {
        $summary = $this->requestAs($this->admin, 'GET', '/api/summaries/sessions')->toArray();
        self::assertSame(['count' => 4, 'averageScore' => 67, 'averageDurationSeconds' => 2067], $summary, 'Moyennes sur les séances validées');

        $paris = $this->requestAs($this->ideParis, 'GET', '/api/summaries/sessions?status=validee&search=tension')->toArray();
        self::assertSame(['count' => 1, 'averageScore' => 90, 'averageDurationSeconds' => 2400], $paris);
    }

    public function testProgramsAreFilteredAndCountedByStatus(): void
    {
        $names = array_map(static fn (array $p) => $p['patient']['lastName'], $this->requestAs($this->admin, 'GET', '/api/training_programs?search=dup')->toArray());
        self::assertSame(['Dupont'], $names);
        self::assertSame('Paris', $this->requestAs($this->admin, 'GET', '/api/training_programs?search=dup')->toArray()[0]['patient']['center']['name']);

        $summary = $this->requestAs($this->admin, 'GET', '/api/summaries/training_programs?center='.urlencode($this->iri($this->lyon)))->toArray();
        self::assertSame(1, $summary['total']);
        self::assertSame(1, $summary['byStatus']['actif']);

        self::assertSame(1, $this->requestAs($this->ideParis, 'GET', '/api/summaries/training_programs')->toArray()['total'], 'Périmètre de l\'IDE');
    }
}
