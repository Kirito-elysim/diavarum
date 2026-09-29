<?php

namespace App\Tests\Api;

use App\Entity\CodexWord;
use App\Enum\UserRole;

/**
 * Test CODEX (cahier des charges §4) : 3 mots tirés au sort parmi 20, horloge, rappel des mots.
 */
final class CodexTest extends ApiTestCaseBase
{
    public function testDrawReturnsThreeDistinctWordsFromThePioche(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $pioche = array_map(static fn (CodexWord $w) => $w->getWord(), $this->em()->getRepository(CodexWord::class)->findAll());

        $words = $this->requestAs($ide, 'GET', '/api/codex/draw')->toArray()['words'];

        self::assertCount(20, $pioche);
        self::assertCount(3, array_unique($words));
        self::assertSame([], array_diff($words, $pioche));
    }

    public function testResultIsRecordedWithBothTests(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);

        $result = $this->requestAs($ide, 'POST', '/api/codex_tests', [
            'patient' => $this->iri($patient),
            'words' => ['Pomme', 'Clé', 'Fleur'],
            'clockTime' => '10:10',
            'clockTestPassed' => true,
            'wordRecallPassed' => false,
        ]);

        self::assertResponseStatusCodeSame(201);
        $test = $result->toArray();
        self::assertFalse($test['passed'], 'Réussite globale = horloge ET rappel des mots');
        self::assertSame($ide->getId()->toRfc4122(), $test['nurse']['id']);
    }

    public function testWordsMustComeFromThePioche(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);

        $this->requestAs($ide, 'POST', '/api/codex_tests', [
            'patient' => $this->iri($patient),
            'words' => ['Pomme', 'Pomme', 'Inventé'],
            'clockTime' => '10:10',
            'clockTestPassed' => true,
            'wordRecallPassed' => true,
        ]);

        self::assertResponseStatusCodeSame(422);
    }
}
