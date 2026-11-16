<?php

namespace App\Tests\Api;

use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\User;
use App\Enum\UserRole;

/**
 * Parcours complet d'un patient par l'API, comme le ferait l'application : enregistrement, CODEX, décision d'éligibilité,
 * création du parcours, sélection des optionnelles, séances interrompues, reprise depuis le début, interruption et reprise
 * du parcours, validation IDE, clôture par le cadre, annulation de la clôture. Base de test uniquement.
 */
final class EndToEndJourneyTest extends ApiTestCaseBase
{
    private User $ide;
    private User $cadre;
    private string $patientIri;
    private Module $graded;

    protected function setUp(): void
    {
        parent::setUp();
        $center = $this->createCenter();
        $this->ide = $this->createUser(UserRole::Ide, [$center]);
        $this->cadre = $this->createUser(UserRole::Cadre, [$center]);

        // Un cours noté (QCU + QCM) et deux compétences, publié : il rejoint le parcours avec le catalogue
        $this->graded = (new Module())->setCode('S98')->setTitle('Cours noté')->setPosition(98)->setContent([[
            'id' => 'p1', 'title' => 'Page', 'blocks' => [
                ['id' => 'q1', 'type' => 'quiz', 'questionType' => 'qcm', 'question' => '?', 'options' => [
                    ['id' => 'a', 'label' => 'A', 'isCorrect' => true], ['id' => 'b', 'label' => 'B', 'isCorrect' => true], ['id' => 'c', 'label' => 'C', 'isCorrect' => false],
                ]],
                ['id' => 'q2', 'type' => 'quiz', 'questionType' => 'qcu', 'question' => '?', 'options' => []],
            ],
        ]]);
        $this->em()->persist($this->graded);
        foreach (['Compétence A', 'Compétence B'] as $i => $label) {
            $competency = (new ModuleCompetency())->setModule($this->graded)->setLabel($label)->setPosition($i);
            $this->graded->getCompetencies()->add($competency);
            $this->em()->persist($competency);
        }
        $this->em()->flush();
    }

    private function codex(array $overrides = []): void
    {
        $this->requestAs($this->ide, 'POST', '/api/codex_tests', array_replace([
            'patient' => $this->patientIri, 'words' => ['Clé', 'ballon', 'citron'], 'clockTime' => '05:10',
            'clockChecks' => [true, true, true, true], 'wordRecallPassed' => true,
        ], $overrides));
        self::assertResponseStatusCodeSame(201);
    }

    /** @return array<string, mixed> */
    private function program(User $as, string $iri): array
    {
        return $this->requestAs($as, 'GET', $iri)->toArray();
    }

    /** @return array<string, mixed> */
    private function item(array $program, string $code): array
    {
        return array_values(array_filter($program['modules'], static fn (array $m) => $m['module']['code'] === $code))[0];
    }

