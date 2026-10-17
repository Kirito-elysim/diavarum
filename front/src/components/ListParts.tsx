import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from './ui/table';
import { cn } from '../lib/utils';

/** Briques communes des listes (Résultats, Séances, Parcours) */

export const HEAD = 'text-xs font-semibold text-gray-500 uppercase tracking-wider';

/** Score coloré avec mini-barre : rouge < 60 %, orange < 80 %, vert au-delà */
export function ScoreBar({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-gray-400">—</span>;
  const color = score < 60 ? 'bg-red-500' : score < 80 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <span className="inline-flex items-center gap-2 justify-end">
      <span className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className={`block h-full ${color}`} style={{ width: `${score}%` }} /></span>
      <span className="w-10 text-right font-semibold tabular-nums">{score}%</span>
    </span>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = total ? Math.min(100, Math.round((100 * value) / total)) : 0;
  return (
    <div className="flex items-center gap-2 min-w-36">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${percent}%` }} /></div>
      <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">{value}/{total}</span>
    </div>
  );
}

export function SortableHead<K extends string>({ label, column, sort, onSort, align = 'left' }: {
  label: string; column: K; sort: { key: K; desc?: boolean }; onSort: (key: K) => void; align?: 'left' | 'right';
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
  return (
    <TableHead className={cn(HEAD, align === 'right' && 'text-right')} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" onClick={() => onSort(column)} className={cn('inline-flex items-center gap-1 hover:text-gray-900 uppercase', align === 'right' && 'flex-row-reverse', active && 'text-gray-900')}>
        {label}<Icon className={cn('w-3 h-3', !active && 'opacity-40')} />
      </button>
    </TableHead>
  );
}

export function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400">
      <span className="opacity-40">{icon}</span>
      {children}
    </div>
  );
}
