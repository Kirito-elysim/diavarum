<?php

namespace App\Training;

/**
 * Contrôle de structure d'un contenu de cours avant intégration (format du lecteur front) :
 * pages > blocs, identifiants uniques, types connus, exercices notés cohérents.
 */
final class ContentValidator
{
    /** Types de blocs gérés par le lecteur (front/src/types/index.ts) */
    public const BLOCK_TYPES = [
        'text', 'image', 'info-card', 'quiz', 'timeline', 'hotspot', 'iframe',
        'reorder', 'fill-blank', 'true-false', 'memory', 'slider', 'tap-sequence', 'flip-cards',
        'categorize', 'drawing', 'scenario', 'reveal-legends', 'pull-timeline', 'sort-bin',
        'connect-dots', 'word-search', 'yes-no-path', 'carousel',
    ];

    /**
     * @return list<string> erreurs (vide si le contenu est valide)
     */
    public function validate(mixed $content): array
    {
        if (!\is_array($content) || !array_is_list($content)) {
            return ['Le contenu doit être une liste de pages.'];
        }

        $errors = [];
        $pageIds = [];
        $blockIds = [];
        foreach ($content as $p => $page) {
            $where = \sprintf('Page %d', $p + 1);
            if (!\is_array($page) || !\is_string($page['id'] ?? null) || '' === $page['id']) {
                $errors[] = "$where : identifiant manquant.";
                continue;
            }
            if (isset($pageIds[$page['id']])) {
                $errors[] = "$where : identifiant « {$page['id']} » en double.";
            }
            $pageIds[$page['id']] = true;
            if (!\is_string($page['title'] ?? null) || '' === trim($page['title'])) {
                $errors[] = "$where : titre manquant.";
            }
            if (!\is_array($page['blocks'] ?? null) || !array_is_list($page['blocks'])) {
                $errors[] = "$where : liste de blocs manquante.";
                continue;
            }

            foreach ($page['blocks'] as $b => $block) {
                $at = \sprintf('%s, bloc %d', $where, $b + 1);
                if (!\is_array($block) || !\is_string($block['id'] ?? null) || '' === $block['id']) {
                    $errors[] = "$at : identifiant manquant.";
                    continue;
                }
                if (isset($blockIds[$block['id']])) {
                    $errors[] = "$at : identifiant « {$block['id']} » en double (les résultats d'exercices y font référence).";
                }
                $blockIds[$block['id']] = true;
                if (!\in_array($block['type'] ?? null, self::BLOCK_TYPES, true)) {
                    $errors[] = \sprintf('%s : type « %s » inconnu.', $at, \is_string($block['type'] ?? null) ? $block['type'] : '?');
                    continue;
                }
                if ('quiz' === $block['type'] && \in_array($block['questionType'] ?? '', ['qcu', 'qcm'], true)) {
                    foreach (['graded', 'showCorrection'] as $flag) {
                        if (isset($block[$flag]) && !\is_bool($block[$flag])) {
                            $errors[] = "$at : $flag doit être un booléen.";
                        }
                    }
                    $options = $block['options'] ?? [];
                    if (!\is_array($options) || !array_is_list($options)) {
                        $errors[] = "$at : propositions invalides.";
                        continue;
                    }
                    $correct = 0;
                    $ids = [];
                    $invalidOption = false;
                    foreach ($options as $option) {
                        if (!\is_array($option) || !\is_string($option['id'] ?? null) || !\is_string($option['label'] ?? null) || '' === trim($option['label']) || !\is_bool($option['isCorrect'] ?? null)) {
                            $errors[] = "$at : complétez chaque proposition et sa bonne réponse.";
                            $invalidOption = true;
                            continue;
                        }
                        if (isset($ids[$option['id']])) {
                            $errors[] = "$at : identifiant de proposition en double.";
                        }
                        $ids[$option['id']] = true;
                        $correct += $option['isCorrect'] ? 1 : 0;
                    }
                    $graded = $block['graded'] ?? true;
                    $correction = $block['showCorrection'] ?? $graded;
                    if (($graded || $correction) && (0 === $correct || ('qcu' === $block['questionType'] && 1 !== $correct))) {
                        $errors[] = "$at : indiquez les bonnes réponses (une seule pour un QCU).";
                    }
                    if ($invalidOption) {
                        continue;
                    }
                }
                if (0 === ScoreCalculator::expectedAnswers($block)) {
                    $errors[] = "$at : exercice sans aucune bonne réponse attendue.";
                }
            }
        }

        return $errors;
    }
}
