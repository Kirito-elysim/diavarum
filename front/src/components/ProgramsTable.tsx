import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Route, Search } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ListPagination } from './ListPagination';
import { SearchableSelect } from './SearchableSelect';
import { EmptyState, HEAD, ProgressBar, ScoreBar, SortableHead } from './ListParts';
import { useCenters, useInterruptionReasons, useProgramList, useProgramSummary, type ListSort } from '../api/hooks';
import { PROGRAM_STATUS_LABELS, type ProgramStatus } from '../api/types';
import { cn } from '../lib/utils';
import { formatDate, programBadge } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

const PAGE_SIZE = 25;

/** Libellés des parcours tels qu'affichés dans les listes (« Clôturé » = interrompu par l'équipe) */
const PROGRAM_LIST_LABELS: Record<ProgramStatus, string> = { ...PROGRAM_STATUS_LABELS, interrompu: 'Clôturé' };
const STATUS_ORDER: ProgramStatus[] = ['actif', 'non_actif', 'acheve', 'interrompu'];

/**
 * Parcours paginés côté serveur : pastilles de statut avec leurs effectifs, recherche, centre, tri.
 * `centerId` fixe le centre (Résultats filtrés sur un centre) et masque le choix du centre.
 */
export function ProgramsTable({ centerId }: { centerId?: string | null } = {}) {
  const navigate = useNavigate();
  const { data: centers } = useCenters();
  const { data: reasons } = useInterruptionReasons();
  const [search, setSearch] = useState('');
  const [center, setCenter] = useState('all');
  const [status, setStatus] = useState<'all' | ProgramStatus>('all');
  const [sort, setSort] = useState<ListSort>({ key: 'created', desc: true });
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search.trim());
  const selectedCenter = centerId ?? (center === 'all' ? null : center);
  const filters = { search: debouncedSearch, center: selectedCenter ? `/api/centers/${selectedCenter}` : undefined };
  const listFilters = { ...filters, status: status === 'all' ? undefined : status };
  const filterKey = JSON.stringify(listFilters);
  useEffect(() => setPage(1), [filterKey]);

  const { data, isLoading, isFetching } = useProgramList(listFilters, sort, page, PAGE_SIZE);
  const { data: summary } = useProgramSummary(filters);
  const programs = data?.member ?? [];
  const total = data?.totalItems ?? 0;
  const reasonLabel = useMemo(() => {
    const labels = new Map((reasons?.member ?? []).map((r) => [r['@id'], r.label]));
    return (iri: string) => labels.get(iri) ?? '';
  }, [reasons]);
  const toggleSort = (key: string) => setSort((current) => ({ key, desc: current.key === key ? !current.desc : key === 'created' || key === 'start' }));

  const chips: { value: 'all' | ProgramStatus; label: string; count?: number }[] = [
    { value: 'all', label: 'Tous', count: summary?.total },
    ...STATUS_ORDER.map((s) => ({ value: s, label: PROGRAM_LIST_LABELS[s], count: summary?.byStatus[s] })),
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Statut des parcours" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            role="tab"
            aria-selected={status === chip.value}
            onClick={() => setStatus(chip.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors',
              status === chip.value ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-gray-700 ring-gray-200 hover:bg-orange-50',
            )}
          >
            {chip.label}
            <span className={cn('rounded-full px-1.5 text-xs tabular-nums', status === chip.value ? 'bg-white/25' : 'bg-gray-100 text-gray-600')}>{chip.count ?? '…'}</span>
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input aria-label="Rechercher un patient" placeholder="Rechercher un patient…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 border-gray-100" />
          </div>
          {!centerId && (centers?.member.length ?? 0) > 1 && (
            <SearchableSelect
              aria-label="Filtrer par centre"
              className="w-56"
              value={center}
              onChange={setCenter}
              placeholder="Tous les centres"
              searchPlaceholder="Rechercher un centre…"
              emptyText="Aucun centre trouvé"
              options={[{ value: 'all', label: 'Tous les centres' }, ...(centers?.member ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.city }))]}
            />
          )}
          <span className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}{total} parcours
          </span>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          : programs.length === 0 ? (
            <EmptyState icon={<Route className="w-8 h-8" />}>
              {summary?.total === 0 && !debouncedSearch ? 'Aucun parcours : un parcours se crée depuis la fiche d\'un patient éligible.' : 'Aucun parcours ne correspond à ces filtres'}
            </EmptyState>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                    <SortableHead label="Patient" column="patient" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Statut" column="status" sort={sort} onSort={toggleSort} />
                    <TableHead className={HEAD}>Progression</TableHead>
                    <TableHead className={cn(HEAD, 'text-right')}>Score moyen</TableHead>
                    <SortableHead label="Début" column="start" sort={sort} onSort={toggleSort} />
                    <TableHead className={HEAD}>Où en est-il ?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={isFetching ? 'opacity-60 transition-opacity' : ''}>
                  {programs.map((program) => {
                    const next = program.nextModule;
                    return (
                      <TableRow key={program.id} className="border-gray-100 hover:bg-orange-50/30 cursor-pointer" onClick={() => navigate(`/patients/${program.patient.id}`)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-semibold flex-shrink-0">{program.patient.firstName[0]}{program.patient.lastName[0]}</div>
                            <div>
                              <p className="font-medium text-gray-900 whitespace-nowrap">{program.patient.lastName.toUpperCase()} {program.patient.firstName}</p>
                              <p className="text-xs text-gray-400">{program.patient.center?.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className={`text-xs ${programBadge[program.status]}`}>{PROGRAM_LIST_LABELS[program.status]}</Badge></TableCell>
                        <TableCell><ProgressBar value={program.validatedCount} total={program.selectedCount} /></TableCell>
                        <TableCell className="text-right text-sm"><ScoreBar score={program.averageScore} /></TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">{program.startedAt ? formatDate(program.startedAt) : <span className="text-gray-400">Non démarré</span>}</TableCell>
                        <TableCell className="text-sm text-gray-700 max-w-sm">
                          {program.status === 'acheve' && <>Achevé le {formatDate(program.completedAt)}</>}
                          {program.status === 'interrompu' && (
                            <>
                              Clôturé le {formatDate(program.interruptedAt)} : {program.interruptionReasons.map(reasonLabel).filter(Boolean).join(', ') || 'motif non précisé'}
                              {program.interruptionNotes && <p className="text-xs text-gray-400 italic truncate" title={program.interruptionNotes}>« {program.interruptionNotes} »</p>}
                            </>
                          )}
                          {(program.status === 'actif' || program.status === 'non_actif') && (
                            <>
                              {next ? <span className="line-clamp-1" title={next.title}>Prochaine : <strong>{next.code}</strong> {next.title}</span> : <span className="text-gray-400">Toutes les séances sont validées</span>}
                              {program.lastValidatedAt && <p className="text-xs text-gray-400">Dernière séance le {formatDate(program.lastValidatedAt)}</p>}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {total > PAGE_SIZE && <ListPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />}
            </>
          )}
      </Card>
    </div>
  );
}
