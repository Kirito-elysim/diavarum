import {
  Activity, AlertTriangle, Apple, Bed, BookOpen, CircleAlert, Clock, Droplet, Footprints, Hand, Heart, HeartPulse,
  Info, Lightbulb, Pill, ShieldCheck, Star, Stethoscope, Syringe, Target, Thermometer, Utensils, type LucideIcon,
} from 'lucide-react';
import type { ContentBlock, InfoCardBlock, InfoCardVariant, ModulePage } from '../types';

/** Consignes de l'encadré au doigt, utilisées tant que l'auteur ne les a pas personnalisées */
export const DEFAULT_INSTRUCTIONS = {
  flipCards: 'Touchez une carte pour répondre à la question.',
  connect: 'Faites glisser les définitions sur les concepts correspondants',
  categorize: 'Faites glisser chaque élément dans la bonne zone',
} as const;

/** Encadrés de la charte Adobe XD du 27 octobre 2026. */
export const INFO_CARD_CATEGORIES: { value: InfoCardVariant; label: string; icon: LucideIcon; iconUrl: string; bg: string; border: string; iconBg: string; title: string; body: string }[] = [
  { value: 'important', label: 'Important', icon: CircleAlert },
  { value: 'definition', label: 'Définition', icon: BookOpen },
  { value: 'objective', label: 'Objectif', icon: Target },
  { value: 'funfact', label: 'Fun fact', icon: Lightbulb },
  { value: 'warning', label: 'Alerte', icon: AlertTriangle },
].map(category => ({ ...category, value: category.value as InfoCardVariant, iconUrl: `/pictos/${category.value}.png`, bg: 'transparent', border: '#1C5335', iconBg: 'transparent', title: 'text-[#004138]', body: 'text-[#004138]' }));

/**
 * Icône + consigne affichées dans le bandeau de l'écran. Le picto est toujours le point d'interrogation
 * de la charte (confirmé sur quiz et cartes interactives dans le XD) ; seule la consigne varie selon le
 * premier bloc interactif de la page.
 */
/** Types de blocs dont la page affiche le picto « ? » dans son bandeau : QCU/QCM, relier, glisser-déposer, remettre dans l'ordre, grille de pictos, cartes à retourner, image à légendes */
const ICON_BLOCKS: string[] = ['quiz', 'categorize', 'reorder', 'picto-grid', 'flip-cards', 'hotspot'];

export function pageHeaderMeta(page: ModulePage): { icon: boolean; instruction?: string } {
  const icon = page.blocks.some(block => ICON_BLOCKS.includes(block.type));
  if (page.instruction?.trim()) return { icon, instruction: page.instruction };
  for (const block of page.blocks) {
    switch (block.type) {
      case 'quiz':
        if (block.questionType === 'qcu' || block.questionType === 'qcm') {
          return { icon, instruction: 'Touchez la ou les réponses qui vous paraissent exactes.' };
        }
        return { icon, instruction: 'Associez chaque élément à son origine.' };
      case 'true-false':
        return { icon, instruction: 'Indiquez si chaque affirmation est vraie ou fausse.' };
      case 'carousel':
        return { icon, instruction: 'Faites défiler les images avec les textes associés.' };
      case 'flip-cards':
        return { icon, instruction: block.instruction?.trim() || DEFAULT_INSTRUCTIONS.flipCards };
      case 'reveal-legends':
        return { icon, instruction: 'Touchez chaque point pour révéler sa légende.' };
      case 'hotspot':
        return { icon, instruction: 'Touchez chaque repère pour en savoir plus.' };
      case 'reorder': case 'tap-sequence': case 'categorize': case 'sort-bin':
      case 'connect-dots': case 'drawing': case 'scenario': case 'fill-blank':
      case 'memory': case 'slider': case 'word-search': case 'yes-no-path': case 'pull-timeline':
        return { icon, instruction: page.instruction };
    }
  }
  return { icon, instruction: page.instruction };
}

/** Anciennes présentations des encadrés, rattachées aux nouvelles catégories */
export function infoCardCategory(variant: InfoCardBlock['variant']) {
  const value: InfoCardVariant = variant === 'info' || variant === 'success' ? 'important' : variant === 'tip' ? 'funfact' : variant;
  return INFO_CARD_CATEGORIES.find(c => c.value === value) ?? INFO_CARD_CATEGORIES[0];
}

/** Pictos proposés pour les repères des images à légendes */
export const PICTOS: Record<string, { label: string; icon: LucideIcon }> = {
  heart: { label: 'Cœur', icon: Heart },
  'heart-pulse': { label: 'Pouls', icon: HeartPulse },
  droplet: { label: 'Goutte', icon: Droplet },
  hand: { label: 'Main', icon: Hand },
  syringe: { label: 'Seringue', icon: Syringe },
  pill: { label: 'Médicament', icon: Pill },
  stethoscope: { label: 'Stéthoscope', icon: Stethoscope },
  thermometer: { label: 'Thermomètre', icon: Thermometer },
  activity: { label: 'Activité', icon: Activity },
  apple: { label: 'Alimentation', icon: Apple },
  utensils: { label: 'Repas', icon: Utensils },
  clock: { label: 'Horloge', icon: Clock },
  bed: { label: 'Repos', icon: Bed },
  footprints: { label: 'Marche', icon: Footprints },
  shield: { label: 'Protection', icon: ShieldCheck },
  alert: { label: 'Alerte', icon: AlertTriangle },
  info: { label: 'Information', icon: Info },
  star: { label: 'Étoile', icon: Star },
};

/** Taille d'un repère, en proportion de la largeur de l'image : `size` est exprimée pour une image de 720 px, de sorte que l'éditeur et la tablette donnent le même rendu */
export const markerWidth = (size = 48) => `${size / 720 * 100}%`;

/** Activité seule qui occupe toute la hauteur disponible. */
export function pageFills(blocks: ContentBlock[]): boolean {
  if (blocks.length !== 1) return false;
  const [block] = blocks;
  return (block.type === 'flip-cards' && !block.cardHeight)
    || (block.type === 'carousel' && block.imageHeight === 'large');
}

/** Page réduite à une image (ou un picto) accompagnée de son texte : l'activité est centrée au milieu de la page */
export const pageCenters = (blocks: { type: string }[]) => blocks.length === 1 && blocks[0].type === 'image-text';

/** Pages dont les blocs s'étirent sur toute la hauteur (cartes) ou se centrent (image + texte) : le conteneur doit être une colonne flex */
export const pageStretches = (blocks: ContentBlock[]) => pageFills(blocks) || pageCenters(blocks);
