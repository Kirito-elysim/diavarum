import { Users } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import type { Statistics } from '../../api/types';
import { formatDuration } from '../../lib/format';
import { EmptyState, ScoreBar, SortableHead } from '../../components/ListParts';
import { useSort } from './useSort';
import { asMinutes, asPercent, asPoints } from '../../lib/compare';
import { BAndDeltaCells, BAndDeltaHeads } from './shared';

type Nurse = Statistics['nurses'][number];

const ACCESSORS = {
  name: (n: Nurse) => n.name,
  sessions: (n: Nurse) => n.validatedSessions,
  patients: (n: Nurse) => n.patients,
  score: (n: Nurse) => n.averageScore,
  time: (n: Nurse) => n.totalDurationSeconds,
};

/** Activité des IDE sur la période : séances validées, patients accompagnés, score moyen, temps passé */
export function NursesTab({ nurses, compare }: { nurses: Nurse[]; compare?: Nurse[] }) {
  const other = new Map((compare ?? []).map((n) => [n.name, n]));
  const { sorted, sort, toggle } = useSort(nurses, ACCESSORS, { key: 'sessions', desc: true });

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
      {nurses.length === 0 ? <EmptyState icon={<Users className="w-8 h-8" />}>Aucune IDE sur ce périmètre</EmptyState> : (
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              <SortableHead label="IDE" column="name" sort={sort} onSort={toggle} />
              <SortableHead label={compare ? 'Séances validées (A)' : 'Séances validées'} column="sessions" sort={sort} onSort={toggle} align="right" />
              <BAndDeltaHeads show={!!compare} />
              <SortableHead label={compare ? 'Patients (A)' : 'Patients'} column="patients" sort={sort} onSort={toggle} align="right" />
              <BAndDeltaHeads show={!!compare} />
              <SortableHead label={compare ? 'Score moyen (A)' : 'Score moyen'} column="score" sort={sort} onSort={toggle} align="right" />
              <BAndDeltaHeads show={!!compare} />
              <SortableHead label={compare ? 'Temps de séance (A)' : 'Temps de séance'} column="time" sort={sort} onSort={toggle} align="right" />
              <BAndDeltaHeads show={!!compare} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((n) => (
              <TableRow key={n.name} className="border-gray-100">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                      {n.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{n.name}</p>
                      <p className="text-xs text-gray-400">{n.centers}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{n.validatedSessions}</TableCell>
                <BAndDeltaCells show={!!compare} a={n.validatedSessions} b={other.get(n.name)?.validatedSessions ?? 0} />
                <TableCell className="text-right text-sm tabular-nums">{n.patients}</TableCell>
                <BAndDeltaCells show={!!compare} a={n.patients} b={other.get(n.name)?.patients ?? 0} />
                <TableCell className="text-right text-sm"><ScoreBar score={n.averageScore} /></TableCell>
                <BAndDeltaCells show={!!compare} a={n.averageScore} b={other.get(n.name)?.averageScore} format={asPercent} formatDiff={asPoints} />
                <TableCell className="text-right text-sm text-gray-600 tabular-nums">{formatDuration(n.totalDurationSeconds)}</TableCell>
                <BAndDeltaCells show={!!compare} a={n.totalDurationSeconds} b={other.get(n.name)?.totalDurationSeconds ?? 0} format={formatDuration} formatDiff={asMinutes} better="neutral" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
