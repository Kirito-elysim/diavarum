import type { ContentBlock, ModulePage } from '../types';

/**
 * Nombre de réponses attendues pour un exercice noté ; null pour un bloc non noté.
 * Miroir de App\Training\ScoreCalculator::expectedAnswers() côté API, qui reste seul juge :
 * il recalcule le score et refuse tout total qui ne correspond pas au contenu du cours.
 */
export function expectedAnswers(block: ContentBlock): number | null {
  switch (block.type) {
    case 'quiz':
      if (block.graded === false) return null;
      if (block.questionType === 'qcm') return (block.options ?? []).filter((o) => o.isCorrect).length;
      if (block.questionType === 'drag-drop') return (block.pairs ?? []).length;
      return 1;
    case 'reorder':
      return block.items.length;
    case 'tap-sequence':
      return block.steps.length;
    case 'fill-blank':
      return block.answers.length;
    case 'true-false':
      return block.statements.length;
    case 'categorize':
    case 'sort-bin':
      return block.items.length;
    default:
      return null;
  }
}

export interface ExerciseResult {
  blockId: string;
  correct: number;
  total: number;
}

/**
 * Résultats des exercices notés à transmettre à la validation de la séance.
 * Les exercices renvoient un pourcentage de réponses justes : on retrouve le nombre de bonnes
 * réponses (conversion exacte tant que le total reste inférieur à 100).
 */
export function exerciseResults(pages: ModulePage[], scores: Record<string, { score: number }>): ExerciseResult[] {
  const results: ExerciseResult[] = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const total = expectedAnswers(block);
      const answer = scores[block.id];
      if (!total || !answer) continue;
      results.push({ blockId: block.id, total, correct: Math.min(total, Math.max(0, Math.round((answer.score * total) / 100))) });
    }
  }

  return results;
}
