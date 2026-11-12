import { differenceInCalendarDays, endOfMonth, endOfQuarter, endOfYear, format, startOfMonth, startOfQuarter, startOfYear, subDays, subMonths, subQuarters, subYears } from 'date-fns';

export type PeriodPreset = '30d' | 'month' | 'lastMonth' | 'quarter' | 'lastQuarter' | 'year' | 'lastYear' | '12m' | 'all' | 'custom';

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '30d', label: '30 derniers jours' },
  { value: 'month', label: 'Mois en cours' },
  { value: 'lastMonth', label: 'Mois précédent' },
  { value: 'quarter', label: 'Trimestre en cours' },
  { value: 'lastQuarter', label: 'Trimestre précédent' },
  { value: 'year', label: 'Année en cours' },
  { value: 'lastYear', label: 'Année précédente' },
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
    case 'month': return { from: day(startOfMonth(today)), to: day(today) };
    case 'lastMonth': { const last = subMonths(today, 1); return { from: day(startOfMonth(last)), to: day(endOfMonth(last)) }; }
    case 'quarter': return { from: day(startOfQuarter(today)), to: day(today) };
    case 'lastQuarter': { const last = subQuarters(today, 1); return { from: day(startOfQuarter(last)), to: day(endOfQuarter(last)) }; }
    case 'year': return { from: day(startOfYear(today)), to: day(today) };
    case 'lastYear': { const last = subYears(today, 1); return { from: day(startOfYear(last)), to: day(endOfYear(last)) }; }
    case '12m': return { from: day(startOfMonth(subMonths(today, 11))), to: day(today) };
    case 'all': return { from: null, to: null };
  }
}

/**
 * Période à comparer par défaut : un mois, un trimestre ou une année civile complets → le précédent ; sinon la période de
 * même durée qui précède immédiatement (30 jours → les 30 jours d'avant). Null si la période n'a pas de borne de début
 * (toute l'activité) : rien ne la précède.
 */
export function previousPeriod(period: Period, today = new Date()): Period | null {
  if (!period.from) return null;
  const from = new Date(`${period.from}T00:00:00`);
  const to = period.to ? new Date(`${period.to}T00:00:00`) : today;

  for (const [start, end, shift] of [[startOfMonth, endOfMonth, subMonths], [startOfQuarter, endOfQuarter, subQuarters], [startOfYear, endOfYear, subYears]] as const) {
    if (day(start(from)) === day(from) && day(end(from)) === day(to)) {
      const before = shift(from, 1);
      return { from: day(start(before)), to: day(end(before)) };
    }
  }

  const length = differenceInCalendarDays(to, from) + 1;
  const previousTo = subDays(from, 1);

  return { from: day(subDays(previousTo, length - 1)), to: day(previousTo) };
}
