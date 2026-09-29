import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ChevronRight, Loader2, Route, User } from 'lucide-react';
import { usePrograms } from '../api/hooks';
import { PROGRAM_STATUS_LABELS, type ProgramStatus } from '../api/types';
import { formatDate, programBadge } from '../lib/format';

/**
 * Vue d'ensemble des programmes d'entraînement des patients de mes centres.
 * Un parcours se crée et se compose depuis la fiche du patient.
 */
export default function ParcoursPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | ProgramStatus>('all');
  const { data, isLoading } = usePrograms();

  const programs = (data?.member ?? []).filter((p) => statusFilter === 'all' || p.status === statusFilter);
  const count = (status: ProgramStatus) => data?.member.filter((p) => p.status === status).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parcours d'entraînement</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {count('actif')} en cours · {count('non_actif')} non démarrés · {count('acheve')} achevés · {count('interrompu')} interrompus
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-10 w-48 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {!isLoading && programs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Route className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Aucun parcours{statusFilter !== 'all' ? ' pour ce statut' : ''}.</p>
          <p className="text-sm mt-1">Un parcours se crée depuis la fiche d'un patient éligible.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {programs.map((program) => {
          const selected = program.selectedCount;
          const validated = program.validatedCount;

          return (
            <Card
              key={program.id}
              className="border-0 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(`/patients/${program.patient.id}`)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-bold flex-shrink-0">
                      {program.patient.firstName[0]}{program.patient.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{program.patient.lastName.toUpperCase()} {program.patient.firstName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />{program.createdBy.firstName} {program.createdBy.lastName} · {formatDate(program.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`flex-shrink-0 text-xs ${programBadge[program.status]}`}>{PROGRAM_STATUS_LABELS[program.status]}</Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-gray-500">{validated}/{selected} séances validées</span>
                    <span className="text-gray-400">{program.modules.length - selected} non sélectionnés</span>
                  </div>
                  <Progress value={selected ? (validated / selected) * 100 : 0} className="h-1.5" />
                </div>

                <div className="flex items-center justify-end text-sm text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Ouvrir la fiche <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
