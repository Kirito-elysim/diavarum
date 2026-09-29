import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Clock, Play } from 'lucide-react';
import { usePatientProgram, usePatients } from '../api/hooks';
import { sessionLabel } from '../lib/format';

/**
 * Lancer une séance : patient éligible, puis un cours sélectionné dans son parcours.
 * Aucune progression imposée : l'IDE choisit le cours du jour.
 */
export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patientId, setPatientId] = useState(searchParams.get('patientId') ?? '');
  const [moduleId, setModuleId] = useState('');

  const { data: patients } = usePatients({ eligibilityStatus: 'eligible' });
  const patient = patients?.member.find((p) => p.id === patientId);
  const { data: program, isLoading: programLoading } = usePatientProgram(patient?.['@id']);
  const selection = program?.modules.filter((m) => m.selected) ?? [];

  const start = () => {
    if (patient && program && moduleId) {
      navigate(`/sessions/run?patientId=${patient.id}&moduleId=${moduleId}&programId=${program.id}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-500 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Démarrer une séance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Une séance d'entraînement par dialyse, choisie dans le parcours du patient</p>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Patient et cours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm font-medium text-gray-700">Patient (éligibles uniquement)</Label>
            <Select value={patientId} onValueChange={(id) => { setPatientId(id); setModuleId(''); }}>
              <SelectTrigger className="mt-1.5 h-12 border-gray-200">
                <SelectValue placeholder="Sélectionnez un patient…" />
              </SelectTrigger>
              <SelectContent>
                {patients?.member.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.lastName.toUpperCase()} {p.firstName} — {p.center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {patient && !programLoading && !program && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Ce patient n'a pas encore de parcours. <Link to={`/patients/${patient.id}`} className="underline font-medium">Le créer depuis sa fiche</Link>.
            </p>
          )}

          {program && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Cours du parcours</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger className="mt-1.5 h-12 border-gray-200">
                  <SelectValue placeholder="Sélectionnez le cours du jour…" />
                </SelectTrigger>
                <SelectContent>
                  {selection.map((m) => (
                    <SelectItem key={m.id} value={m.module.id}>{sessionLabel(m.module.code)} — {m.module.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {moduleId && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selection.find((m) => m.module.id === moduleId)?.module.estimatedDuration} min environ
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200 gap-2"
            disabled={!patient || !program || !moduleId}
            onClick={start}
          >
            <Play className="w-5 h-5" />
            Lancer la séance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
