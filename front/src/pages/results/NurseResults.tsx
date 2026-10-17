import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart2, BookOpen, CheckCircle2, Clock, Loader2, Search, Trophy, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ExportButton } from '../../components/ExportButton';
import { PeriodPicker } from '../../components/PeriodPicker';
import { EmptyState, HEAD, ProgressBar, ScoreBar } from '../../components/ListParts';
import { useMyActivity } from '../../api/hooks';
import { PROGRAM_STATUS_LABELS } from '../../api/types';
import { ApiError } from '../../lib/api';
import { formatDate, formatDuration, programBadge } from '../../lib/format';
import { presetPeriod, type Period, type PeriodPreset } from '../../lib/period';
import { DIAVERUM_GREEN, Kpi, ORANGE } from './shared';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** IDE : ses propres résultats, à partir des séances qu'elle a menées auprès des patients de ses centres */
export function NurseResults() {
  const [preset, setPreset] = useState<PeriodPreset>('12m');
  const [custom, setCustom] = useState<Period>({ from: null, to: null });
  const [search, setSearch] = useState('');
  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const { data, isLoading, isError, error } = useMyActivity(period);
  const periodLabel = !period.from && !period.to ? 'toute l\'activité'
    : `du ${period.from ? formatDate(period.from) : '…'} au ${period.to ? formatDate(period.to) : 'aujourd\'hui'}`;

  const monthly = useMemo(() => (data?.monthly ?? []).map((m) => ({ ...m, label: formatDate(`${m.month}-01`, 'MMM yy') })), [data]);
  const patients = useMemo(() => (data?.patients ?? []).filter((p) => normalize(`${p.name} ${p.center}`).includes(normalize(search.trim()))), [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Mes résultats</h1>
          <p className="text-gray-500 text-sm mt-0.5">Séances que vous avez menées auprès des patients de vos centres · activité {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker className="w-60" preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
          <ExportButton path="/exports/patients.xlsx" format="xlsx" label="Bilans des patients (Excel)" />
        </div>
      </div>

      {isError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error instanceof ApiError ? error.message : 'Impossible de charger vos résultats.'}</p>
      ) : isLoading || !data ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi icon={<Activity className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Séances menées" value={`${data.totals.validatedSessions}`} hint="validées sur la période" />
            <Kpi icon={<Users className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Patients accompagnés" value={`${data.totals.patients}`} hint="sur la période" />
            <Kpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen" value={data.totals.averageScore != null ? `${data.totals.averageScore}%` : '—'} hint="de vos séances" />
            <Kpi icon={<Clock className="w-5 h-5 text-gray-600" />} bg="bg-gray-100" label="Temps de séance" value={formatDuration(data.totals.totalDurationSeconds)} hint="cumulé" />
            <Kpi icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Compétences validées" value={`${data.totals.validatedCompetencies}`} hint="par vous, sur la période" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 border-0 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Mes séances et leur score moyen, par mois</CardTitle></CardHeader>
              <CardContent>
                {monthly.length === 0 ? <EmptyState icon={<BarChart2 className="w-8 h-8" />}>Aucune séance validée sur la période</EmptyState> : (
                  <div className="h-64">
                    <ResponsiveContainer>
                      <ComposedChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="score" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value: number, name: string) => (name === 'Score moyen' ? [`${value} %`, name] : [value, name])} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="count" dataKey="validatedSessions" name="Séances validées" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Line yAxisId="score" dataKey="averageScore" name="Score moyen" stroke={DIAVERUM_GREEN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-0 shadow-sm ring-1 ring-gray-100">
              <CardHeader className="pb-2"><CardTitle className="text-base">Séances que je mène le plus</CardTitle></CardHeader>
              <CardContent>
                {data.courses.length === 0 ? <EmptyState icon={<BookOpen className="w-8 h-8" />}>Aucune séance sur la période</EmptyState> : (
                  <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
                    {data.courses.map((course) => (
                      <li key={course.code} className="py-2.5 first:pt-0 text-sm">
                        <p className="line-clamp-2 text-gray-800" title={course.title}><span className="mr-1.5 font-mono text-xs text-gray-400">{course.code}</span>{course.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500">{course.validations} séance{course.validations > 1 ? 's' : ''}</span>
                          <ScoreBar score={course.averageScore} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Patients que j'ai accompagnés</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input aria-label="Rechercher un patient" placeholder="Rechercher un patient…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {patients.length === 0 ? (
                <EmptyState icon={<Users className="w-8 h-8" />}>{data.patients.length === 0 ? 'Aucun patient accompagné sur la période' : 'Aucun patient ne correspond à la recherche'}</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className={HEAD}>Patient</TableHead>
                        <TableHead className={HEAD}>Séances menées</TableHead>
                        <TableHead className={HEAD}>Score moyen</TableHead>
                        <TableHead className={HEAD}>Parcours</TableHead>
                        <TableHead className={HEAD}>Dernière séance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>
                            <Link to={`/patients/${patient.id}`} className="font-medium text-gray-900 hover:text-orange-600">{patient.name}</Link>
                            <p className="text-xs text-gray-400">{patient.center}</p>
                          </TableCell>
                          <TableCell className="tabular-nums">{patient.sessions}</TableCell>
                          <TableCell><ScoreBar score={patient.averageScore} /></TableCell>
                          <TableCell>
                            {patient.program ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <ProgressBar value={patient.program.validated} total={patient.program.selected} />
                                <Badge variant="secondary" className={programBadge[patient.program.status]}>{PROGRAM_STATUS_LABELS[patient.program.status]}</Badge>
                              </div>
                            ) : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-gray-600">{formatDate(patient.lastSessionAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
