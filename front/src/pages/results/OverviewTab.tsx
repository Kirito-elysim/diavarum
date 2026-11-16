import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart2, CirclePause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { Statistics } from '../../api/types';
import { formatDate, formatDuration } from '../../lib/format';
import { asMinutes, asPercent, asPoints } from '../../lib/compare';
import { DeltaPill, DIAVERUM_GREEN, ORANGE, ValuePair } from './shared';
import { EmptyState } from '../../components/ListParts';

const STATUS_COLORS = { notStarted: '#d1d5db', inactive: '#f97316', active: '#3b82f6', interrupted: '#f59e0b', completed: '#22c55e' };

/** Vue d'ensemble : entonnoir des patients, statut des parcours, activité mensuelle, motifs de clôture */
export function OverviewTab({ stats, compare }: { stats: Statistics; compare?: Statistics }) {
  const otherReasons = new Map((compare?.interruptionReasons ?? []).map((r) => [r.label, r.count]));
  const { patients, programs } = stats.total;
  const inProgram = programs.active.count + programs.inactive.count + programs.interrupted.count + programs.completed.count;
  const funnel = [
    { label: 'Patients non archivés', value: patients.registered },
    { label: 'Éligibles', value: patients.eligible.count },
    { label: 'Parcours démarrés', value: inProgram },
    { label: 'Parcours validés', value: programs.completed.count },
  ];
  const statuses = [
    { key: 'notStarted', label: 'Non démarrés', value: programs.notStarted.count },
    { key: 'inactive', label: 'Inactifs (15 jours)', value: programs.inactive.count },
    { key: 'active', label: 'En cours', value: programs.active.count },
    { key: 'interrupted', label: 'Clôturés', value: programs.interrupted.count },
    { key: 'completed', label: 'Validés', value: programs.completed.count },
  ] as const;
  const monthly = stats.monthly.map((m) => ({ ...m, label: formatDate(`${m.month}-01`, 'MMM yy') }));
  const maxReason = Math.max(1, ...stats.interruptionReasons.map((r) => r.count));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Score moyen des parcours</p>
            {compare ? (
              <>
                <ValuePair a={stats.total.averageProgramScore} b={compare.total.averageProgramScore} format={asPercent} large />
                <DeltaPill a={stats.total.averageProgramScore} b={compare.total.averageProgramScore} formatDiff={asPoints} />
              </>
            ) : <p className="text-3xl font-bold tabular-nums text-gray-900">{stats.total.averageProgramScore != null ? `${stats.total.averageProgramScore} %` : '—'}</p>}
            <p className="text-[11px] text-gray-400">Parcours avec au moins une séance validée sur la période, post-test exclu.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Durée moyenne d'un parcours</p>
            {compare ? (
              <>
                <ValuePair a={stats.total.averageCompletedProgramDurationSeconds} b={compare.total.averageCompletedProgramDurationSeconds} format={formatDuration} large />
                <DeltaPill a={stats.total.averageCompletedProgramDurationSeconds} b={compare.total.averageCompletedProgramDurationSeconds} formatDiff={asMinutes} better="neutral" />
              </>
            ) : <p className="text-3xl font-bold tabular-nums text-gray-900">{stats.total.averageCompletedProgramDurationSeconds != null ? formatDuration(stats.total.averageCompletedProgramDurationSeconds) : '—'}</p>}
            <p className="text-[11px] text-gray-400">Parcours validés sur la période.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader className="pb-2"><CardTitle className="text-base">Du patient enregistré au parcours validé</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((step, i) => {
            const percent = patients.registered ? Math.round((100 * step.value) / patients.registered) : 0;
            return (
              <div key={step.label}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span className="text-gray-700">{step.label}</span>
                  <span className="tabular-nums"><strong className="text-gray-900">{step.value}</strong>{i > 0 && <span className="text-gray-400 ml-1.5">{percent} %</span>}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(percent, step.value ? 2 : 0)}%`, background: i === funnel.length - 1 ? DIAVERUM_GREEN : ORANGE, opacity: 1 - i * 0.15 }} />
                </div>
              </div>
            );
          })}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {[{label: 'Éligibles', share: patients.eligible}, {label: 'Non éligibles', share: patients.notEligible}, {label: 'En attente de décision', share: patients.pending}].map(({label, share}) => <div key={label} className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><span className="tabular-nums font-medium">{share.count} <span className="font-normal text-gray-400">({share.percent != null ? `${share.percent} %` : '—'})</span></span></div>)}
          </div>
          <p className="text-xs text-gray-400 pt-1">Effectifs à date, en pourcentage des patients non archivés. Archivés, hors indicateurs : {patients.archived}.</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader className="pb-2"><CardTitle className="text-base">Parcours par statut{compare && <span className="ml-2 text-xs font-normal text-gray-400">à date : identique pour A et B</span>}</CardTitle></CardHeader>
        <CardContent>
          {programs.total === 0 ? <EmptyState icon={<BarChart2 className="w-8 h-8" />}>Aucun parcours</EmptyState> : (
            <div className="flex flex-wrap items-center gap-6">
              <div className="w-44 h-44 flex-shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statuses.filter((s) => s.value)} dataKey="value" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                      {statuses.filter((s) => s.value).map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm flex-1">
                {statuses.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS[s.key] }} />
                    <span className="text-gray-700 flex-1">{s.label}</span>
                    <strong className="tabular-nums">{s.value}</strong>
                    <span className="text-gray-400 w-12 text-right tabular-nums">{programs.total ? Math.round((100 * s.value) / programs.total) : 0} %</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Séances validées et score moyen, par mois{compare && <span className="ml-2 text-xs font-normal text-gray-400">période A</span>}</CardTitle></CardHeader>
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

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Motifs de clôture des parcours</CardTitle></CardHeader>
        <CardContent>
          {stats.interruptionReasons.length === 0 ? <EmptyState icon={<CirclePause className="w-8 h-8" />}>Aucun parcours clôturé sur la période</EmptyState> : (
            <ul className="space-y-2.5">
              {stats.interruptionReasons.map((reason) => (
                <li key={reason.label} className="grid grid-cols-[minmax(0,16rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-gray-700 truncate" title={reason.label}>{reason.label}</span>
                  <span className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${(100 * reason.count) / maxReason}%` }} /></span>
                  <div className="flex items-center justify-end gap-2"><strong className="tabular-nums" data-testid="compare-a">{reason.count}</strong>{compare && <><span className="tabular-nums text-gray-400" data-testid="compare-b">B : {otherReasons.get(reason.label) ?? 0}</span><DeltaPill a={reason.count} b={otherReasons.get(reason.label) ?? 0} better="neutral" /></>}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
