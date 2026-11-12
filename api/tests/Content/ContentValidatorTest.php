<?php

namespace App\Tests\Content;

use App\Training\ContentValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ContentValidatorTest extends TestCase
{
    public static function malformedBlocks(): iterable
    {
        yield 'reorder scalar' => [['type' => 'reorder', 'items' => 'invalid']];
        yield 'missing carousel' => [['type' => 'carousel']];
        yield 'empty flip cards' => [['type' => 'flip-cards', 'cards' => []]];
        yield 'invalid category' => [['type' => 'categorize', 'categories' => [[]], 'items' => [['id' => 'a', 'label' => 'A', 'category' => 'B']]]];
        yield 'invalid quiz type' => [['type' => 'quiz', 'questionType' => 'unknown']];
        yield 'missing text' => [['type' => 'text']];
        yield 'duplicate items' => [['type' => 'reorder', 'items' => [['id' => 'a', 'label' => 'A'], ['id' => 'a', 'label' => 'B']]]];
        yield 'unpaired memory' => [['type' => 'memory', 'cards' => [['id' => 'a', 'pairId' => 'pair', 'content' => 'A']]]];
        yield 'missing blank answer' => [['type' => 'fill-blank', 'text' => '___ et ___', 'answers' => ['A']]];
    }

    #[DataProvider('malformedBlocks')]
    public function testMalformedBlockIsRejectedWithoutThrowing(array $block): void
    {
        self::assertNotEmpty((new ContentValidator())->validate([
            ['id' => 'page', 'title' => 'Écran', 'blocks' => [['id' => 'block'] + $block]],
        ]));
    }
}
