import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, Activity, BookOpen, Trophy, TrendingUp, Clock, CheckCircle, PlayCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard, usePatients } from '../api/hooks';
import type { Dashboard } from '../api/types';
import { formatDate } from '../lib/format';

const ORANGE = '#E86825'; // orange Diaverum (charte graphique)
const GREEN = '#22c55e';

const activityIcons = {
  session_started: <PlayCircle className="w-4 h-4 text-blue-500" />,
  session_completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  module_assigned: <BookOpen className="w-4 h-4 text-orange-500" />,
  patient_added: <Users className="w-4 h-4 text-purple-500" />,
};

const activityColors = {
  session_started: 'bg-blue-50',
  session_completed: 'bg-green-50',
  module_assigned: 'bg-orange-50',
  patient_added: 'bg-purple-50',
};

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  labelStyle: { color: '#1e293b', fontWeight: 600 },
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data } = useDashboard();
  const { data: pending } = usePatients({ eligibilityStatus: 'enregistre' });
  const k: NonNullable<Dashboard['kpis']> | undefined = data?.kpis ?? undefined;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vue d'ensemble du programme d'entraînement</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Séances actives"
          value={k?.activeSessions ?? '…'}
          icon={<Activity className="w-5 h-5" />}
          color="orange"
          trend={k ? `${plural(k.sessionsStartedToday, 'démarrée')} aujourd'hui` : ''}
        />
        <StatCard
          title="Patients totaux"
          value={k?.patients ?? '…'}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          trend={k ? `+${k.patientsThisWeek} cette semaine` : ''}
        />
        <StatCard
          title="Patients éligibles"
          value={k?.eligible ?? '…'}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          trend={k && k.patients ? `${Math.round((100 * k.eligible) / k.patients)} % des patients` : ''}
        />
        <StatCard
          title="Séances validées"
          value={k?.validatedSessions ?? '…'}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
          trend={k ? `+${k.validatedThisMonth} ce mois` : ''}
        />
        <StatCard
          title="Score moyen"
          value={k ? (k.averageScore != null ? `${k.averageScore}%` : '—') : '…'}
          icon={<Trophy className="w-5 h-5" />}
          color="amber"
          trend={k ? `sur ${plural(k.scoredSessions, 'séance')} notée${k.scoredSessions > 1 ? 's' : ''}` : ''}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Progression des séances
              </CardTitle>
              <Badge variant="secondary" className="text-xs">6 mois</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.monthly ?? []} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ORANGE} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="sessions" name="Séances démarrées" stroke={ORANGE} strokeWidth={2} fill="url(#colorSessions)" />
                <Area type="monotone" dataKey="completed" name="Séances validées" stroke={GREEN} strokeWidth={2} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-500" />
                Complétion par séance
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{isAdmin ? 'Tous les centres' : 'Vos centres'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data && data.modules.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Aucune séance commencée pour le moment</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.modules ?? []} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(code) => data?.modules.find((m) => m.name === code)?.title ?? code}
                  />
                  <Bar dataKey="completed" name="Validées" fill={ORANGE} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" name="En cours" fill="#FFE0D0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Active sessions */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Séances en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.activeSessions.length === 0 && <p className="text-sm text-gray-400">Aucune séance en cours</p>}
              {data?.activeSessions.map((session) => (
                <button key={session.id} onClick={() => navigate(`/patients/${session.patientId}`)} className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.patientName}</p>
                    <p className="text-xs text-gray-500 truncate">{session.moduleTitle}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        Démarrée à {formatDate(session.startedAt, 'HH:mm')} · {session.nurse}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Eligibility pending */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                Éligibilité à statuer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {pending?.member.length === 0 && <p className="text-sm text-gray-400">Rien en attente</p>}
              {pending?.member.slice(0, 5).map((p) => (
                <button key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-semibold">{p.firstName[0]}{p.lastName[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.lastName.toUpperCase()} {p.firstName}</p>
                    <p className="text-xs text-gray-400 truncate">{p.center.name} · enregistré le {formatDate(p.createdAt)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 lg:col-span-2 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.activity.length === 0 && <p className="text-sm text-gray-400">Aucune activité pour le moment</p>}
              {data?.activity.map((activity, i) => (
                <button key={`${activity.type}-${activity.at}-${i}`} onClick={() => navigate(`/patients/${activity.patientId}`)} className="w-full text-left flex items-start gap-3 hover:bg-gray-50 rounded-xl -mx-2 px-2 py-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${activityColors[activity.type]}`}>
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{activity.user}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{formatDate(activity.at, 'd MMM, HH:mm')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'orange' | 'blue' | 'green' | 'amber' | 'purple';
  trend: string;
}) {
  const colorMap = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-500' },
  };
  const c = colorMap[color];

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium leading-tight">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{trend}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center text-white flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
