import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Activity, BarChart2, ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Route, Trophy, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { SearchableSelect } from '../../components/SearchableSelect';
import { useAuth } from '../../contexts/AuthContext';
import { statisticsQuery, useCenters, useStatistics } from '../../api/hooks';
import { ApiError, downloadFile } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { presetPeriod, type Period, type PeriodPreset } from '../../lib/period';
import { PeriodPicker } from '../../components/PeriodPicker';
import { Kpi } from './shared';
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
  const [center, setCenter] = useState('all');
  const [preset, setPreset] = useState<PeriodPreset>('12m');
  const [custom, setCustom] = useState<Period>({ from: null, to: null });

  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const selection = center === 'all' ? [] : [center];
  const { data: stats, isLoading, isError, error } = useStatistics(selection, period);
  const query = statisticsQuery(selection, period);
  const multiCenter = (centers?.member.length ?? 0) > 1;
  const periodLabel = !period.from && !period.to ? 'toute l\'activité'
    : `du ${period.from ? formatDate(period.from) : '…'} au ${period.to ? formatDate(period.to) : 'aujourd\'hui'}`;

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
            <SearchableSelect
              aria-label="Filtrer par centre"
              className="w-60 bg-white border-gray-200"
              value={center}
              onChange={setCenter}
              placeholder={isAdmin ? 'National (tous les centres)' : 'Tous mes centres'}
              searchPlaceholder="Rechercher un centre…"
              emptyText="Aucun centre trouvé"
              options={[{ value: 'all', label: isAdmin ? 'National (tous les centres)' : 'Tous mes centres' }, ...(centers?.member ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.city }))]}
            />
          )}
          <PeriodPicker className="w-60" preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
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

      {isError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error instanceof ApiError ? error.message : 'Impossible de charger les statistiques.'}</p>
      ) : isLoading || !stats ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi icon={<Users className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Patients enregistrés" value={`${stats.total.patients.registered}`} hint="à date" />
            <Kpi icon={<Route className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Parcours en cours" value={`${stats.total.programs.active.count}`} hint="à date" />
            <Kpi icon={<Activity className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Séances validées" value={`${stats.total.activity.validatedSessions}`} hint="sur la période" />
            <Kpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen des séances" value={stats.total.activity.averageSessionScore != null ? `${stats.total.activity.averageSessionScore}%` : '—'} hint="sur la période" />
            <Kpi icon={<BarChart2 className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Parcours achevés" value={`${stats.total.activity.completedPrograms}`} hint={`sur la période · ${stats.total.activity.interruptedPrograms} clôturé${stats.total.activity.interruptedPrograms > 1 ? 's' : ''}`} />
          </div>

          <Tabs value={tab} onValueChange={(value) => setParams((current) => { current.set('onglet', value); return current; }, { replace: true })}>
            <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200 rounded-none w-full justify-start gap-6">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 text-sm text-gray-500 data-[state=active]:border-orange-500 data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="apercu" className="mt-5"><OverviewTab stats={stats} /></TabsContent>
            <TabsContent value="parcours" className="mt-5"><ProgramsTable centerId={center === 'all' ? null : center} /></TabsContent>
            <TabsContent value="seances" className="mt-5"><CoursesTab courses={stats.courses} /></TabsContent>
            <TabsContent value="centres" className="mt-5"><CentersTab centers={stats.centers} total={stats.total} /></TabsContent>
            <TabsContent value="ide" className="mt-5"><NursesTab nurses={stats.nurses} /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
