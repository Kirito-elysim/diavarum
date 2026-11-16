<?php

namespace App\Tests\Api;

use App\Entity\Center;
use App\Entity\InterruptionReason;
use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

/**
 * Déroulement d'une séance et d'un parcours (cahier des charges §2 à §4).
 */
final class TrainingWorkflowTest extends ApiTestCaseBase
{
    private Center $center;
    private User $ide;
    private Patient $patient;
    private Module $module;
    private TrainingProgram $program;
    /** @var list<ModuleCompetency> */
    private array $competencies = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->center = $this->createCenter();
        $this->ide = $this->createUser(UserRole::Ide, [$this->center]);
        $this->patient = $this->createPatient($this->center, $this->ide)->setEligibilityStatus(EligibilityStatus::Eligible);

        // QCM à 3 bonnes réponses + QCU (1) + un bloc de texte non noté → 4 réponses attendues
        $this->module = (new Module())->setCode('S98')->setTitle('Cours noté')->setPosition(98)->setContent([[
            'id' => 'p1', 'title' => 'Page', 'blocks' => [
                ['id' => 'q1', 'type' => 'quiz', 'questionType' => 'qcm', 'question' => '?', 'options' => [
                    ['id' => 'a', 'label' => 'A', 'isCorrect' => true],
                    ['id' => 'b', 'label' => 'B', 'isCorrect' => true],
                    ['id' => 'c', 'label' => 'C', 'isCorrect' => true],
                    ['id' => 'd', 'label' => 'D', 'isCorrect' => false],
                ]],
                ['id' => 'q2', 'type' => 'quiz', 'questionType' => 'qcu', 'question' => '?', 'options' => []],
                ['id' => 't1', 'type' => 'text', 'content' => 'Lecture'],
            ],
        ]]);
        $this->em()->persist($this->module);
        foreach (['Compétence A', 'Compétence B'] as $i => $label) {
            $competency = (new ModuleCompetency())->setModule($this->module)->setLabel($label)->setPosition($i);
            $this->module->getCompetencies()->add($competency);
            $this->em()->persist($competency);
            $this->competencies[] = $competency;
        }

