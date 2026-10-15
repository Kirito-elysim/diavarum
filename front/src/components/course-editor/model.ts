import type { ContentBlock, ModulePage } from '../../types';
import type { ModuleContent } from '../../api/types';

export const uid = () => crypto.randomUUID();
export const activities = [
  ['text', 'Texte'], ['image', 'Image'], ['info-card', 'Encadré'], ['carousel', 'Carrousel'],
  ['hotspot', 'Image à légendes'], ['flip-cards', 'Cartes à retourner'], ['qcu', 'QCU — une réponse'], ['qcm', 'QCM — plusieurs réponses'],
  ['drag-drop', 'Glisser-déposer'], ['reorder', 'Remettre dans l’ordre'],
] as const;
export type Activity = typeof activities[number][0];
export function newBlock(type: Activity): ContentBlock {
  const id = uid();
  switch (type) {
    case 'text': return { id, type, content: '' };
    case 'image': return { id, type, url: '', alt: '', caption: '' };
    case 'info-card': return { id, type, title: 'Important', content: '', variant: 'info' };
    case 'carousel': return { id, type, question: '', slides: [{ id: uid(), imageUrl: '', alt: '', text: '' }] };
    case 'hotspot': return { id, type, imageUrl: '', alt: '', hotspots: [] };
    case 'flip-cards': return { id, type, question: '', cards: [{ id: uid(), front: '', back: '' }] };
    case 'drag-drop': return { id, type: 'quiz', questionType: type, question: '', pairs: [0, 1].map(() => ({ id: uid(), left: '', right: '' })) };
    case 'reorder': return { id, type, question: '', items: [0, 1].map(() => ({ id: uid(), label: '' })) };
    default: return { id, type: 'quiz', questionType: type, question: '', graded: true, showCorrection: true, options: [0, 1].map(() => ({ id: uid(), label: '', isCorrect: false })) };
  }
}
export const newPage = (): ModulePage => ({ id: uid(), title: 'Nouvel écran', instruction: '', blocks: [] });
export const blockLabel = (block: ContentBlock) => activities.find(([type]) => type === (block.type === 'quiz' ? block.questionType : block.type))?.[1] ?? 'Activité complémentaire';
export function move<T>(items: T[], index: number, direction: number): T[] {
  if (index + direction < 0 || index + direction >= items.length) return items;
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}
export function validateCourse(course: ModuleContent): string[] {
  const errors: string[] = [];
  if (!course.title.trim()) errors.push('Renseignez le titre du cours.');
  if (course.estimatedDuration < 5 || course.estimatedDuration > 120) errors.push('La durée doit être comprise entre 5 et 120 minutes.');
  if (!course.content.length) errors.push('Ajoutez au moins un écran.');
  if (course.competencies.some(c => !c.trim())) errors.push('Complétez ou retirez les compétences vides.');
  course.content.forEach((page, index) => {
    const at = `Écran ${index + 1}`;
    if (!page.title.trim()) errors.push(`${at} : renseignez le titre.`);
    if (!page.blocks.length) errors.push(`${at} : ajoutez une activité.`);
    page.blocks.forEach((b, i) => {
      const name = `${at}, activité ${i + 1}`;
      const missing = (value: string | undefined, label: string) => { if (!value?.trim()) errors.push(`${name} : ${label}.`); };
      if (b.type === 'text' || b.type === 'info-card') missing(b.content, 'complétez le texte');
      if (b.type === 'reorder') {
        missing(b.question, 'complétez la consigne');
        if (b.items.length < 2) errors.push(`${name} : ajoutez au moins deux éléments à ordonner.`);
        b.items.forEach(item => missing(item.label, 'complétez chaque élément'));
      }
      if (b.type === 'quiz' && b.questionType === 'drag-drop') {
        missing(b.question, 'complétez la consigne');
        if ((b.pairs?.length ?? 0) < 2) errors.push(`${name} : ajoutez au moins deux associations.`);
        b.pairs?.forEach(pair => { missing(pair.left, 'complétez chaque destination'); missing(pair.right, 'complétez chaque élément à déplacer'); });
        const labels = b.pairs?.map(pair => pair.right.trim()) ?? [];
        if (new Set(labels).size !== labels.length) errors.push(`${name} : les éléments à déplacer doivent avoir des textes différents.`);
      }
      if (b.type === 'image') missing(b.url, 'ajoutez une image');
      if (b.type === 'carousel') {
        if (!b.slides.length) errors.push(`${name} : ajoutez une image au carrousel.`);
        b.slides.forEach(s => missing(s.imageUrl, 'une image du carrousel manque'));
      }
      if (b.type === 'flip-cards') {
        if (!b.cards.length) errors.push(`${name} : ajoutez une carte.`);
        b.cards.forEach(c => { missing(c.front, 'complétez le recto'); missing(c.back, 'complétez le verso'); });
      }
      if (b.type === 'hotspot') {
        missing(b.imageUrl, 'ajoutez une image');
        if (!b.hotspots.length) errors.push(`${name} : ajoutez une légende.`);
        b.hotspots.forEach(h => { missing(h.label, 'complétez le titre de la légende'); missing(h.description, 'complétez la légende'); });
      }
      if (b.type === 'quiz' && b.questionType !== 'drag-drop') {
        missing(b.question, 'complétez la question');
        if ((b.options?.length ?? 0) < 2) errors.push(`${name} : ajoutez au moins deux propositions.`);
        b.options?.forEach(o => missing(o.label, 'complétez chaque proposition'));
        if (b.graded !== false || (b.showCorrection ?? b.graded !== false)) {
          const correct = b.options?.filter(o => o.isCorrect).length ?? 0;
          if (correct === 0 || (b.questionType === 'qcu' && correct !== 1)) errors.push(`${name} : indiquez ${b.questionType === 'qcu' ? 'une seule bonne réponse' : 'au moins une bonne réponse'}.`);
        }
      }
    });
  });
  return errors;
}
