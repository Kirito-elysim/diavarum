import { format, startOfMonth, startOfQuarter, startOfYear, subDays, subMonths } from 'date-fns';

export type PeriodPreset = '30d' | 'quarter' | 'year' | '12m' | 'all' | 'custom';

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '30d', label: '30 derniers jours' },
  { value: 'quarter', label: 'Trimestre en cours' },
  { value: 'year', label: 'Année en cours' },
  { value: '12m', label: '12 derniers mois' },
  { value: 'all', label: 'Toute l\'activité' },
  { value: 'custom', label: 'Dates personnalisées' },
];

export interface Period { from: string | null; to: string | null }

const day = (date: Date) => format(date, 'yyyy-MM-dd');

/** Bornes (AAAA-MM-JJ, incluses) d'une période prédéfinie, calculées à partir d'aujourd'hui */
export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, today = new Date()): Period {
  switch (preset) {
    case '30d': return { from: day(subDays(today, 29)), to: day(today) };
    case 'quarter': return { from: day(startOfQuarter(today)), to: day(today) };
    case 'year': return { from: day(startOfYear(today)), to: day(today) };
    case '12m': return { from: day(startOfMonth(subMonths(today, 11))), to: day(today) };
    case 'all': return { from: null, to: null };
  }
}
