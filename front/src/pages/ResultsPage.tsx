import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart2, Clock, Loader2, Route, Trophy, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCenters, useSessions, useStatistics } from '../api/hooks';
import type { AreaStatistics, Share } from '../api/types';
import { ExportButton } from '../components/ExportButton';
import { formatDate, formatDuration } from '../lib/format';

export default function ResultsPage() {
  const { isCadre } = useAuth();

  return isCadre ? <StatisticsView /> : <NurseResults />;
}

/* ─── Cadre / administrateur : synthèse statistique (cahier des charges §3) ─── */

function StatisticsView() {
  const { isAdmin } = useAuth();
  const { data: centers } = useCenters();
  const [center, setCenter] = useState('all');
  const selection = center === 'all' ? [] : [center];
  const { data: stats, isLoading } = useStatistics(selection);
  const query = selection.map((id) => `centers[]=${id}`).join('&');
  const suffix = query ? `?${query}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats et statistiques</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Périmètre : {stats?.scope ?? '…'}{stats && ` · données au ${formatDate(stats.generatedAt, "d MMM yyyy 'à' HH:mm")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(centers?.member.length ?? 0) > 1 && (
            <Select value={center} onValueChange={setCenter}>
              <SelectTrigger className="h-9 w-56 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAdmin ? 'National (tous les centres)' : 'Tous mes centres'}</SelectItem>
                {centers?.member.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <ExportButton path={`/exports/statistics.xlsx${suffix}`} format="xlsx" />
          <ExportButton path={`/exports/statistics.pdf${suffix}`} format="pdf" />
          <ExportButton path="/exports/patients.xlsx" format="xlsx" label="Bilans patients" />
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={<Users className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Patients enregistrés" value={`${stats.total.patients.registered}`} />
            <Kpi icon={<Route className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Parcours en cours" value={`${stats.total.programs.active.count}`} />
            <Kpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen des parcours" value={stats.total.averageProgramScore != null ? `${stats.total.averageProgramScore}%` : '—'} />
            <Kpi icon={<Clock className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Durée moyenne d'un parcours achevé" value={formatDuration(stats.total.averageCompletedProgramDurationSeconds)} />
          </div>

          <AreaTable
            title="Patients"
            areas={[...stats.centers, stats.total]}
            columns={[
              ['Enregistrés', (a) => a.patients.registered],
              ['Éligibles', (a) => <ShareCell share={a.patients.eligible} />],
              ['Non éligibles', (a) => <ShareCell share={a.patients.notEligible} />],
              ['À statuer', (a) => <ShareCell share={a.patients.pending} />],
            ]}
          />

          <AreaTable
            title="Parcours"
            areas={[...stats.centers, stats.total]}
            columns={[
              ['Non actifs', (a) => <ShareCell share={a.programs.inactive} />],
              ['En cours', (a) => <ShareCell share={a.programs.active} />],
              ['Interrompus', (a) => <ShareCell share={a.programs.interrupted} />],
              ['Achevés', (a) => <ShareCell share={a.programs.completed} />],
              ['Score moyen', (a) => (a.averageProgramScore != null ? `${a.averageProgramScore}%` : '—')],
              ['Durée moy. (achevés)', (a) => formatDuration(a.averageCompletedProgramDurationSeconds)],
            ]}
          />

          <div className="grid xl:grid-cols-3 gap-5">
            <Card className="xl:col-span-2 border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <CardHeader className="pb-2"><CardTitle className="text-base">Séances</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="text-xs uppercase">Séance</TableHead>
                    <TableHead className="text-xs uppercase text-right">Validations</TableHead>
                    <TableHead className="text-xs uppercase text-right">Score moyen</TableHead>
                    <TableHead className="text-xs uppercase text-right">Durée moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.courses.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell className="text-sm">
                        <Badge variant="secondary" className={c.mandatory ? 'bg-blue-50 text-blue-700 mr-2' : 'bg-violet-50 text-violet-700 mr-2'}>{c.code}</Badge>
                        {c.title}
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.validations}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{c.averageScore != null ? `${c.averageScore}%` : '—'}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600">{formatDuration(c.averageDurationSeconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden h-fit">
              <CardHeader className="pb-2"><CardTitle className="text-base">Activité des IDE</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="text-xs uppercase">IDE</TableHead>
                    <TableHead className="text-xs uppercase text-right">Séances</TableHead>
                    <TableHead className="text-xs uppercase text-right">Temps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.nurses.map((n) => (
                    <TableRow key={n.name}>
                      <TableCell className="text-sm">{n.name}<p className="text-xs text-gray-400">{n.centers}</p></TableCell>
                      <TableCell className="text-right text-sm">{n.validatedSessions}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600">{formatDuration(n.totalDurationSeconds)}</TableCell>
                    </TableRow>
                  ))}
                  {stats.nurses.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-6">Aucune IDE</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AreaTable({ title, areas, columns }: { title: string; areas: AreaStatistics[]; columns: [string, (a: AreaStatistics) => React.ReactNode][] }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
            <TableHead className="text-xs uppercase">Centre</TableHead>
            {columns.map(([label]) => <TableHead key={label} className="text-xs uppercase text-right">{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {areas.map((area, i) => (
            <TableRow key={`${area.center}-${i}`} className={i === areas.length - 1 ? 'bg-green-50/60 font-semibold hover:bg-green-50/60' : ''}>
              <TableCell className="text-sm">{area.center}</TableCell>
              {columns.map(([label, value]) => <TableCell key={label} className="text-right text-sm">{value(area)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ShareCell({ share }: { share: Share }) {
  return (
    <span>
      {share.count}
      {share.percent != null && <span className="text-gray-400 font-normal ml-1">({share.percent.toLocaleString('fr-FR')} %)</span>}
    </span>
  );
}

/* ─── IDE : séances validées de ses patients ───────────────────────────── */

function NurseResults() {
  const { data, isLoading } = useSessions();
  const validated = (data?.member ?? []).filter((s) => s.status === 'validee');
  const scored = validated.filter((s) => s.score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) : null;
  const avgSeconds = validated.length ? Math.round(validated.reduce((sum, s) => sum + s.durationSeconds, 0) / validated.length) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats</h1>
          <p className="text-gray-500 text-sm mt-0.5">Séances validées des patients de vos centres</p>
        </div>
        <ExportButton path="/exports/patients.xlsx" format="xlsx" label="Bilan des patients (Excel)" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={<BarChart2 className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" label="Séances validées" value={`${validated.length}`} />
        <Kpi icon={<Trophy className="w-5 h-5 text-amber-500" />} bg="bg-amber-50" label="Score moyen" value={avgScore != null ? `${avgScore}%` : '—'} />
        <Kpi icon={<Clock className="w-5 h-5 text-green-500" />} bg="bg-green-50" label="Durée moyenne" value={formatDuration(avgSeconds)} />
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="text-xs uppercase">Patient</TableHead>
              <TableHead className="text-xs uppercase">Séance</TableHead>
              <TableHead className="text-xs uppercase">Validée le</TableHead>
              <TableHead className="text-xs uppercase">Durée</TableHead>
              <TableHead className="text-xs uppercase">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validated.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.patient.lastName.toUpperCase()} {s.patient.firstName}</TableCell>
                <TableCell>{s.module.title}</TableCell>
                <TableCell className="text-gray-600">{formatDate(s.completedAt, "d MMM yyyy 'à' HH:mm")}</TableCell>
                <TableCell className="text-gray-600">{formatDuration(s.durationSeconds)}</TableCell>
                <TableCell className="font-semibold">{s.score != null ? `${s.score}%` : '—'}</TableCell>
              </TableRow>
            ))}
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline text-gray-400" /></TableCell></TableRow>}
            {!isLoading && validated.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-400">Aucune séance validée pour le moment</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Kpi({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
