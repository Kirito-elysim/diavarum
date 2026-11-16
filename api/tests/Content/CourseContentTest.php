<?php

namespace App\Tests\Content;

use App\Entity\Module;
use App\Training\ContentValidator;
use App\Training\ScoreCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Contenus de cours versionnés dans api/content/ : ils doivent rester importables et correctement notés.
 */
final class CourseContentTest extends TestCase
{
    /**
     * @return iterable<string, array{string}>
     */
    public static function courseFiles(): iterable
    {
        foreach (glob(\dirname(__DIR__, 2).'/content/*.json') as $file) {
            yield basename($file) => [$file];
        }
    }

    #[DataProvider('courseFiles')]
    public function testCourseFileIsValid(string $file): void
    {
        $course = json_decode((string) file_get_contents($file), true, flags: \JSON_THROW_ON_ERROR);

        self::assertMatchesRegularExpression('/^(S\d{1,2}|O\d{1,2}|PT)$/', $course['code']);
        self::assertSame([], (new ContentValidator())->validate($course['content']));
        self::assertLessThanOrEqual(Module::MAX_COMPETENCIES, \count($course['competencies']));
    }

    public function testSessionOneScoring(): void
    {
        $course = json_decode((string) file_get_contents(\dirname(__DIR__, 2).'/content/S1.json'), true, flags: \JSON_THROW_ON_ERROR);
        $module = (new Module())->setContent($course['content']);

        $evaluated = (new ScoreCalculator())->evaluatedBlocks($module);

        // 4 questions du quiz final (version retouchée dans l'éditeur le 16 novembre 2026) : Q3 (3 bonnes réponses), Q4 (2), Q5 (1), Q6 (3)
        self::assertSame(['s1-q3' => 3, 's1-q4' => 2, 's1-q5' => 1, 's1-q6' => 3], $evaluated);
        self::assertArrayNotHasKey('s1-pc-designee', $evaluated, '« Avez-vous désigné quelqu’un ? » n’est pas noté');
        self::assertCount(2, $course['competencies']);
    }
}
