<?php

namespace App\Tests\Api;

use App\Entity\CodexTest as Codex;
use App\Entity\Patient;
use App\Enum\UserRole;

/**
 * Archivage d'un patient (sortie de la file active) et date de la décision d'éligibilité.
 */
final class PatientArchiveTest extends ApiTestCaseBase
{
    public function testCadreArchivesAndRestoresPatient(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $patient = $this->createPatient($center, $ide, 'Archive');
        $iri = $this->iri($patient);
        $names = fn (string $query = '') => array_column($this->requestAs($ide, 'GET', '/api/patients'.$query)->toArray(), 'lastName');

        $this->requestAs($ide, 'DELETE', $iri);
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($cadre, 'DELETE', $iri);
        self::assertResponseStatusCodeSame(204);
        self::assertNotContains('Archive', $names());
        self::assertContains('Archive', $names('?status=archived'));
        self::assertContains('Archive', $names('?status=all'));
        self::assertNotNull($this->requestAs($ide, 'GET', $iri)->toArray()['removedAt']);

        // Rien ne se crée ni ne se modifie pour un patient archivé
        $this->requestAs($ide, 'PATCH', $iri, ['firstName' => 'Paul']);
        self::assertResponseStatusCodeSame(422);
        $this->requestAs($ide, 'POST', '/api/codex_tests', [
            'patient' => $iri, 'words' => Codex::WORD_LISTS[0], 'clockTime' => '05:10',
            'clockChecks' => [true, true, true, true], 'wordRecallPassed' => true,
        ]);
        self::assertResponseStatusCodeSame(422);
        $this->requestAs($ide, 'POST', '/api/training_programs', ['patient' => $iri]);
        self::assertResponseStatusCodeSame(422);

        $this->requestAs($ide, 'POST', $iri.'/restore');
        self::assertResponseStatusCodeSame(403);
        $this->requestAs($this->createUser(UserRole::Cadre, [$this->createCenter('Autre')]), 'POST', $iri.'/restore');
        self::assertResponseStatusCodeSame(403);

        $this->requestAs($cadre, 'POST', $iri.'/restore');
        self::assertResponseStatusCodeSame(204);
        self::assertContains('Archive', $names());
        $this->requestAs($ide, 'PATCH', $iri, ['firstName' => 'Paul']);
        self::assertResponseIsSuccessful();
    }

    public function testEligibilityDecisionDateFollowsStatusChanges(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $iri = $this->iri($this->createPatient($center, $ide));

        self::assertNull($this->requestAs($ide, 'GET', $iri)->toArray()['eligibilityDecidedAt'] ?? null);

        $decided = $this->requestAs($ide, 'PATCH', $iri, ['eligibilityStatus' => 'eligible'])->toArray()['eligibilityDecidedAt'];
        self::assertNotNull($decided);
        self::assertEqualsWithDelta(time(), strtotime($decided), 60);

        // Une modification sans changement de statut conserve la date de la décision
        $patient = $this->em()->getRepository(Patient::class)->findOneBy(['lastName' => 'Patient']);
        $this->em()->getConnection()->executeStatement('UPDATE patient SET eligibility_decided_at = :date WHERE id = :id', ['date' => '2026-01-15 10:00:00+00', 'id' => $patient->getId()->toRfc4122()]);
        $kept = $this->requestAs($ide, 'PATCH', $iri, ['eligibilityStatus' => 'eligible', 'firstName' => 'Paul'])->toArray()['eligibilityDecidedAt'];
        self::assertStringStartsWith('2026-01-15', $kept);

        self::assertNull($this->requestAs($ide, 'PATCH', $iri, ['eligibilityStatus' => 'enregistre'])->toArray()['eligibilityDecidedAt'] ?? null);
    }
}
