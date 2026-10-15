import { useState } from 'react';
import { toast } from 'sonner';
import type { Patient } from '../api/types';
import { useUpdatePatient } from '../api/hooks';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface Answer { question: string; answer: string }
interface ProfileSection { notes: string; answers: Answer[] }
const sections = [
  { key: 'medicalData', label: 'Informations médicales' },
  { key: 'administrativeData', label: 'Informations administratives' },
] as const;
type SectionKey = typeof sections[number]['key'];

function readSection(data: Patient[SectionKey]): ProfileSection {
  const profile = data && !Array.isArray(data) ? data.profile : undefined;
  if (!profile || typeof profile !== 'object') return { notes: '', answers: [] };
  const value = profile as Record<string, unknown>;
  return {
    notes: typeof value.notes === 'string' ? value.notes : '',
    answers: Array.isArray(value.answers) ? value.answers.filter((item): item is Answer =>
      !!item && typeof item.question === 'string' && typeof item.answer === 'string') : [],
  };
}

export function PatientProfileSummary({ patient }: { patient: Patient }) {
  const populated = sections.map(section => ({ ...section, value: readSection(patient[section.key]) }))
    .filter(({ value }) => value.notes || value.answers.length);
  return <Card>
    <CardHeader><CardTitle className="text-base">Profil patient</CardTitle></CardHeader>
    <CardContent className="space-y-4 text-sm">
      {populated.length === 0 && <p className="text-gray-500">Aucune information saisie. Vous pouvez compléter le profil dans l’onglet Profil patient avant de choisir les cours.</p>}
      {populated.map(({ key, label, value }) => <section key={key} className="space-y-2 break-words">
        <h3 className="font-semibold">{label}</h3>
        {value.notes && <p className="whitespace-pre-wrap">{value.notes}</p>}
        <dl className="space-y-2">{value.answers.map((item, index) => <div key={index}>
          <dt className="font-medium">{item.question}</dt><dd className="whitespace-pre-wrap text-gray-600">{item.answer || 'Non renseigné'}</dd>
        </div>)}</dl>
      </section>)}
    </CardContent>
  </Card>;
}

export function PatientProfile({ patient }: { patient: Patient }) {
  const update = useUpdatePatient(patient.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<SectionKey, ProfileSection>>(() => ({
    medicalData: readSection(patient.medicalData), administrativeData: readSection(patient.administrativeData),
  }));
  const change = (key: SectionKey, value: Partial<ProfileSection>) => setDraft(current => ({ ...current, [key]: { ...current[key], ...value } }));
  return <div className="space-y-4">
    <p className="text-sm text-gray-500">Saisie libre en attendant le questionnaire validé. Reportez les questions et les réponses recueillies ; ces informations restent accessibles à l’IDE lors du choix des cours.</p>
    {!editing ? <><PatientProfileSummary patient={patient} /><Button onClick={() => {
      setDraft({ medicalData: readSection(patient.medicalData), administrativeData: readSection(patient.administrativeData) });
      setEditing(true);
    }}>Compléter le profil</Button></> : <form className="space-y-4" onSubmit={async event => {
      event.preventDefault();
      try {
        await update.mutateAsync(Object.fromEntries(sections.map(({ key }) => [key, {
          ...(Array.isArray(patient[key]) ? {} : patient[key]),
          profile: { notes: draft[key].notes.trim(), answers: draft[key].answers.map(item => ({ question: item.question.trim(), answer: item.answer.trim() })) },
        }])));
        setEditing(false);
        toast.success('Profil patient enregistré');
      } catch { toast.error('Enregistrement impossible. Vos réponses sont conservées dans le formulaire.'); }
    }}>
      <fieldset disabled={update.isPending} className="space-y-4">
        {sections.map(({ key, label }) => <Card key={key}>
          <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor={`${key}-notes`}>Notes — {label.toLowerCase()}</Label>
              <Textarea id={`${key}-notes`} rows={4} maxLength={10000} value={draft[key].notes} onChange={event => change(key, { notes: event.target.value })} />
            </div>
            {draft[key].answers.map((item, index) => <div key={index} className="space-y-2 rounded-xl border p-3">
              <Label htmlFor={`${key}-${index}-question`}>Question {index + 1} — {label.toLowerCase()}</Label>
              <Input id={`${key}-${index}-question`} required pattern=".*\S.*" maxLength={500} value={item.question} onChange={event => change(key, { answers: draft[key].answers.map((answer, i) => i === index ? { ...answer, question: event.target.value } : answer) })} />
              <Label htmlFor={`${key}-${index}-answer`}>Réponse {index + 1} — {label.toLowerCase()}</Label>
              <Textarea id={`${key}-${index}-answer`} maxLength={10000} value={item.answer} onChange={event => change(key, { answers: draft[key].answers.map((answer, i) => i === index ? { ...answer, answer: event.target.value } : answer) })} />
              <Button type="button" variant="outline" onClick={() => change(key, { answers: draft[key].answers.filter((_, i) => i !== index) })}>Retirer la question {index + 1}</Button>
            </div>)}
            <Button type="button" variant="outline" onClick={() => change(key, { answers: [...draft[key].answers, { question: '', answer: '' }] })}>Ajouter une question — {label.toLowerCase()}</Button>
          </CardContent>
        </Card>)}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{update.isPending ? 'Enregistrement…' : 'Enregistrer le profil'}</Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Annuler les modifications</Button>
        </div>
      </fieldset>
    </form>}
  </div>;
}
