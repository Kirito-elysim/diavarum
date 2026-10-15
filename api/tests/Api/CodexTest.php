<?php

namespace App\Tests\Api;

use App\Entity\CodexTest as Result;
use App\Enum\UserRole;
use PHPUnit\Framework\Attributes\DataProvider;

final class CodexTest extends ApiTestCaseBase
{
    public function testDrawReturnsFixedWords(): void
    {
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        self::assertSame(Result::WORD_LISTS[0], $this->requestAs($ide, 'GET', '/api/codex/draw')->toArray()['words']);
    }

    public static function scoringCases(): iterable
    {
        yield 'both passed' => [[true, true, true, true], true, null, true];
        foreach ([0, 1, 2, 3, 4, 5] as $score) {
            $answers = array_merge(array_fill(0, $score, 1), array_fill(0, 5 - $score, 0));
            yield 'recall failed '.$score => [[true, true, true, true], false, $answers, $score >= 4];
            yield 'clock failed '.$score => [[true, false, true, true], true, $answers, $score >= 4];
            yield 'both failed '.$score => [[false, false, false, false], false, $answers, $score >= 4];
        }
        foreach (range(0, 3) as $index) {
            $checks = [true, true, true, true];
            $checks[$index] = false;
            yield 'criterion '.$index => [$checks, true, [0, 0, 0, 0, 0], false];
        }
    }

    #[DataProvider('scoringCases')]
    public function testScoringAndEligibility(array $checks, bool $recall, ?array $answers, bool $passed): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);
        $response = $this->requestAs($ide, 'POST', '/api/codex_tests', [
            'patient' => $this->iri($patient), 'words' => Result::WORD_LISTS[0], 'clockTime' => '05:10',
            'clockChecks' => $checks, 'clockTestPassed' => true, 'wordRecallPassed' => $recall, 'orientationAnswers' => $answers,
        ]);
        self::assertResponseStatusCodeSame(201);
        $result = $response->toArray();
        self::assertSame($passed, $result['passed']);
        self::assertSame(!in_array(false, $checks, true), $result['clockTestPassed']);
        self::assertSame($answers === null ? null : array_sum($answers), $result['orientationScore'] ?? null);
        self::assertSame(!$passed, $result['nephrologistReviewRequired']);
        self::assertSame($ide->getId()->toRfc4122(), $result['nurse']['id']);
        $savedPatient = $this->requestAs($ide, 'GET', $this->iri($patient))->toArray();
        self::assertSame($passed ? 'enregistre' : 'non_eligible', $savedPatient['eligibilityStatus']);
        if (!$passed) {
            self::assertNotEmpty($savedPatient['eligibilityReasons']);
            $this->requestAs($ide, 'PATCH', $this->iri($patient), ['eligibilityStatus' => 'eligible', 'eligibilityReasons' => []]);
            self::assertResponseStatusCodeSame(422);
        }
    }

    public static function invalidCases(): iterable
    {
        yield 'random words' => [['words' => ['Pomme', 'Clé', 'Fleur']]];
        yield 'random time' => [['clockTime' => '10:10']];
        yield 'missing checks' => [['clockChecks' => null]];
        yield 'incomplete checks' => [['clockChecks' => [true, true, true]]];
        yield 'non boolean checks' => [['clockChecks' => [true, true, true, 1]]];
        yield 'missing orientation' => [['wordRecallPassed' => false]];
        yield 'incomplete orientation' => [['wordRecallPassed' => false, 'orientationAnswers' => [1, 1, 1, 1]]];
        yield 'invalid score' => [['wordRecallPassed' => false, 'orientationAnswers' => [1, 1, 1, 1, 2]]];
        yield 'unnecessary orientation' => [['orientationAnswers' => [1, 1, 1, 1, 1]]];
    }

    #[DataProvider('invalidCases')]
    public function testInvalidProtocolIsRejected(array $overrides): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);
        $this->requestAs($ide, 'POST', '/api/codex_tests', array_replace([
            'patient' => $this->iri($patient), 'words' => Result::WORD_LISTS[0], 'clockTime' => '05:10',
            'clockChecks' => [true, true, true, true], 'wordRecallPassed' => true,
        ], $overrides));
        self::assertResponseStatusCodeSame(422);
    }

    public function testSecondListIsAccepted(): void
    {
        $center = $this->createCenter();
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide);
        $this->requestAs($ide, 'POST', '/api/codex_tests', [
            'patient' => $this->iri($patient), 'words' => Result::WORD_LISTS[1], 'clockTime' => '05:10',
            'clockChecks' => [true, true, true, true], 'wordRecallPassed' => true,
        ]);
        self::assertResponseStatusCodeSame(201);
    }

    public function testLegacyResultsKeepTheirInterpretation(): void
    {
        $legacy = (new Result())->setClockTestPassed(true)->setWordRecallPassed(false);
        self::assertFalse($legacy->isPassed());
        self::assertFalse($legacy->isNephrologistReviewRequired());
        self::assertNull($legacy->getClockChecks());
        $legacy->setWordRecallPassed(true);
        self::assertTrue($legacy->isPassed());
    }
}