        $this->program = (new TrainingProgram())->setPatient($this->patient);
        $this->program->setAuthor($this->ide);
        $this->program->addModule($this->module);
        $this->em()->persist($this->program);
        $this->em()->flush();
    }

    private function startSession(?User $as = null): string
    {
        $response = $this->requestAs($as ?? $this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $this->iri($this->program),
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['id'];
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(array $answers = [['blockId' => 'q1', 'correct' => 2, 'total' => 3], ['blockId' => 'q2', 'correct' => 1, 'total' => 1]]): array
    {
        return [
            'durationSeconds' => 1860,
            'answers' => $answers,
            'competencies' => [
                ['id' => $this->competencies[0]->getId()->toRfc4122(), 'validated' => true],
                ['id' => $this->competencies[1]->getId()->toRfc4122(), 'validated' => false],
            ],
        ];
    }

    /**
     * @return array<string, mixed> suivi de la séance dans le parcours
     */
    private function tracking(): array
    {
        $program = $this->requestAs($this->ide, 'GET', $this->iri($this->program))->toArray();

        return $program + ['module' => $program['modules'][0]];
    }

    public function testStartingASessionActivatesProgramAndMarksCourseAsNotFinished(): void
    {
        $this->startSession();

        $tracking = $this->tracking();
        self::assertSame('actif', $tracking['status']);
        self::assertSame('actif', $tracking['activityStatus']);
        self::assertNotNull($tracking['lastActivityAt']);
        self::assertSame('non_termine', $tracking['module']['status']);
        self::assertSame(0, $tracking['validatedCount']);
    }

    public function testValidationRefreshesActivityWithoutChangingFirstStart(): void
    {
        $id = $this->startSession();
        $start = $this->tracking()['startedAt'];
        $this->em()->getConnection()->executeStatement("UPDATE training_program SET last_activity_at = NOW() - INTERVAL '16 days' WHERE id = ?", [$this->program->getId()->toRfc4122()]);
        $this->em()->clear();
        self::assertSame('non_actif', $this->tracking()['activityStatus']);
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        self::assertResponseIsSuccessful();
        $tracking = $this->tracking();
        self::assertSame('actif', $tracking['activityStatus']);
        self::assertSame($start, $tracking['startedAt']);
    }

    public function testSessionWithSixCompetenciesCanBeValidated(): void
    {
        for ($i = 2; $i < Module::MAX_COMPETENCIES; ++$i) {
            $competency = (new ModuleCompetency())->setModule($this->module)->setLabel('Compétence '.$i)->setPosition($i);
            $this->module->getCompetencies()->add($competency);
            $this->em()->persist($competency);
            $this->competencies[] = $competency;
        }
        $this->em()->flush();
        $payload = $this->validPayload();
        $payload['competencies'] = array_map(static fn (ModuleCompetency $c) => [
            'id' => $c->getId()->toRfc4122(), 'validated' => true,
        ], $this->competencies);
        $id = $this->startSession();
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $payload);
        self::assertResponseIsSuccessful();
        self::assertSame('validee', $this->client->getResponse()->toArray()['status']);
    }

    public function testPostTestRequiresCompletedCoursesAndDoesNotRecordDuration(): void
    {
        $post = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'PT']);
        $this->program->addModule($post);
        $this->em()->flush();
        $payload = ['patient' => $this->iri($this->patient), 'module' => $this->iri($post), 'program' => $this->iri($this->program)];
        $this->requestAs($this->ide, 'POST', '/api/sessions', $payload);
        self::assertResponseStatusCodeSame(422);

        $program = $this->em()->find(TrainingProgram::class, $this->program->getId());
        $program->findModule($this->module)->markValidated(0, 60);
        $this->em()->flush();
        $session = $this->requestAs($this->ide, 'POST', '/api/sessions', $payload)->toArray();
        self::assertResponseStatusCodeSame(201);
        $result = $this->requestAs($this->ide, 'POST', '/api/sessions/'.$session['id'].'/validate', [
            'durationSeconds' => 120, 'answers' => [], 'competencies' => [],
        ])->toArray();
        self::assertResponseIsSuccessful();
        self::assertSame(0, $result['durationSeconds']);
    }

    public function testDeselectedCourseCannotBeStarted(): void
    {
        $this->program->findModule($this->module)->setSelected(false);
        $this->em()->flush();

        $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $this->iri($this->program),
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testValidationScoresCorrectAnswersWithoutPenaltyAndRecordsCompetencies(): void
    {
        $id = $this->startSession();

        $result = $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload())->toArray();

        // 2 + 1 bonnes réponses sur 4 attendues = 75 %, la mauvaise réponse ne retire rien
        self::assertSame(['status' => 'validee', 'score' => 75, 'durationSeconds' => 1860], $result);

        $session = $this->requestAs($this->ide, 'GET', "/api/sessions/$id")->toArray();
        self::assertCount(2, $session['competencyValidations']);

        $tracking = $this->tracking();
        self::assertSame('valide', $tracking['module']['status']);
        self::assertSame(75, $tracking['module']['score']);
        self::assertSame(1, $tracking['validatedCount']);
        self::assertSame(75, $tracking['averageScore']);
        self::assertSame(1860, $tracking['totalDurationSeconds']);
    }

    public function testProgressRatioNeverExceedsTheSelectedCoursesAfterDeselectingAValidatedOne(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->center]);
        $id = $this->startSession();
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        $tracking = $this->tracking();
        self::assertSame([1, 1], [$tracking['validatedCount'], $tracking['selectedCount']]);

        $this->requestAs($this->ide, 'PATCH', '/api/program_modules/'.$tracking['module']['id'], ['selected' => false]);
        self::assertResponseIsSuccessful();
        $after = $this->tracking();
        self::assertSame([0, 0], [$after['validatedCount'], $after['selectedCount']], 'Numérateur et dénominateur sur les mêmes séances');
        self::assertSame(75, $after['averageScore'], 'Le score de la séance validée reste dans la moyenne');
        self::assertSame(1860, $after['totalDurationSeconds'], 'Et sa durée dans le temps cumulé');

        $this->requestAs($cadre, 'POST', $this->iri($this->program).'/complete');
        self::assertResponseIsSuccessful('Le parcours reste validable : une séance a bien été validée');
    }

    public function testValidatedCourseCannotBeStartedOrValidatedAgain(): void
    {
        $id = $this->startSession();
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        self::assertResponseIsSuccessful();

        $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $this->iri($this->program),
        ]);
        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('déjà validé', $this->client->getResponse()->toArray(false)['detail']);

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        self::assertResponseStatusCodeSame(422);
        self::assertSame(75, $this->tracking()['module']['score']);
    }

    public function testUnansweredExerciseCountsAsZero(): void
    {
        $id = $this->startSession();

        $result = $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload([['blockId' => 'q2', 'correct' => 1, 'total' => 1]]))->toArray();

        self::assertSame(25, $result['score']);
    }

    public function testInflatedOrUnknownAnswersAreRejected(): void
    {
        $id = $this->startSession();

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload([['blockId' => 'q1', 'correct' => 5, 'total' => 5]]));
        self::assertResponseStatusCodeSame(422, 'Le total doit correspondre au contenu du cours');

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload([['blockId' => 't1', 'correct' => 1, 'total' => 1]]));
        self::assertResponseStatusCodeSame(422, 'Un bloc non noté ne peut pas être compté');
    }

    public function testEveryCompetencyMustBeAssessed(): void
    {
        $id = $this->startSession();
        $payload = $this->validPayload();
        array_pop($payload['competencies']);

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $payload);

        self::assertResponseStatusCodeSame(422);
    }

    public function testInterruptedSessionRecordsNothing(): void
    {
        $id = $this->startSession();

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/interrupt");
        self::assertResponseIsSuccessful();

        $session = $this->requestAs($this->ide, 'GET', "/api/sessions/$id")->toArray();
        self::assertSame('interrompue', $session['status']);
        self::assertNull($session['score']);
        self::assertSame(0, $session['durationSeconds']);
        self::assertSame('non_termine', $this->tracking()['module']['status'], 'Le cours reste à reprendre');

        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        self::assertResponseStatusCodeSame(422, 'Une séance interrompue ne peut plus être validée');
        self::assertNotSame($id, $this->startSession(), 'Le cours interrompu peut être recommencé.');
    }

    public function testStartingANewSessionInterruptsTheOpenOne(): void
    {
        $first = $this->startSession();
        $this->startSession();

        self::assertSame('interrompue', $this->requestAs($this->ide, 'GET', "/api/sessions/$first")->toArray()['status']);
    }

    public function testNurseOfAnotherCenterCannotValidate(): void
    {
        $id = $this->startSession();
        $stranger = $this->createUser(UserRole::Ide, [$this->createCenter('Ailleurs')]);

        $this->requestAs($stranger, 'POST', "/api/sessions/$id/validate", $this->validPayload());

        self::assertResponseStatusCodeSame(403);
    }

    public function testOnlyCadreValidatesProgramWhichThenBecomesReadOnly(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->center]);
        $id = $this->startSession();
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        $programPath = $this->iri($this->program);

        $this->requestAs($this->ide, 'POST', "$programPath/complete");
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($cadre, 'POST', "$programPath/complete");
        self::assertResponseIsSuccessful();
        self::assertSame('acheve', $this->tracking()['status']);

        $selection = $this->tracking()['module'];
        $this->requestAs($this->ide, 'PATCH', '/api/program_modules/'.$selection['id'], ['selected' => false]);
        self::assertResponseStatusCodeSame(422, 'Parcours achevé non modifiable');

        $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $programPath,
        ]);
        self::assertResponseStatusCodeSame(422, 'Plus de séance sur un parcours achevé');
    }

    public function testCadreCanCancelProgramValidationWithAReasonAndTheCourseStaysLocked(): void
    {
        $cadre = $this->createUser(UserRole::Cadre, [$this->center]);
        $admin = $this->createUser(UserRole::AdminNational, []);
        $id = $this->startSession();
        $this->requestAs($this->ide, 'POST', "/api/sessions/$id/validate", $this->validPayload());
        $programPath = $this->iri($this->program);

        $this->requestAs($cadre, 'POST', "$programPath/reopen", ['reason' => 'x']);
        self::assertResponseStatusCodeSame(422, 'Seul un parcours achevé peut être rouvert');

        $this->requestAs($cadre, 'POST', "$programPath/complete");
        $this->requestAs($this->ide, 'POST', "$programPath/reopen", ['reason' => 'Erreur de patient']);
        self::assertResponseStatusCodeSame(403, 'Réservé au cadre et à l\'administrateur national');

        $this->requestAs($cadre, 'POST', "$programPath/reopen", ['reason' => ' ']);
        self::assertResponseStatusCodeSame(422, 'Motif obligatoire');

        $this->requestAs($cadre, 'POST', "$programPath/reopen", ['reason' => 'Erreur de patient']);
        self::assertResponseIsSuccessful();
        $tracking = $this->tracking();
        self::assertSame('actif', $tracking['status']);
        self::assertNull($tracking['validatedBy'] ?? null);

        $this->em()->clear();
        $log = $this->em()->getConnection()->fetchAssociative("SELECT user_email, detail FROM access_log WHERE path LIKE '%/reopen' AND status_code = 200");
        self::assertSame($cadre->getEmail(), $log['user_email']);
        self::assertStringContainsString('Erreur de patient', $log['detail']);

        $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $programPath,
        ]);
        self::assertResponseStatusCodeSame(422, 'Le cours validé reste verrouillé (validation unique)');

        $this->requestAs($cadre, 'POST', "$programPath/complete");
        $this->requestAs($admin, 'POST', "$programPath/reopen", ['reason' => 'Correction nationale']);
        self::assertResponseIsSuccessful();
    }

    public function testProgramInterruptionRequiresAReasonAndCanBeResumed(): void
    {
        $programPath = $this->iri($this->program);
        $reason = $this->em()->getRepository(InterruptionReason::class)->findOneBy([]);

        $cadre = $this->createUser(UserRole::Cadre, [$this->center]);
        $this->requestAs($cadre, 'POST', "$programPath/interrupt", ['reasons' => []]);
        self::assertResponseStatusCodeSame(422);

        $this->requestAs($this->ide, 'POST', "$programPath/interrupt", ['reasons' => [$reason->getId()->toRfc4122()]]);
        self::assertResponseStatusCodeSame(403, 'Seul un cadre clôture un parcours');

        $this->requestAs($cadre, 'POST', "$programPath/interrupt", ['reasons' => [$reason->getId()->toRfc4122()], 'notes' => 'Hospitalisation prolongée']);
        self::assertResponseIsSuccessful();
        self::assertSame('interrompu', $this->tracking()['status']);

        $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $programPath,
        ]);
        self::assertResponseStatusCodeSame(422, 'Pas de séance sur un parcours interrompu');

        $this->requestAs($this->ide, 'POST', "$programPath/resume");
        self::assertResponseIsSuccessful();
        self::assertSame('non_actif', $this->tracking()['status']);
    }

    public function testNurseOnlyListsProgramsOfHerCenters(): void
    {
        $elsewhere = $this->createCenter('Ailleurs');
        $otherIde = $this->createUser(UserRole::Ide, [$elsewhere]);
        $otherProgram = (new TrainingProgram())->setPatient($this->createPatient($elsewhere, $otherIde, 'Lointain'));
        $otherProgram->setAuthor($otherIde);
        $this->em()->persist($otherProgram);
        $this->em()->flush();

        $listed = array_column($this->requestAs($this->ide, 'GET', '/api/training_programs')->toArray(), 'id');
        self::assertSame([$this->program->getId()->toRfc4122()], $listed);

        $this->requestAs($this->ide, 'GET', '/api/training_programs/'.$otherProgram->getId());
        self::assertResponseStatusCodeSame(404);
    }

    public function testColleagueContinuesTheProgramAndIsRecordedAsTheSessionNurse(): void
    {
        $colleague = $this->createUser(UserRole::Ide, [$this->center]);

        // Le parcours a été créé par une autre IDE ; une tentative d'imposer l'IDE de la séance est ignorée
        $session = $this->requestAs($colleague, 'POST', '/api/sessions', [
            'patient' => $this->iri($this->patient),
            'module' => $this->iri($this->module),
            'program' => $this->iri($this->program),
            'nurse' => $this->iri($this->ide),
        ])->toArray();

        self::assertResponseStatusCodeSame(201);
        self::assertSame($this->ide->getId()->toRfc4122(), $this->program->getCreatedBy()->getId()->toRfc4122());
        self::assertSame($colleague->getId()->toRfc4122(), $session['nurse']['id']);
    }
}
