<?php

namespace App\Training;

use App\Entity\Module;
use App\Exception\WorkflowException;

/**
 * Score d'une séance (cahier des charges §4) : pourcentage de réponses justes sur l'ensemble des
 * exercices notés du cours. Les réponses fausses ne retirent aucun point.
 *
 * Le navigateur indique, pour chaque exercice, combien de réponses sont justes ; le serveur vérifie
 * que l'exercice existe dans le cours et que le nombre total de réponses correspond à son contenu.
 */
final class ScoreCalculator
{
    /**
     * Nombre de réponses attendues pour un exercice noté ; null pour les blocs non notés
     * (texte, image, cartes retournables, légendes… : interactivités d'apprentissage).
     */
    public static function expectedAnswers(array $block): ?int
    {
        return match ($block['type'] ?? null) {
            'quiz' => match ($block['questionType'] ?? 'qcu') {
                'qcm' => \count(array_filter($block['options'] ?? [], static fn (array $o) => $o['isCorrect'] ?? false)),
                'drag-drop' => \count($block['pairs'] ?? []),
                default => 1,
            },
            'reorder' => \count($block['items'] ?? []),
            'tap-sequence' => \count($block['steps'] ?? []),
            'fill-blank' => \count($block['answers'] ?? []),
            'true-false' => \count($block['statements'] ?? []),
            'categorize', 'sort-bin' => \count($block['items'] ?? []),
            default => null,
        };
    }

    /**
     * @return array<string, int> identifiant de bloc => nombre de réponses attendues
     */
    public function evaluatedBlocks(Module $module): array
    {
        $blocks = [];
        foreach ($module->getContent() as $page) {
            foreach ($page['blocks'] ?? [] as $block) {
                $expected = self::expectedAnswers($block);
                if (null !== $expected && $expected > 0 && isset($block['id'])) {
                    $blocks[$block['id']] = $expected;
                }
            }
        }

        return $blocks;
    }

    /**
     * @param list<array{blockId: string, correct: int, total: int}> $answers
     *
     * @return int|null score en %, null si le cours ne comporte aucun exercice noté
     */
    public function score(Module $module, array $answers): ?int
    {
        $expected = $this->evaluatedBlocks($module);
        if ([] === $expected) {
            return null;
        }

        $correct = [];
        foreach ($answers as $answer) {
            $blockId = $answer['blockId'];
            if (!isset($expected[$blockId])) {
                throw new WorkflowException(\sprintf('L\'exercice « %s » n\'existe pas dans ce cours.', $blockId));
            }
            if (isset($correct[$blockId])) {
                throw new WorkflowException(\sprintf('Réponse en double pour l\'exercice « %s ».', $blockId));
            }
            if ($answer['total'] !== $expected[$blockId] || $answer['correct'] < 0 || $answer['correct'] > $answer['total']) {
                throw new WorkflowException(\sprintf('Réponse incohérente pour l\'exercice « %s ».', $blockId));
            }
            $correct[$blockId] = $answer['correct'];
        }

        // Un exercice sans réponse compte pour zéro bonne réponse
        return (int) round(100 * array_sum($correct) / array_sum($expected));
    }
}
