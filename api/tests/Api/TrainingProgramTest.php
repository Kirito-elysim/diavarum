<?php

namespace App\Tests\Api;

use App\Entity\Module;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

final class TrainingProgramTest extends ApiTestCaseBase
{
    private function createModule(string $code, string $title, int $position, bool $mandatory, bool $published = true): Module
    {
        $module = (new Module())->setCode($code)->setTitle($title)->setPosition($position)->setMandatory($mandatory)->setPublished($published);
        $this->em()->persist($module);
        $this->em()->flush();

        return $module;
    }

    public function testNewProgramContainsPublishedCoursesWithMandatoryOnesPreselected(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $this->em()->flush();
        $this->createModule('S90', 'Systématique', 90, mandatory: true);
        $this->createModule('O90', 'Optionnel', 91, mandatory: false);
        $this->createModule('S91', 'Brouillon', 92, mandatory: true, published: false);

        $response = $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $this->iri($patient)]);

        self::assertResponseStatusCodeSame(201);
        $selection = array_column(
            array_map(static fn (array $m) => [$m['module']['code'], $m['selected']], $response->toArray()['modules']),
            1,
            0,
        );
        self::assertTrue($selection['S90'], 'Séance systématique pré-cochée');
        self::assertFalse($selection['O90'], 'Séance optionnelle à cocher par l\'IDE');
        self::assertArrayNotHasKey('S91', $selection, 'Séance non publiée absente du parcours');
    }

    public function testOfficialCatalogueGives26PreselectedAnd7OptionalSessions(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $this->em()->flush();

        $modules = $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $this->iri($patient)])->toArray()['modules'];

        // Démarrage + 24 séances systématiques + post-test pré-cochés, 7 séances optionnelles
        self::assertCount(33, $modules);
        self::assertCount(26, array_filter($modules, static fn (array $m) => $m['selected']));
        self::assertSame('S0', $modules[0]['module']['code']);
        self::assertSame('O7', $modules[31]['module']['code']);
        self::assertSame('PT', $modules[32]['module']['code']);
    }

    public function testNotEligiblePatientCannotGetAProgram(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);

        $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $this->iri($patient)]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testOneProgramPerPatient(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $this->em()->flush();

        $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $this->iri($patient)]);
        self::assertResponseStatusCodeSame(201);

        $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $this->iri($patient)]);
        self::assertResponseStatusCodeSame(422);
    }
}
