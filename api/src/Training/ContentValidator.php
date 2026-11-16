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
        'connect-dots', 'word-search', 'yes-no-path', 'carousel', 'image-text', 'picto-grid',
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
            if ([] === $page['blocks']) {
                $errors[] = "$where : ajoutez au moins une activité.";
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
                // Refuser les structures qui feraient planter le lecteur ou le calcul du score.
                $structureErrors = $this->validateStructure($block);
                if ([] !== $structureErrors) {
                    foreach ($structureErrors as $error) $errors[] = "$at : $error";
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
                if ('picto-grid' === $block['type']) {
                    if (isset($block['layout']) && !\in_array($block['layout'], ['grid', 'stacked'], true)) {
                        $errors[] = "$at : disposition de pictogrammes inconnue.";
                    }
                    $items = $block['items'] ?? null;
                    if (!\is_array($items) || !array_is_list($items) || [] === $items) {
                        $errors[] = "$at : ajoutez au moins un picto.";
                    } else {
                        foreach ($items as $item) {
                            foreach (['id', 'imageUrl', 'text'] as $field) {
                                if (!\is_array($item) || !\is_string($item[$field] ?? null) || '' === trim($item[$field])) {
                                    $errors[] = "$at : complétez chaque picto et son texte.";
                                    break;
                                }
                            }
                        }
                    }
                    if (isset($block['columns']) && !\in_array($block['columns'], [2, 3], true)) {
                        $errors[] = "$at : choisissez deux ou trois colonnes.";
                    }
                }
                if ('categorize' === $block['type']) {
                    $zones = $block['categories'] ?? null;
                    if (!\is_array($zones) || [] === $zones || \count(array_unique($zones)) !== \count($zones)) {
                        $errors[] = "$at : zones de destination manquantes ou en double.";
                    } elseif (array_filter($block['items'] ?? [], static fn ($item) => !\in_array($item['category'] ?? null, $zones, true))) {
                        $errors[] = "$at : chaque élément doit être rattaché à une zone de destination existante.";
                    }
                }
                if (0 === ScoreCalculator::expectedAnswers($block)) {
                    $errors[] = "$at : exercice sans aucune bonne réponse attendue.";
                }
            }
        }

        return $errors;
    }
    /** @return list<string> */
    private function validateStructure(array $block): array
    {
        $errors = [];
        $type = $block['type'];
        $lists = match ($type) {
            'quiz' => ['drag-drop' === ($block['questionType'] ?? null) ? 'pairs' : 'options'],
            'timeline', 'reorder', 'sort-bin', 'picto-grid' => ['items'],
            'categorize' => ['categories', 'items'],
            'memory', 'flip-cards' => ['cards'],
            'tap-sequence', 'scenario', 'yes-no-path' => ['steps'],
            'hotspot' => ['hotspots'], 'reveal-legends' => ['points'],
            'pull-timeline' => ['events'], 'connect-dots' => ['dots'],
            'word-search' => ['words'], 'carousel' => ['slides'],
            'true-false' => ['statements'], 'fill-blank' => ['answers'],
            default => [],
        };
        if ('quiz' === $type && !\in_array($block['questionType'] ?? null, ['qcu', 'qcm', 'drag-drop'], true)) {
            $errors[] = 'type de question inconnu.';
        }
        foreach ($lists as $field) {
            $items = $block[$field] ?? null;
            if (!\is_array($items) || !array_is_list($items) || [] === $items) {
                $errors[] = "$field doit être une liste non vide.";
                continue;
            }
            $ids = [];
            foreach ($items as $item) {
                if (\in_array($field, ['categories', 'answers'], true)) {
                    if (!\is_string($item) || '' === trim($item)) $errors[] = "$field contient un texte invalide.";
                    continue;
                }
                if (!\is_array($item) || !\is_string($item['id'] ?? null) || '' === trim($item['id'])) {
                    $errors[] = "$field contient un élément sans identifiant.";
                    continue;
                }
                if (isset($ids[$item['id']])) $errors[] = "$field contient un identifiant en double.";
                $ids[$item['id']] = true;
                $texts = match ($type) {
                    'quiz' => 'drag-drop' === $block['questionType'] ? ['left', 'right'] : ['label'],
                    'reorder', 'tap-sequence', 'sort-bin' => ['label'],
                    'categorize' => ['label', 'category'], 'picto-grid' => ['imageUrl', 'text'],
                    'flip-cards' => ['front', 'back'], 'memory' => ['pairId', 'content'],
                    'carousel' => ['imageUrl'], 'true-false' => ['statement'],
                    'hotspot' => ['label'], 'reveal-legends' => ['label'],
                    default => [],
                };
                foreach ($texts as $text) {
                    if (!\is_string($item[$text] ?? null) || '' === trim($item[$text])) $errors[] = "$field : $text manquant ou invalide.";
                }
            }
        }
        $texts = match ($type) {
            'text', 'info-card' => ['content'], 'image' => ['url'],
            'image-text' => ['imageUrl', 'content'],
            'hotspot', 'reveal-legends', 'connect-dots' => ['imageUrl'],
            'iframe' => ['url', 'title'], 'fill-blank' => ['text'],
            default => [],
        };
        foreach ($texts as $field) {
            if (!\is_string($block[$field] ?? null) || '' === trim($block[$field])) $errors[] = "$field manquant ou invalide.";
        }
        if ([] === $errors && 'fill-blank' === $type && substr_count($block['text'], '___') !== \count($block['answers'])) {
            $errors[] = 'chaque trou doit avoir exactement une réponse.';
        }
        if ([] === $errors && 'memory' === $type) {
            foreach (array_count_values(array_column($block['cards'], 'pairId')) as $count) {
                if (2 !== $count) { $errors[] = 'chaque paire doit contenir exactement deux cartes.'; break; }
            }
        }
        return $errors;
    }

}
