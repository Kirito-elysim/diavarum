import type { ContentBlock, ModulePage } from '../../types';
import { newBlock, uid, type Activity } from './model';

type Composition = 'below' | 'above' | 'text-below' | 'both' | 'plain';
export interface CourseTemplate { id: string; name: string; activity: Activity; composition: Composition; count?: number; thumbnail: string; layout?: 'stacked'; groups?: 2 }
const rows: [string, Activity, Composition, number | undefined, string][] = [
  ['Carrousel + box dessous', 'carousel', 'below', undefined, 'da6a83eeed31b776'],
  ['Image légendée + box dessous', 'hotspot', 'below', undefined, '8343a50b2e59b08d'],
  ['4 cartes + box dessous', 'flip-cards', 'below', 4, '7721a917424d929c'],
  ['6 cartes + box dessous', 'flip-cards', 'below', 6, '29e41213847ea3a6'],
  ['Image + texte + box dessous', 'image-text', 'below', undefined, '38604914637a4f51'],
  ['6 pictos + box dessous', 'picto-grid', 'below', 6, 'd48a1c99d5f45ad6'],
  ['4 pictos + box dessous', 'picto-grid', 'below', 4, 'cb8960186891cde4'],
  ['QCU / QCM · 2 propositions', 'qcu', 'plain', 2, '90fd46e370990266'],
  ['Glisser-déposer · 6 éléments', 'categorize', 'plain', 6, 'e1d4194d41ff57d5'],
  ['Remettre les étiquettes dans l’ordre', 'reorder', 'plain', 5, '20363a972d6dc0cc'],
  ['Carrousel + box au-dessus', 'carousel', 'above', undefined, '2178660a8cef7c3d'],
  ['Image légendée + box au-dessus', 'hotspot', 'above', undefined, '685f59d96f590859'],
  ['4 cartes + box au-dessus', 'flip-cards', 'above', 4, '75b5534e6c19a555'],
  ['6 cartes + box au-dessus', 'flip-cards', 'above', 6, '3dd051704dfd184e'],
  ['Image + texte + box au-dessus', 'image-text', 'above', undefined, '4190898185ce22f1'],
  ['6 pictos + box au-dessus', 'picto-grid', 'above', 6, '14538b68c922a2c3'],
  ['5 pictos + box dessous', 'picto-grid', 'below', 5, '75028527f97d01f2'],
  ['QCU / QCM · 3 propositions', 'qcu', 'plain', 3, 'ba32030b38895883'],
  ['Glisser-déposer · 8 éléments', 'categorize', 'plain', 8, 'ae56e61cb5327629'],
  ['Remise en ordre · étiquette active', 'reorder', 'plain', 5, '5cd59708c7d1fe16'],
  ['Carrousel + texte libre + box dessous', 'carousel', 'text-below', undefined, 'efb9959e77c8d8be'],
  ['QCU / QCM · 4 propositions', 'qcu', 'plain', 4, '3cbbcd323e23c122'],
  ['4 cartes + texte libre + box dessous', 'flip-cards', 'text-below', 4, '9982801ed4fc2e72'],
  ['6 cartes + texte libre + box dessous', 'flip-cards', 'text-below', 6, '952377b6ea4f7a1c'],
  ['Image + texte + boxes au-dessus et dessous', 'image-text', 'both', undefined, '15022f8bb0700b3d'],
  ['6 pictos + texte libre + box dessous', 'picto-grid', 'text-below', 6, '445d6ccf10a0c36f'],
  ['Image légendée + texte libre + box dessous', 'hotspot', 'text-below', undefined, 'ae414960b02d28b5'],
  ['QCU / QCM · 5 propositions', 'qcu', 'plain', 5, '4f38993c0c1601d0'],
  ['Carrousel + boxes au-dessus et dessous', 'carousel', 'both', undefined, '6eb88de9c25305ba'],
  ['4 cartes + boxes au-dessus et dessous', 'flip-cards', 'both', 4, '75c64d1e134cf053'],
  ['6 cartes + boxes au-dessus et dessous', 'flip-cards', 'both', 6, '05dd8448c5298017'],
  ['6 pictos + boxes au-dessus et dessous', 'picto-grid', 'both', 6, 'cf3b565f94e4856c'],
  ['Carrousel illustré + boxes + légende', 'carousel', 'both', undefined, '34cf73e51f9fda22'],
  ['QCU / QCM · 6 propositions', 'qcu', 'plain', 6, '22ef62e1cad936d4'],
  ['Carrousel illustré · objectif et fun fact', 'carousel', 'both', undefined, '69b6dde0160f0c72'],
];
export const courseTemplates: CourseTemplate[] = rows.map(([name, activity, composition, count, asset], index) => ({ id: `xd-${index + 1}`, name, activity, composition, count, thumbnail: `/course-templates/${asset}.png` }));
// IDs of the original models stay stable when the revised XD order changes.
courseTemplates.splice(7, 0, { id: 'xd-36', name: '6 pictos empilés + boxes au-dessus et dessous', activity: 'picto-grid', composition: 'both', count: 6, layout: 'stacked', thumbnail: '/course-templates/pictos-empiles.svg' });
courseTemplates.splice(courseTemplates.length - 1, 0, { id: 'xd-37', name: 'Deux groupes de cartes + texte au-dessus', activity: 'flip-cards', composition: 'text-below', count: 2, groups: 2, thumbnail: '/course-templates/deux-groupes-cartes.svg' });
const revisedOrder = [1,2,3,4,5,6,7,36,8,9,10,12,13,14,15,16,17,18,19,20,11,22,23,24,25,26,27,21,28,30,31,32,29,33,34,37,35].map(n => `xd-${n}`);
courseTemplates.sort((a, b) => revisedOrder.indexOf(a.id) - revisedOrder.indexOf(b.id));
export function pageFromTemplate(template: CourseTemplate): ModulePage {
  const block = newBlock(template.activity);
  const count = template.count ?? 4;
  if (block.type === 'image-text') block.size = 'image';
  if (block.type === 'flip-cards') { block.columns = count === 6 ? 3 : 2; block.cards = Array.from({ length: count }, () => ({ id: uid(), front: '', back: '' })); }
  if (block.type === 'picto-grid') { if (template.layout) block.layout = template.layout; block.columns = count === 4 ? 2 : 3; block.items = Array.from({ length: count }, () => ({ id: uid(), imageUrl: '', alt: '', text: '' })); }
  if (block.type === 'quiz') block.options = Array.from({ length: count }, () => ({ id: uid(), label: '', isCorrect: false }));
  if (block.type === 'reorder') block.items = Array.from({ length: count }, () => ({ id: uid(), label: '' }));
  if (block.type === 'categorize') { block.categories = ['Zone 1', 'Zone 2']; block.items = Array.from({ length: count }, (_, index) => ({ id: uid(), label: '', category: block.categories[index % 2] })); }
  const blocks: ContentBlock[] = [];
  if (template.composition === 'text-below') blocks.push(newBlock('text'));
  if (template.composition === 'above' || template.composition === 'both') blocks.push({ id: uid(), type: 'info-card', title: '', content: '', variant: ['xd-25', 'xd-32', 'xd-36'].includes(template.id) ? 'definition' : template.composition === 'both' ? 'objective' : 'important' });
  blocks.push(block);
  if (template.groups === 2 && block.type === 'flip-cards') {
    blocks.push({ ...block, id: uid(), cards: block.cards.map(card => ({ ...card, id: uid() })) });
  }
  if (!template.groups && template.composition !== 'above' && template.composition !== 'plain') blocks.push({ id: uid(), type: 'info-card', title: '', content: '', variant: ['xd-33', 'xd-35'].includes(template.id) ? 'funfact' : 'important' });
  return { id: uid(), title: template.name, instruction: '', blocks };
}
