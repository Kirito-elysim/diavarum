import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Activity, CheckCircle2, ChevronRight, Play, Route, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePatients, usePrograms, useSessions } from '../api/hooks';
import { formatDate } from '../lib/format';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: patients } = usePatients();
  const { data: programs } = usePrograms();
  const { data: sessions } = useSessions();

  const patientList = patients?.member ?? [];
  const programList = programs?.member ?? [];
  const eligible = patientList.filter((p) => p.eligibilityStatus === 'eligible').length;
  const toAssess = patientList.filter((p) => p.eligibilityStatus === 'enregistre');
  const activePrograms = programList.filter((p) => p.status === 'actif' || p.status === 'non_actif').length;
  const validated = sessions?.member.filter((s) => s.status === 'validee').length ?? 0;

  const hour = new Date().getHours();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{hour < 18 ? 'Bonjour' : 'Bonsoir'} {user?.firstName}</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{formatDate(new Date().toISOString(), 'EEEE d MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={() => navigate('/patients')}>
            <UserPlus className="w-4 h-4" />Patients
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10 gap-2 shadow-sm shadow-orange-200" onClick={() => navigate('/sessions/new')}>
            <Play className="w-4 h-4" />Démarrer une séance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Users className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" label="Patients enregistrés" value={patients?.totalItems} />
        <Stat icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} bg="bg-green-50" label="Patients éligibles" value={patients ? eligible : undefined} />
        <Stat icon={<Route className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Parcours en cours" value={programs ? activePrograms : undefined} />
        <Stat icon={<Activity className="w-5 h-5 text-violet-600" />} bg="bg-violet-50" label="Séances validées" value={sessions ? validated : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Éligibilité à statuer</CardTitle>
            <p className="text-xs text-gray-400">Patients enregistrés sans décision d'éligibilité</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {toAssess.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Rien en attente</p>}
            {toAssess.slice(0, 6).map((p) => (
              <button key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-left">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-semibold">{p.firstName[0]}{p.lastName[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.lastName.toUpperCase()} {p.firstName}</p>
                  <p className="text-xs text-gray-400">{p.center.name} · enregistré le {formatDate(p.createdAt)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dernières séances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(sessions?.member.length ?? 0) === 0 && <p className="text-sm text-gray-400 py-4 text-center">Aucune séance enregistrée</p>}
            {sessions?.member.slice(0, 6).map((s) => (
              <button key={s.id} onClick={() => navigate(`/patients/${s.patient.id}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.module.title}</p>
                  <p className="text-xs text-gray-400">{s.patient.lastName.toUpperCase()} {s.patient.firstName} · {formatDate(s.startedAt, "d MMM 'à' HH:mm")}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{s.score != null ? `${s.score}%` : '—'}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number | undefined }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value ?? '…'}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
