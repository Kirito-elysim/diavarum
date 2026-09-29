import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Activity, Loader2, Play } from 'lucide-react';
import { useSessions } from '../api/hooks';
import type { SessionStatus } from '../api/types';
import { formatDate, formatDuration } from '../lib/format';

const STATUS: Record<SessionStatus, { label: string; cls: string }> = {
  en_cours: { label: 'Non terminée', cls: 'bg-blue-100 text-blue-700' },
  validee: { label: 'Validée', cls: 'bg-green-100 text-green-700' },
  interrompue: { label: 'Interrompue', cls: 'bg-amber-100 text-amber-700' },
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');
  const { data, isLoading } = useSessions();

  const sessions = (data?.member ?? []).filter((s) => statusFilter === 'all' || s.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Séances d'entraînement</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historique des séances des patients de vos centres</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-10 w-44 bg-white border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200" onClick={() => navigate('/sessions/new')}>
            <Play className="w-4 h-4" />
            Nouvelle séance
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Date</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Patient</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Cours</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">IDE</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Durée</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Score</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id} className="cursor-pointer hover:bg-orange-50/30" onClick={() => navigate(`/patients/${session.patient.id}`)}>
                <TableCell className="text-sm text-gray-600">{formatDate(session.startedAt, "d MMM yyyy 'à' HH:mm")}</TableCell>
                <TableCell className="font-medium text-gray-900">{session.patient.lastName.toUpperCase()} {session.patient.firstName}</TableCell>
                <TableCell className="text-sm text-gray-700">{session.module.title}</TableCell>
                <TableCell className="text-sm text-gray-600">{session.nurse.firstName} {session.nurse.lastName}</TableCell>
                <TableCell className="text-sm text-gray-600">{formatDuration(session.durationSeconds)}</TableCell>
                <TableCell className="text-sm font-semibold">{session.score != null ? `${session.score}%` : '—'}</TableCell>
                <TableCell><Badge variant="secondary" className={STATUS[session.status].cls}>{STATUS[session.status].label}</Badge></TableCell>
              </TableRow>
            ))}
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline text-gray-400" /></TableCell></TableRow>
            )}
            {!isLoading && sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucune séance enregistrée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
