import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import type { AreaStatistics, Share } from '../../api/types';
import { ScoreBar, SortableHead } from '../../components/ListParts';
import { useSort } from './useSort';
import { asPercent, asPoints } from '../../lib/compare';
import { BAndDeltaCells, BAndDeltaHeads } from './shared';

const ACCESSORS = {
  center: (a: AreaStatistics) => a.center,
  registered: (a: AreaStatistics) => a.patients.registered,
  eligible: (a: AreaStatistics) => a.patients.eligible.count,
  notEligible: (a: AreaStatistics) => a.patients.notEligible.count,
  pending: (a: AreaStatistics) => a.patients.pending.count,
  active: (a: AreaStatistics) => a.programs.active.count,
  inactive: (a: AreaStatistics) => a.programs.inactive.count,
  completed: (a: AreaStatistics) => a.programs.completed.count,
  interrupted: (a: AreaStatistics) => a.programs.interrupted.count,
  sessions: (a: AreaStatistics) => a.activity.validatedSessions,
  score: (a: AreaStatistics) => a.activity.averageSessionScore,
};

/** Comparaison des centres : effectifs à date et activité de la période ; total (ou national) en dernière ligne */
export function CentersTab({ centers, total, compare }: { centers: AreaStatistics[]; total: AreaStatistics; compare?: { centers: AreaStatistics[]; total: AreaStatistics } }) {
  const other = new Map((compare?.centers ?? []).map((c) => [c.center, c]));
  const { sorted, sort, toggle } = useSort(centers, ACCESSORS, { key: 'center' });
  const head = (label: string, column: keyof typeof ACCESSORS, align: 'left' | 'right' = 'right') => <SortableHead label={label} column={column} sort={sort} onSort={toggle} align={align} />;

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              {head('Centre', 'center', 'left')}
              {head('Patients', 'registered')}
              {head('Éligibles', 'eligible')}
              {head('Non éligibles', 'notEligible')}
              {head('À statuer', 'pending')}
              {head('Parcours en cours', 'active')}
              {head('Inactifs (15 j)', 'inactive')}
              {head('Achevés', 'completed')}
              {head('Clôturés', 'interrupted')}
              {head(compare ? 'Séances (A)' : 'Séances (période)', 'sessions')}
              <BAndDeltaHeads show={!!compare} />
              {head(compare ? 'Score (A)' : 'Score (période)', 'score')}
              <BAndDeltaHeads show={!!compare} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...sorted, total].map((area, i, all) => {
              const isTotal = i === all.length - 1;
              const b = isTotal ? compare?.total : other.get(area.center);
              return (
                <TableRow key={`${area.center}-${i}`} className={isTotal ? 'bg-green-50/60 font-semibold hover:bg-green-50/60' : 'border-gray-100'}>
                  <TableCell className="text-sm whitespace-nowrap">{area.center}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{area.patients.registered}</TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.patients.eligible} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.patients.notEligible} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.patients.pending} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.programs.active} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.programs.inactive} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.programs.completed} /></TableCell>
                  <TableCell className="text-right text-sm"><ShareCell share={area.programs.interrupted} /></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{area.activity.validatedSessions}</TableCell>
                  <BAndDeltaCells show={!!compare} a={area.activity.validatedSessions} b={b?.activity.validatedSessions ?? 0} />
                  <TableCell className="text-right text-sm"><ScoreBar score={area.activity.averageSessionScore} /></TableCell>
                  <BAndDeltaCells show={!!compare} a={area.activity.averageSessionScore} b={b?.activity.averageSessionScore} format={asPercent} formatDiff={asPoints} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-gray-400">Patients non archivés et leurs parcours : effectifs à date. Séances et score : activité de la période choisie{compare ? ' (A), avec la période comparée (B) et l’écart A − B' : ''}.</p>
    </div>
  );
}

function ShareCell({ share }: { share: Share }) {
  return (
    <span className="tabular-nums">
      {share.count}
      {share.percent != null && <span className="text-gray-400 font-normal ml-1">({Math.round(share.percent)} %)</span>}
    </span>
  );
}
