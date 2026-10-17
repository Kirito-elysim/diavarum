import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, Search } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ListPagination } from './ListPagination';
import { PeriodPicker } from './PeriodPicker';
import { SearchableSelect } from './SearchableSelect';
import { EmptyState, HEAD, ScoreBar, SortableHead } from './ListParts';
import { useAuth } from '../contexts/AuthContext';
import { useCenters, useSessionList, useSessionSummary, useUsers, type ListSort } from '../api/hooks';
import type { SessionStatus } from '../api/types';
import { formatDate, formatDuration } from '../lib/format';
import { presetPeriod, type Period, type PeriodPreset } from '../lib/period';
import { useDebounced } from '../lib/useDebounced';

const SESSION_STATUS: Record<SessionStatus, { label: string; cls: string }> = {
  en_cours: { label: 'Non terminée', cls: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  validee: { label: 'Validée', cls: 'bg-green-100 text-green-700 hover:bg-green-100' },
  interrompue: { label: 'Interrompue', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
};

const PAGE_SIZE = 25;

/**
 * Séances paginées côté serveur, filtrables (recherche, centre, statut, IDE, période) et triables.
 * Une IDE peut se limiter à ses propres séances ; un cadre ou un administrateur choisit l'IDE.
 */
export function SessionsTable({ status: fixedStatus }: { status?: SessionStatus } = {}) {
  const navigate = useNavigate();
  const { user, isCadre } = useAuth();
  const { data: centers } = useCenters();
  const { data: users } = useUsers(isCadre);

  const [search, setSearch] = useState('');
  const [center, setCenter] = useState('all');
  const [status, setStatus] = useState<string>(fixedStatus ?? 'all');
  const [nurse, setNurse] = useState('all');
  const [mine, setMine] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>('all');
  const [custom, setCustom] = useState<Period>({ from: null, to: null });
  const [sort, setSort] = useState<ListSort>({ key: 'date', desc: true });
  const [page, setPage] = useState(1);

  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const debouncedSearch = useDebounced(search.trim());
  const filters = {
    search: debouncedSearch,
    center: center === 'all' ? undefined : `/api/centers/${center}`,
    status: status === 'all' ? undefined : status,
    nurse: mine && user ? `/api/users/${user.id}` : nurse === 'all' ? undefined : `/api/users/${nurse}`,
    from: period.from,
    to: period.to,
  };
  const filterKey = JSON.stringify(filters);
  useEffect(() => setPage(1), [filterKey]);

  const { data, isLoading, isFetching } = useSessionList(filters, sort, page, PAGE_SIZE);
  const { data: summary } = useSessionSummary(filters);
  const sessions = data?.member ?? [];
  const total = data?.totalItems ?? 0;
  const nurses = (users?.member ?? []).filter((u) => u.role === 'ide');
  const toggleSort = (key: string) => setSort((current) => ({ key, desc: current.key === key ? !current.desc : key === 'date' }));

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input aria-label="Rechercher une séance" placeholder="Patient ou séance…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 border-gray-100" />
            </div>
            {(centers?.member.length ?? 0) > 1 && (
              <SearchableSelect
                aria-label="Filtrer par centre"
                className="w-52"
                value={center}
                onChange={setCenter}
                placeholder="Tous les centres"
                searchPlaceholder="Rechercher un centre…"
                emptyText="Aucun centre trouvé"
                options={[{ value: 'all', label: 'Tous les centres' }, ...(centers?.member ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.city }))]}
              />
            )}
            {!fixedStatus && (
              <SearchableSelect
                aria-label="Filtrer par statut"
                className="w-44"
                value={status}
                onChange={setStatus}
                placeholder="Tous les statuts"
                options={[{ value: 'all', label: 'Tous les statuts' }, ...Object.entries(SESSION_STATUS).map(([value, { label }]) => ({ value, label }))]}
              />
            )}
            {isCadre ? (
              <SearchableSelect
                aria-label="Filtrer par IDE"
                className="w-52"
                value={nurse}
                onChange={setNurse}
                placeholder="Toutes les IDE"
                searchPlaceholder="Rechercher une IDE…"
                emptyText="Aucune IDE trouvée"
                options={[{ value: 'all', label: 'Toutes les IDE' }, ...nurses.map((n) => ({ value: n.id, label: `${n.lastName.toUpperCase()} ${n.firstName}` }))]}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Switch id="my-sessions" checked={mine} onCheckedChange={setMine} />
                <Label htmlFor="my-sessions" className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">Mes séances</Label>
              </div>
            )}
            <PeriodPicker className="w-56" preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /><strong className="text-gray-900">{summary?.count ?? '…'}</strong> séance{(summary?.count ?? 0) > 1 ? 's' : ''}</span>
            <span>Score moyen : <strong className="text-gray-900">{summary?.averageScore != null ? `${summary.averageScore} %` : '—'}</strong></span>
            <span>Durée moyenne : <strong className="text-gray-900">{formatDuration(summary?.averageDurationSeconds)}</strong></span>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : sessions.length === 0 ? <EmptyState icon={<Activity className="w-8 h-8" />}>Aucune séance ne correspond à ces filtres</EmptyState> : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                    <SortableHead label="Date" column="date" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Patient" column="patient" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Séance" column="course" sort={sort} onSort={toggleSort} />
                    <SortableHead label="IDE" column="nurse" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Durée" column="duration" sort={sort} onSort={toggleSort} align="right" />
                    <SortableHead label="Score" column="score" sort={sort} onSort={toggleSort} align="right" />
                    {!fixedStatus && <TableHead className={HEAD}>Statut</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className={isFetching ? 'opacity-60 transition-opacity' : ''}>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="border-gray-100 hover:bg-orange-50/30 cursor-pointer" onClick={() => navigate(`/patients/${session.patient.id}`)}>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatDate(session.startedAt, "d MMM yyyy 'à' HH:mm")}</TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900 whitespace-nowrap">{session.patient.lastName.toUpperCase()} {session.patient.firstName}</p>
                        <p className="text-xs text-gray-400">{session.patient.center?.name}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        <Badge variant="secondary" className="mr-2 bg-gray-100 text-gray-700">{session.module.code}</Badge>
                        {session.module.title}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{session.nurse.firstName} {session.nurse.lastName}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600 tabular-nums">{formatDuration(session.durationSeconds)}</TableCell>
                      <TableCell className="text-right text-sm"><ScoreBar score={session.score} /></TableCell>
                      {!fixedStatus && <TableCell><Badge variant="secondary" className={`text-xs ${SESSION_STATUS[session.status].cls}`}>{SESSION_STATUS[session.status].label}</Badge></TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > PAGE_SIZE && <ListPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />}
            </>
          )}
      </Card>
    </div>
  );
}
