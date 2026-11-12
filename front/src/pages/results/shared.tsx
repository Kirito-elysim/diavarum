import { Card, CardContent } from '../../components/ui/card';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { TableCell, TableHead } from '../../components/ui/table';
import { delta, signed, tone, type Better } from '../../lib/compare';

export const ORANGE = '#E86825';
export const DIAVERUM_GREEN = '#004138';

export function Kpi({ icon, bg, label, value, hint }: { icon: React.ReactNode; bg: string; label: string; value: string; hint?: string }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const PILL = { good: 'bg-green-50 text-green-700 ring-green-200', bad: 'bg-red-50 text-red-700 ring-red-200', neutral: 'bg-gray-100 text-gray-600 ring-gray-200' } as const;

interface CompareProps {
  a: number | null | undefined;
  b: number | null | undefined;
  /** Mise en forme d'une valeur (A ou B) */
  format?: (value: number) => string;
  /** Mise en forme de l'écart A − B */
  formatDiff?: (value: number) => string;
  better?: Better;
}

/** Écart A − B en pastille : ▲ ▼ colorés (vert favorable, rouge défavorable, gris sans sens) avec la variation en % de B */
export function DeltaPill({ a, b, formatDiff = signed, better = 'up' }: Pick<CompareProps, 'a' | 'b' | 'formatDiff' | 'better'>) {
  const d = delta(a, b);
  if (d.diff == null) return <span className="text-xs text-gray-400" data-testid="delta-pill">—</span>;
  const Icon = d.diff > 0 ? ArrowUp : d.diff < 0 ? ArrowDown : Minus;

  return (
    <span data-testid="delta-pill" className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ${PILL[tone(d.diff, better)]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {d.diff === 0 ? 'Stable' : formatDiff(d.diff)}
      {d.percent != null && d.diff !== 0 && <span className="font-medium opacity-80">· {signed(d.percent)} %</span>}
    </span>
  );
}

/** Indicateur en comparaison : A en grand, B à côté, écart en pastille */
export function CompareKpi({ icon, bg, label, hint, ...values }: { icon: React.ReactNode; bg: string; label: string; hint?: string } & CompareProps) {
  const { a, b, format = (n: number) => `${n}` } = values;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-orange-200">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
          <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
        </div>
        <ValuePair a={a} b={b} format={format} large />
        <DeltaPill {...values} />
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Valeur de la période A (orange) et de la période B (gris), côte à côte */
export function ValuePair({ a, b, format = (n) => `${n}`, large = false }: Pick<CompareProps, 'a' | 'b' | 'format'> & { large?: boolean }) {
  const size = large ? 'text-2xl' : 'text-lg';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600">Période A</p>
        <p className={`${size} font-bold tabular-nums text-gray-900`} data-testid="compare-a">{a == null ? '—' : format(a)}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Période B</p>
        <p className={`${size} font-semibold tabular-nums text-gray-400`} data-testid="compare-b">{b == null ? '—' : format(b)}</p>
      </div>
    </div>
  );
}

/** Cellules « B » et « Écart » d'un tableau en comparaison (la cellule A est la cellule habituelle) */
export function BAndDeltaCells({ show, ...values }: { show: boolean } & CompareProps) {
  if (!show) return null;
  const { b, format = (n: number) => `${n}` } = values;

  return (
    <>
      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap text-gray-400 bg-gray-50/60" data-testid="compare-b">{b == null ? '—' : format(b)}</TableCell>
      <TableCell className="text-right bg-gray-50/60"><DeltaPill {...values} /></TableCell>
    </>
  );
}

/** En-têtes « B » et « Écart » à ajouter après un en-tête de colonne en comparaison */
export function BAndDeltaHeads({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <>
      <TableHead className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">B</TableHead>
      <TableHead className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">Écart</TableHead>
    </>
  );
}
