/** Écart entre la période A (principale) et la période B (comparée) : A − B, et en % de B */
export interface Delta { diff: number | null; percent: number | null }

export function delta(a: number | null | undefined, b: number | null | undefined): Delta {
  if (a == null || b == null) return { diff: null, percent: null };
  const diff = a - b;

  return { diff, percent: b === 0 ? null : Math.round((100 * diff) / Math.abs(b)) };
}

/** Sens favorable d'un indicateur : « up » = plus c'est haut mieux c'est ; « neutral » = ni bon ni mauvais */
export type Better = 'up' | 'neutral';

export function tone(diff: number | null, better: Better): 'good' | 'bad' | 'neutral' {
  if (diff == null || diff === 0 || better === 'neutral') return 'neutral';

  return diff > 0 ? 'good' : 'bad';
}

export const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;

export const asPercent = (value: number) => `${value} %`;
export const asPoints = (value: number) => `${signed(value)} pts`;
export const asMinutes = (seconds: number) => `${signed(Math.round(seconds / 60))} min`;
