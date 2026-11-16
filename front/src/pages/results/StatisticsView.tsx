import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Activity, BarChart2, GitCompareArrows, ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Route, Trophy, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { CenterMultiSelect } from '../../components/CenterMultiSelect';
import { useAuth } from '../../contexts/AuthContext';
import { statisticsQuery, useCenters, useStatistics } from '../../api/hooks';
import { ApiError, downloadFile } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { presetPeriod, previousPeriod, type Period, type PeriodPreset } from '../../lib/period';
import { PeriodPicker } from '../../components/PeriodPicker';
import { asPercent, asPoints } from '../../lib/compare';
import { CompareKpi, Kpi } from './shared';
import { OverviewTab } from './OverviewTab';
import { ProgramsTable } from '../../components/ProgramsTable';
import { CoursesTab } from './CoursesTab';
import { CentersTab } from './CentersTab';
import { NursesTab } from './NursesTab';

const TABS = [
  { value: 'apercu', label: 'Vue d\'ensemble' },
  { value: 'parcours', label: 'Parcours' },
  { value: 'seances', label: 'Séances' },
  { value: 'centres', label: 'Centres' },
  { value: 'ide', label: 'IDE' },
] as const;

/** Cadre / administrateur : synthèse statistique (cahier des charges §3) filtrable par centre et par période */
export function StatisticsView() {
  const { isAdmin } = useAuth();
  const { data: centers } = useCenters();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('onglet')) ? params.get('onglet')! : 'apercu';
  const [centerFilter, setCenterFilter] = useState<string[]>([]);
  const [preset, setPreset] = useState<PeriodPreset>('12m');
  const [custom, setCustom] = useState<Period>({ from: null, to: null });

  const period = preset === 'custom' ? custom : presetPeriod(preset);

  // Comparaison : période B choisie comme la période A (prédéfinie ou dates libres) ; A − B affiché sous chaque valeur
  const [comparing, setComparing] = useState(false);
  const [presetB, setPresetB] = useState<PeriodPreset>('lastMonth');
  const [customB, setCustomB] = useState<Period>({ from: null, to: null });
  const periodB = presetB === 'custom' ? customB : presetPeriod(presetB);
  const startComparing = () => {
    const previous = previousPeriod(period);
    if (previous) { setPresetB('custom'); setCustomB(previous); } else setPresetB('12m');
    setComparing(true);
  };
  const selection = centerFilter.map((iri) => iri.split('/').pop()!);
  const { data: stats, isLoading, isError, error } = useStatistics(selection, period);
  const { data: statsB, isLoading: loadingB, isError: errorB } = useStatistics(selection, periodB, comparing);
  const compare = comparing ? statsB : undefined;
  const query = statisticsQuery(selection, period);
  const multiCenter = (centers?.member.length ?? 0) > 1;
  const label = (p: Period) => (!p.from && !p.to ? 'toute l\'activité' : `du ${p.from ? formatDate(p.from) : '…'} au ${p.to ? formatDate(p.to) : 'aujourd\'hui'}`);
  const periodLabel = label(period);

  const download = (path: string) => downloadFile(path).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Export impossible'));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Résultats</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stats?.scope ?? '…'} · activité {periodLabel}{stats && ` · données au ${formatDate(stats.generatedAt, "d MMM yyyy 'à' HH:mm")}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {multiCenter && (
            <CenterMultiSelect
              className="w-60 bg-white border-gray-200"
              centers={centers?.member ?? []}
              value={centerFilter}
              onChange={setCenterFilter}
              allLabel={isAdmin ? 'National (tous les centres)' : 'Tous mes centres'}
            />
          )}
          <PeriodPicker className="w-60" preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
          <Button
            variant={comparing ? 'default' : 'outline'}
            aria-pressed={comparing}
            className={comparing ? 'h-10 gap-2 bg-orange-500 hover:bg-orange-600 text-white' : 'h-10 gap-2'}
            onClick={() => (comparing ? setComparing(false) : startComparing())}
          >
            <GitCompareArrows className="w-4 h-4" />Comparer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2"><Download className="w-4 h-4" />Exporter<ChevronDown className="w-4 h-4 opacity-60" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-gray-500">Avec le centre et la période choisis</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => download(`/exports/statistics.xlsx${query}`)}><FileSpreadsheet className="w-4 h-4 text-green-700" />Statistiques (Excel)</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => download(`/exports/statistics.pdf${query}`)}><FileText className="w-4 h-4 text-red-600" />Statistiques (PDF)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => download('/exports/patients.xlsx')}><FileSpreadsheet className="w-4 h-4 text-green-700" />Bilans des patients (Excel)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {comparing && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/50 px-4 py-3 text-sm" data-testid="compare-bar">
          <span className="flex items-center gap-2"><Badge className="bg-orange-500 hover:bg-orange-500">A</Badge><span className="text-gray-700">{periodLabel}</span></span>
          <span className="text-gray-400">comparée à</span>
          <span className="flex items-center gap-2">
            <Badge variant="secondary">B</Badge>
            <PeriodPicker className="w-64" preset={presetB} custom={customB} onChange={(nextPreset, nextCustom) => { setPresetB(nextPreset); setCustomB(nextCustom); }} />
            <Button variant="outline" size="sm" className="h-10" disabled={!previousPeriod(period)} title="Les jours qui précèdent la période A, en nombre égal" onClick={() => { const previous = previousPeriod(period); if (previous) { setPresetB('custom'); setCustomB(previous); } }}>
              Période précédente
            </Button>
          </span>
          <span className="ml-auto text-xs text-gray-500">Écart = A − B · À date : {stats?.total.patients.registered ?? '…'} patients non archivés, {stats?.total.programs.active.count ?? '…'} parcours en cours (identiques pour A et B)</span>
        </div>
      )}

      {isError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error instanceof ApiError ? error.message : 'Impossible de charger les statistiques.'}</p>
      ) : comparing && errorB ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Impossible de charger la période comparée (B).</p>
      ) : isLoading || !stats || (comparing && loadingB) ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-4 ${compare ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
            {compare ? (
              <>
                <CompareKpi icon={<Activity className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Séances validées" hint="sur chaque période" a={stats.total.activity.validatedSessions} b={compare.total.activity.validatedSessions} />
                <CompareKpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen des séances" hint="sur chaque période" a={stats.total.activity.averageSessionScore} b={compare.total.activity.averageSessionScore} format={asPercent} formatDiff={asPoints} />
                <CompareKpi icon={<BarChart2 className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Parcours validés" hint={`sur chaque période · clôturés : ${stats.total.activity.interruptedPrograms} (A) · ${compare.total.activity.interruptedPrograms} (B)`} a={stats.total.activity.completedPrograms} b={compare.total.activity.completedPrograms} />
              </>
            ) : (
              <>
                <Kpi icon={<Users className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Patients non archivés" value={`${stats.total.patients.registered}`} hint="à date" />
                <Kpi icon={<Route className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Parcours en cours" value={`${stats.total.programs.active.count}`} hint="à date" />
                <Kpi icon={<Activity className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Séances validées" value={`${stats.total.activity.validatedSessions}`} hint="sur la période" />
                <Kpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen des séances" value={stats.total.activity.averageSessionScore != null ? `${stats.total.activity.averageSessionScore}%` : '—'} hint="sur la période" />
                <Kpi icon={<BarChart2 className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Parcours validés" value={`${stats.total.activity.completedPrograms}`} hint={`sur la période · ${stats.total.activity.interruptedPrograms} clôturé${stats.total.activity.interruptedPrograms > 1 ? 's' : ''}`} />
              </>
            )}
          </div>

          <Tabs value={tab} onValueChange={(value) => setParams((current) => { current.set('onglet', value); return current; }, { replace: true })}>
            <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200 rounded-none w-full justify-start gap-6">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 text-sm text-gray-500 data-[state=active]:border-orange-500 data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="apercu" className="mt-5"><OverviewTab stats={stats} compare={compare} /></TabsContent>
            <TabsContent value="parcours" className="mt-5">
              {comparing && <p className="mb-3 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-500">Cette liste présente les parcours à date : elle ne dépend pas de la période, la comparaison A / B ne s'y applique pas.</p>}
              <ProgramsTable centerIds={selection} />
            </TabsContent>
            <TabsContent value="seances" className="mt-5"><CoursesTab courses={stats.courses} compare={compare?.courses} /></TabsContent>
            <TabsContent value="centres" className="mt-5"><CentersTab centers={stats.centers} total={stats.total} compare={compare ? { centers: compare.centers, total: compare.total } : undefined} /></TabsContent>
            <TabsContent value="ide" className="mt-5"><NursesTab nurses={stats.nurses} compare={compare?.nurses} /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
