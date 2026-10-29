import {
  Activity, AlertTriangle, Apple, Bed, BookOpen, CircleAlert, Clock, Droplet, Footprints, Hand, HelpCircle, Heart, HeartPulse,
  Info, Lightbulb, Pill, ShieldCheck, Star, Stethoscope, Syringe, Target, Thermometer, Utensils, type LucideIcon,
} from 'lucide-react';
import type { InfoCardBlock, InfoCardVariant, ModulePage } from '../types';

/** Consignes de l'encadré au doigt, utilisées tant que l'auteur ne les a pas personnalisées */
export const DEFAULT_INSTRUCTIONS = {
  flipCards: 'Touchez une carte pour la retourner',
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
].map(category => ({ ...category, value: category.value as InfoCardVariant, iconUrl: `/pictos/${category.value}.png`, bg: '#FAFAFA', border: 'transparent', iconBg: 'transparent', title: 'text-[#004138]', body: 'text-[#004138]' }));

/**
 * Icône + consigne affichées dans le bandeau de l'écran. Le picto est toujours le point d'interrogation
 * de la charte (confirmé sur quiz et cartes interactives dans le XD) ; seule la consigne varie selon le
 * premier bloc interactif de la page.
 */
export function pageHeaderMeta(page: ModulePage): { icon: LucideIcon; instruction?: string } {
  if (page.instruction?.trim()) return { icon: HelpCircle, instruction: page.instruction };
  for (const block of page.blocks) {
    switch (block.type) {
      case 'quiz':
        if (block.questionType === 'qcu') return { icon: HelpCircle, instruction: 'Choisissez la réponse qui vous paraît exacte.' };
        if (block.questionType === 'qcm') return { icon: HelpCircle, instruction: 'Choisissez toutes les réponses qui vous paraissent exactes.' };
        return { icon: HelpCircle, instruction: 'Associez chaque élément à son origine.' };
      case 'true-false':
        return { icon: HelpCircle, instruction: 'Indiquez si chaque affirmation est vraie ou fausse.' };
      case 'carousel':
        return { icon: HelpCircle, instruction: 'Faites défiler les images avec les textes associés.' };
      case 'flip-cards':
        return { icon: HelpCircle, instruction: 'Touchez une carte pour la retourner.' };
      case 'reveal-legends':
        return { icon: HelpCircle, instruction: 'Touchez chaque point pour révéler sa légende.' };
      case 'hotspot':
        return { icon: HelpCircle, instruction: 'Touchez chaque repère pour en savoir plus.' };
      case 'reorder': case 'tap-sequence': case 'categorize': case 'sort-bin':
      case 'connect-dots': case 'drawing': case 'scenario': case 'fill-blank':
      case 'memory': case 'slider': case 'word-search': case 'yes-no-path': case 'pull-timeline':
        return { icon: HelpCircle, instruction: page.instruction };
    }
  }
  return { icon: HelpCircle, instruction: page.instruction };
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