    private function start(string $programIri, string $code): string
    {
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => $code]);
        $response = $this->requestAs($this->ide, 'POST', '/api/sessions', [
            'patient' => $this->patientIri, 'module' => '/api/modules/'.$module->getId()->toRfc4122(), 'program' => $programIri,
        ]);
        self::assertResponseStatusCodeSame(201, "Lancement de $code");

        return $response->toArray()['id'];
    }

    public function testFullJourneyFromRegistrationToClosure(): void
    {
        // 1. Enregistrement du patient par l'IDE
        $created = $this->requestAs($this->ide, 'POST', '/api/patients', [
            'firstName' => 'Parcours', 'lastName' => 'Complet', 'dateOfBirth' => '1950-04-02',
            'center' => '/api/centers/'.$this->ide->getCenters()->first()->getId()->toRfc4122(),
        ])->toArray();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('enregistre', $created['eligibilityStatus']);
        $this->patientIri = '/api/patients/'.$created['id'];

        // 2. Pas de parcours tant que le patient n'est pas éligible
        $this->requestAs($this->ide, 'POST', '/api/training_programs', ['patient' => $this->patientIri]);
        self::assertResponseStatusCodeSame(422);

        // 3. CODEX anormal → non éligible, motif obligatoire ; parcours toujours refusé
        $this->codex(['clockChecks' => [false, true, true, true], 'wordRecallPassed' => false]);
        $this->requestAs($this->ide, 'PATCH', $this->patientIri, ['eligibilityStatus' => 'non_eligible', 'eligibilityReasons' => []]);
        self::assertResponseStatusCodeSame(422, 'Non éligible sans motif refusé');
        $reasons = $this->requestAs($this->ide, 'GET', '/api/eligibility_reasons')->toArray();
        $this->requestAs($this->ide, 'PATCH', $this->patientIri, ['eligibilityStatus' => 'non_eligible', 'eligibilityReasons' => ['/api/eligibility_reasons/'.$reasons[0]['id']]]);
        self::assertResponseIsSuccessful();
        $this->requestAs($this->ide, 'POST', '/api/training_programs', ['patient' => $this->patientIri]);
        self::assertResponseStatusCodeSame(422, 'Non éligible : pas de parcours');

        // 4. Le CODEX ne se repasse pas ; l'éligibilité se rétablit par décision de l'IDE
        $this->requestAs($this->ide, 'POST', '/api/codex_tests', ['patient' => $this->patientIri, 'words' => ['Clé', 'ballon', 'citron'], 'clockTime' => '05:10', 'clockChecks' => [true, true, true, true], 'wordRecallPassed' => true]);
        self::assertResponseStatusCodeSame(422, 'Un seul test CODEX par patient');
        $this->requestAs($this->ide, 'PATCH', $this->patientIri, ['eligibilityStatus' => 'eligible', 'eligibilityReasons' => []]);
        self::assertResponseIsSuccessful();

        // 5. Parcours : systématiques cochées, optionnelles non, rien de commencé
        $program = $this->requestAs($this->ide, 'POST', '/api/training_programs', ['patient' => $this->patientIri])->toArray();
        self::assertResponseStatusCodeSame(201);
        $programIri = '/api/training_programs/'.$program['id'];
        $program = $this->program($this->ide, $programIri);
        $mandatory = array_filter($program['modules'], static fn (array $m) => $m['module']['mandatory']);
        $optional = array_filter($program['modules'], static fn (array $m) => !$m['module']['mandatory']);
        self::assertSame(\count($mandatory), $program['selectedCount']);
        self::assertSame(0, $program['validatedCount']);
        self::assertSame('non_demarre', $program['activityStatus']);
        self::assertNotEmpty($optional);
        self::assertSame([], array_filter($optional, static fn (array $m) => $m['selected']), 'Optionnelles non cochées');

        // 6. Sélection d'une optionnelle, enregistrée côté serveur, puis retirée
        $first = array_values($optional)[0];
        $this->requestAs($this->ide, 'PATCH', '/api/program_modules/'.$first['id'], ['selected' => true]);
        self::assertResponseIsSuccessful();
        self::assertSame(\count($mandatory) + 1, $this->program($this->ide, $programIri)['selectedCount']);
        $this->requestAs($this->ide, 'PATCH', '/api/program_modules/'.$first['id'], ['selected' => false]);
        self::assertSame(\count($mandatory), $this->program($this->ide, $programIri)['selectedCount']);

        // 7. Séance lancée puis quittée : cours « non terminé », parcours actif
        $codes = array_values(array_map(static fn (array $m) => $m['module']['code'], array_filter($mandatory, static fn (array $m) => 'PT' !== $m['module']['code'] && 'S98' !== $m['module']['code'])));
        $a = $this->start($programIri, $codes[0]);
        $this->requestAs($this->ide, 'POST', "/api/sessions/$a/interrupt");
        self::assertResponseIsSuccessful();
        $program = $this->program($this->ide, $programIri);
        self::assertSame('non_termine', $this->item($program, $codes[0])['status']);
        self::assertSame('actif', $program['activityStatus']);

        // 8. Trois cours commencés sans être terminés (condition du rappel de reprise)
        $this->start($programIri, $codes[1]);
        $this->start($programIri, $codes[2]);
        $program = $this->program($this->ide, $programIri);
        $unfinished = array_filter($program['modules'], static fn (array $m) => 'non_termine' === $m['status']);
        self::assertCount(3, $unfinished);

        // 9. Reprise depuis le début : nouvelle séance sur le même cours, l'ancienne est interrompue
        $again = $this->start($programIri, $codes[0]);
        self::assertNotSame($a, $again);
        self::assertSame('interrompue', $this->requestAs($this->ide, 'GET', "/api/sessions/$a")->toArray()['status']);
        self::assertSame('en_cours', $this->requestAs($this->ide, 'GET', "/api/sessions/$again")->toArray()['status']);

        // 10. Interruption du parcours avec motif, plus de séance, puis reprise
        $this->requestAs($this->cadre, 'POST', "$programIri/interrupt", ['reasons' => []]);
        self::assertResponseStatusCodeSame(422, 'Motif obligatoire');
        $reason = $this->requestAs($this->ide, 'GET', '/api/interruption_reasons')->toArray()[0]['id'];
        $this->requestAs($this->ide, 'POST', "$programIri/interrupt", ['reasons' => [$reason]]);
        self::assertResponseStatusCodeSame(403, 'Seul un cadre clôture un parcours');
        $this->requestAs($this->cadre, 'POST', "$programIri/interrupt", ['reasons' => [$reason], 'notes' => 'Hospitalisation']);
        self::assertResponseIsSuccessful();
        self::assertSame('interrompu', $this->program($this->ide, $programIri)['status']);
        $module = $this->em()->getRepository(Module::class)->findOneBy(['code' => $codes[3]]);
        $this->requestAs($this->ide, 'POST', '/api/sessions', ['patient' => $this->patientIri, 'module' => '/api/modules/'.$module->getId()->toRfc4122(), 'program' => $programIri]);
        self::assertResponseStatusCodeSame(422, 'Plus de séance sur un parcours interrompu');
        $this->requestAs($this->ide, 'POST', "$programIri/resume");
        self::assertResponseIsSuccessful();
        self::assertNotSame('interrompu', $this->program($this->ide, $programIri)['status']);

        // 11. Validation IDE d'un cours noté : score serveur, compétences, durée
        $graded = $this->start($programIri, 'S98');
        $competencies = array_map(static fn (ModuleCompetency $c) => ['id' => $c->getId()->toRfc4122(), 'validated' => true], $this->graded->getCompetencies()->toArray());
        $this->requestAs($this->ide, 'POST', "/api/sessions/$graded/validate", [
            'durationSeconds' => 900, 'competencies' => $competencies,
            'answers' => [['blockId' => 'q1', 'correct' => 2, 'total' => 2], ['blockId' => 'q2', 'correct' => 1, 'total' => 1]],
        ]);
        self::assertResponseIsSuccessful();
        $program = $this->program($this->ide, $programIri);
        self::assertSame('valide', $this->item($program, 'S98')['status']);
        self::assertSame(100, $this->item($program, 'S98')['score']);
        self::assertSame(1, $program['validatedCount']);

        // 12. Seul le cadre clôture le parcours, qui n'est plus modifiable
        $this->requestAs($this->ide, 'POST', "$programIri/complete");
        self::assertResponseStatusCodeSame(403);
        $this->requestAs($this->cadre, 'POST', "$programIri/complete");
        self::assertResponseIsSuccessful();
        $program = $this->program($this->cadre, $programIri);
        self::assertSame('acheve', $program['status']);
        self::assertSame($this->cadre->getId()->toRfc4122(), $program['validatedBy']['id']);
        $this->requestAs($this->ide, 'PATCH', '/api/program_modules/'.$first['id'], ['selected' => true]);
        self::assertResponseStatusCodeSame(422, 'Parcours achevé non modifiable');
        $this->requestAs($this->ide, 'POST', '/api/sessions', ['patient' => $this->patientIri, 'module' => '/api/modules/'.$module->getId()->toRfc4122(), 'program' => $programIri]);
        self::assertResponseStatusCodeSame(422);

        // 13. Le cours validé reste verrouillé ; erreur de clôture : annulation par le cadre, avec motif
        $this->requestAs($this->cadre, 'POST', "$programIri/reopen", ['reason' => 'Clôture par erreur']);
        self::assertResponseIsSuccessful();
        self::assertSame('actif', $this->program($this->cadre, $programIri)['status']);
        $this->start($programIri, $codes[3]);
        $graded = $this->em()->getRepository(Module::class)->findOneBy(['code' => 'S98']);
        $this->requestAs($this->ide, 'POST', '/api/sessions', ['patient' => $this->patientIri, 'module' => '/api/modules/'.$graded->getId()->toRfc4122(), 'program' => $programIri]);
        self::assertResponseStatusCodeSame(422, 'Cours déjà validé : verrouillé');
    }
}
