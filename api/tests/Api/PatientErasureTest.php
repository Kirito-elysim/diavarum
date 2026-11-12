<?php

namespace App\Tests\Api;

use App\Entity\CodexTest;
use App\Entity\Module;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\UserRole;

/**
 * Suppression définitive d'un patient archivé (cahier des charges §3.4).
 */
final class PatientErasureTest extends ApiTestCaseBase
{
    private Patient $patient;
    private Patient $other;
    private User $cadre;
    private User $ide;
    private string $id;

    protected function setUp(): void
    {
        parent::setUp();
        $paris = $this->createCenter('Paris');
        $this->cadre = $this->createUser(UserRole::Cadre, [$paris]);
        $this->ide = $this->createUser(UserRole::Ide, [$paris]);
        $this->patient = $this->createPatient($paris, $this->cadre, 'Éloïse');
        $this->patient->setFirstName('Jean-Marc');
        $this->other = $this->createPatient($paris, $this->cadre, 'Gardé');
        $module = (new Module())->setCode('S97')->setTitle('Séance de test')->setPosition(97);
        $this->em()->persist($module);
        foreach ([$this->patient, $this->other] as $p) {
            $program = (new TrainingProgram())->setPatient($p);
            $program->setAuthor($this->cadre);
            $program->addModule($module)->markValidated(80, 600);
            $this->em()->persist($program);
            $session = (new TrainingSession())->setPatient($p)->setModule($module)->setProgram($program);
            $session->setAuthor($this->ide);
            $session->markValidated(600, 80, ['secret' => 'réponse']);
            $this->em()->persist($session);
            $codex = (new CodexTest())->setPatient($p)->setWords(['Clé', 'ballon', 'citron'])->setClockTime('10:10');
            $codex->setNotes('Note de santé');
            $codex->setAuthor($this->ide);
            $this->em()->persist($codex);
        }
        $this->patient->archive();
        $this->em()->flush();
        $this->id = $this->patient->getId()->toRfc4122();
    }

    private function rows(string $table, string $id): int
    {
        return (int) $this->em()->getConnection()->fetchOne("SELECT COUNT(*) FROM $table WHERE patient_id = :id", ['id' => $id]);
    }

    public function testOnlyCadreAndAdminOfTheCenterMayErase(): void
    {
        $this->requestAs($this->ide, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => 'Éloïse Jean-Marc']);
        self::assertResponseStatusCodeSame(403, 'IDE refusé');

        $elsewhere = $this->createUser(UserRole::Cadre, [$this->createCenter('Ailleurs')]);
        $this->requestAs($elsewhere, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => 'Éloïse Jean-Marc']);
        self::assertResponseStatusCodeSame(403, 'Cadre d\'un autre centre refusé');
        self::assertSame(1, $this->rows('training_session', $this->id), 'Rien n\'est effacé sur refus');
    }

    public function testPatientMustBeArchivedAndConfirmationMustMatch(): void
    {
        $active = $this->other;
        $this->requestAs($this->cadre, 'POST', '/api/patients/'.$active->getId()->toRfc4122().'/erase', ['confirmation' => 'Gardé Jean']);
        self::assertResponseStatusCodeSame(422, 'Patient non archivé');

        $this->requestAs($this->cadre, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => 'Éloïse']);
        self::assertResponseStatusCodeSame(422, 'Confirmation incomplète');
        $this->requestAs($this->cadre, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => ' ']);
        self::assertResponseStatusCodeSame(422, 'Confirmation vide');
        self::assertSame(1, $this->rows('codex_test', $this->id));
    }

    public function testErasureRemovesEverythingOfThePatientAndNothingElseAndLeavesAHealthDataFreeTrace(): void
    {
        $otherId = $this->other->getId()->toRfc4122();

        $this->requestAs($this->cadre, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => ' ELOISE  jean-marc ']);
        self::assertResponseStatusCodeSame(204);

        foreach (['training_session', 'training_program', 'codex_test'] as $table) {
            self::assertSame(0, $this->rows($table, $this->id), $table);
            self::assertSame(1, $this->rows($table, $otherId), "$table d'un autre patient conservé");
        }
        self::assertSame(0, (int) $this->em()->getConnection()->fetchOne('SELECT COUNT(*) FROM patient WHERE id = :id', ['id' => $this->id]));
        self::assertSame(0, (int) $this->em()->getConnection()->fetchOne('SELECT COUNT(*) FROM program_module pm LEFT JOIN training_program tp ON tp.id = pm.program_id WHERE tp.id IS NULL'));

        $log = $this->em()->getConnection()->fetchAssociative("SELECT action, resource_type, resource_id, detail FROM access_log WHERE path LIKE '%/erase' AND status_code = 204");
        self::assertSame(['delete', 'patient', $this->id], [$log['action'], $log['resource_type'], $log['resource_id']]);
        self::assertStringContainsString('1 parcours · 1 séances · 1 tests CODEX', $log['detail']);
        self::assertStringNotContainsStringIgnoringCase('Éloïse', $log['detail']);
        self::assertStringNotContainsStringIgnoringCase('Jean', $log['detail']);

        $this->requestAs($this->cadre, 'POST', "/api/patients/{$this->id}/erase", ['confirmation' => 'Éloïse Jean-Marc']);
        self::assertResponseStatusCodeSame(404, 'Déjà supprimé');
    }
}
