import {
  Activity, AlertTriangle, Apple, Bed, BookOpen, CircleAlert, Clock, Droplet, Footprints, Hand, Heart, HeartPulse,
  Info, Lightbulb, Pill, ShieldCheck, Star, Stethoscope, Syringe, Target, Thermometer, Utensils, type LucideIcon,
} from 'lucide-react';
import type { InfoCardBlock, InfoCardVariant } from '../types';

/** Consignes de l'encadré au doigt, utilisées tant que l'auteur ne les a pas personnalisées */
export const DEFAULT_INSTRUCTIONS = {
  flipCards: 'Touchez une carte pour la retourner',
  connect: 'Faites glisser les définitions sur les concepts correspondants',
  categorize: 'Faites glisser chaque élément dans la bonne zone',
} as const;

/**
 * Catégories d'encadré (recette du 18/10/2026). Pictos provisoires en attendant ceux de la charte :
 * il suffira de remplacer « icon » ici.
 */
export const INFO_CARD_CATEGORIES: { value: InfoCardVariant; label: string; icon: LucideIcon; bg: string; border: string; title: string; body: string }[] = [
  { value: 'important', label: 'Important', icon: CircleAlert, bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.35)', title: 'text-orange-300', body: 'text-orange-100/85' },
  { value: 'definition', label: 'Définition', icon: BookOpen, bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', title: 'text-sky-300', body: 'text-sky-100/85' },
  { value: 'objective', label: 'Objectif', icon: Target, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', title: 'text-emerald-300', body: 'text-emerald-100/85' },
  { value: 'funfact', label: 'Fun fact', icon: Lightbulb, bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', title: 'text-violet-300', body: 'text-violet-100/85' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.30)', title: 'text-red-300', body: 'text-red-100/85' },
];

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
