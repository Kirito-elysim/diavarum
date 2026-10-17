<?php

namespace App\Tests\Api;

use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\SessionCompetencyValidation;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

/**
 * API d'intégration des contenus par le prestataire (cahier des charges §4).
 */
final class ContentIntegrationTest extends ApiTestCaseBase
{
    private const TOKEN = 'jeton-de-test-prestataire';

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return $overrides + [
            'title' => 'Hygiène au centre de dialyse',
            'estimatedDuration' => 35,
            'competencies' => ['Le patient se lave les mains avant la séance', 'Le patient connaît la tenue adaptée'],
            'content' => [[
                'id' => 'p1', 'title' => 'Se laver les mains', 'blocks' => [
                    ['id' => 't1', 'type' => 'text', 'content' => 'Pourquoi ?'],
                    ['id' => 'q1', 'type' => 'quiz', 'questionType' => 'qcu', 'question' => '?', 'options' => [['id' => 'a', 'label' => 'Oui', 'isCorrect' => true]]],
                ],
            ]],
        ];
    }

    private function put(string $code, array $payload, array $headers = ['X-Content-Token' => self::TOKEN]): void
    {
        $this->client->request('PUT', "/api/content/modules/$code", ['json' => $payload, 'headers' => $headers]);
    }

    public function testProviderIntegratesASessionWithItsToken(): void
    {
        $this->put('S2', $this->payload());
        self::assertResponseIsSuccessful();

        $module = $this->client->getResponse()->toArray();
        self::assertSame(35, $module['estimatedDuration']);
        self::assertCount(2, $module['competencies']);
        self::assertSame('q1', $module['content'][0]['blocks'][1]['id']);
    }

    public function testAccessRequiresTheProviderTokenOrANationalAdmin(): void
    {
        $this->put('S2', $this->payload(), []);
        self::assertResponseStatusCodeSame(401);

        $this->put('S2', $this->payload(), ['X-Content-Token' => 'faux']);
        self::assertResponseStatusCodeSame(403);

        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $this->requestAs($ide, 'PUT', '/api/content/modules/S2', $this->payload());
        self::assertResponseStatusCodeSame(403);

        $admin = $this->createUser(UserRole::AdminNational);
        $this->requestAs($admin, 'PUT', '/api/content/modules/S2', $this->payload());
        self::assertResponseIsSuccessful();
    }

    public function testProviderTokenGivesNoAccessToPatientData(): void
    {
        $this->client->request('GET', '/api/patients', ['headers' => ['X-Content-Token' => self::TOKEN]]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testInvalidContentIsRejectedWithExplicitErrors(): void
    {
        $payload = $this->payload();
        $payload['content'][0]['blocks'][] = ['id' => 'q1', 'type' => 'inconnu'];

        $this->put('S2', $payload);

        self::assertResponseStatusCodeSame(422);
        $errors = $this->client->getResponse()->toArray(false)['errors'];
        self::assertCount(2, $errors, 'Identifiant en double + type inconnu');
    }

    public function testAuthoringToolBlocksAreAccepted(): void
    {
        $payload = $this->payload();
        $payload['content'][0]['blocks'] = [
            ['id' => 'it', 'type' => 'image-text', 'imageUrl' => '/picto.png', 'alt' => '', 'content' => 'Texte', 'size' => 'picto'],
            ['id' => 'ic', 'type' => 'info-card', 'title' => 'Définition', 'content' => 'Texte', 'variant' => 'definition'],
            ['id' => 'fc', 'type' => 'flip-cards', 'question' => '', 'instruction' => 'Touchez une carte pour répondre à la question', 'cards' => [['id' => 'c', 'front' => 'R', 'back' => 'V']]],
            ['id' => 'hs', 'type' => 'hotspot', 'imageUrl' => '/i.png', 'alt' => '', 'hotspots' => [['id' => 'h', 'x' => 1, 'y' => 2, 'label' => 'L', 'description' => 'D', 'icon' => 'heart']]],
            ['id' => 'dd', 'type' => 'categorize', 'question' => '?', 'instruction' => 'Glissez', 'categories' => ['Panier'], 'items' => [
                ['id' => 'a', 'label' => 'A', 'category' => 'Panier'], ['id' => 'b', 'label' => 'B', 'category' => 'Panier'],
            ]],
        ];

        $this->put('S2', $payload);
        self::assertResponseIsSuccessful();
        self::assertSame(['dd' => 2], $this->scoreCalculator()->evaluatedBlocks($this->em()->getRepository(Module::class)->findOneBy(['code' => 'S2'])));

        $payload['content'][0]['blocks'][4]['items'][1]['category'] = 'Zone inconnue';
        $this->put('S2', $payload);
        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('zone de destination', $this->client->getResponse()->toArray(false)['detail']);
    }

    private function scoreCalculator(): \App\Training\ScoreCalculator
    {
        return new \App\Training\ScoreCalculator();
    }

    public function testAtMostSixCompetencies(): void
    {
        $this->put('S2', $this->payload(['competencies' => ['1', '2', '3', '4', '5', '6', '7']]));

        self::assertResponseStatusCodeSame(422);
    }

    public function testUnscoredQuestionCanHaveCorrectionWithoutAffectingScore(): void
    {
        $payload = $this->payload();
        $payload['content'][0]['instruction'] = 'Touchez une réponse.';
        $quiz = &$payload['content'][0]['blocks'][1];
        $quiz['graded'] = false;
        $quiz['showCorrection'] = true;
        $this->put('S2', $payload);
        self::assertResponseIsSuccessful();
        $result = $this->client->getResponse()->toArray();
        self::assertTrue($result['content'][0]['blocks'][1]['showCorrection']);
        self::assertSame('Touchez une réponse.', $result['content'][0]['instruction']);
        self::assertNull(\App\Training\ScoreCalculator::expectedAnswers($quiz));

        $quiz['options'][0]['isCorrect'] = false;
        $this->put('S2', $payload);
        self::assertResponseStatusCodeSame(422);

        $quiz['showCorrection'] = false;
        $this->put('S2', $payload);
        self::assertResponseIsSuccessful();
    }

    public function testSingleChoiceRequiresExactlyOneCorrectAnswer(): void
    {
        $payload = $this->payload();
        $payload['content'][0]['blocks'][1]['options'][] = ['id' => 'b', 'label' => 'Autre', 'isCorrect' => true];
        $this->put('S2', $payload);
        self::assertResponseStatusCodeSame(422);
    }

    public function testUnpublishedContentIsOnlyReadableByNationalAdmin(): void
    {
        $this->put('S2', $this->payload(['published' => false]));
        self::assertResponseIsSuccessful();
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'S2']);
        $url = '/api/modules/'.$module->getId();
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $this->requestAs($ide, 'GET', $url);
        self::assertResponseStatusCodeSame(404);
        $admin = $this->createUser(UserRole::AdminNational);
        $this->requestAs($admin, 'GET', $url);
        self::assertResponseIsSuccessful();
    }

    public function testRemovedCompetencyIsArchivedAndKeepsItsAssessments(): void
    {
        $this->put('S2', $this->payload());
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'S2']);
        $competency = $this->em()->getRepository(ModuleCompetency::class)->findOneBy(['module' => $module, 'position' => 1]);

        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($ide);
        $session = (new TrainingSession())->setPatient($patient)->setModule($module)->setProgram($program);
        $session->setAuthor($ide);
        $validation = (new SessionCompetencyValidation())->setSession($session)->setCompetency($competency)->setValidated(true);
        $validation->setAuthor($ide);
        foreach ([$program, $session, $validation] as $entity) {
            $this->em()->persist($entity);
        }
        $this->em()->flush();
        $competencyId = $competency->getId();

        $this->put('S2', $this->payload(['competencies' => ['Le patient se lave les mains avant la séance']]));
        self::assertResponseIsSuccessful();

        $this->em()->clear();
        $archived = $this->em()->find(ModuleCompetency::class, $competencyId);
        self::assertNotNull($archived, 'La compétence retirée reste en base');
        self::assertTrue($archived->isArchived());
        self::assertSame(1, $this->em()->getRepository(SessionCompetencyValidation::class)->count(['competency' => $archived]));

        $admin = $this->createUser(UserRole::AdminNational);
        $module = $this->requestAs($admin, 'GET', '/api/modules/'.$module->getId())->toArray();
        self::assertCount(1, $module['competencies']);
        self::assertTrue(array_is_list($module['competencies']));
        $listed = array_values(array_filter($this->requestAs($admin, 'GET', '/api/modules')->toArray(), static fn (array $m) => 'S2' === $m['code']))[0];
        self::assertSame(1, $listed['competencyCount'], 'Le compteur ignore les compétences archivées');
    }
}
