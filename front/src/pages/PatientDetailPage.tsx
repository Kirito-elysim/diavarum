import { PatientProgramBis, PatientCompetencies } from '../components/PatientProgramBis';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  Award,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Pencil,
  CheckCircle2,
  CirclePause,
  RotateCcw,
  Activity,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  Loader2,
  Lock,
  MapPin,
  Play,
  Route,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { useCourseLaunch } from '../components/CourseLaunchConfirmation';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  useArchivePatient,
  useChapters,
  useCodexTests,
  useCreateProgram,
  useErasePatient,
  useEligibilityReasons,
  useInterruptionReasons,
  useModules,
  useProgramAction,
  usePatient,
  usePatientProgram,
  useSessions,
  useToggleProgramModule,
  useUpdatePatient,
} from '../api/hooks';
import {
  ELIGIBILITY_LABELS,
  PROGRAM_STATUS_LABELS,
  PROGRAM_ACTIVITY_LABELS,
  type EligibilityStatus,
  type Patient,
  type ProgramModule,
  type TrainingProgram,
} from '../api/types';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { ExportButton } from '../components/ExportButton';
import { PatientDialog } from './PatientsPage';
import { eligibilityBadge, formatDate, formatDuration, programBadge, sessionLabel } from '../lib/format';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCadre } = useAuth();
  const { data: patient, isLoading, error } = usePatient(id);
  const { data: program } = usePatientProgram(patient?.['@id']);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editing, setEditing] = useState(false);
  const archivePatient = useArchivePatient();
  const restorePatient = useArchivePatient(true);
  const erasePatient = useErasePatient();
  const [confirmErase, setConfirmErase] = useState(false);
  const [eraseText, setEraseText] = useState('');

  if (isLoading) {
    return <div className="flex justify-center py-24 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{error instanceof ApiError ? error.message : 'Patient introuvable.'}</p>
        <Button variant="ghost" onClick={() => navigate('/patients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux patients
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="text-gray-500 hover:text-gray-900 -ml-1">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Patients
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {!patient.removedAt && (
            <Button variant="outline" size="sm" className="gap-1.5 text-gray-600" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />Modifier
            </Button>
          )}
          {isCadre && !patient.removedAt && (
            <Button variant="outline" size="sm" className="mr-2 gap-1.5 text-gray-600" onClick={() => setConfirmArchive(true)}>
              <Archive className="w-4 h-4" />Archiver
            </Button>
          )}
          <span className="text-xs text-gray-400">Bilan :</span>
          <ExportButton path={`/exports/patients/${patient.id}.pdf`} format="pdf" />
          <ExportButton path={`/exports/patients.xlsx?patients[]=${patient.id}`} format="xlsx" />
        </div>
      </div>

      {patient.removedAt && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <Archive className="w-5 h-5 text-gray-500" />
          <span className="flex-1">Patient archivé le {formatDate(patient.removedAt, 'dd/MM/yyyy')} : sa fiche et son historique restent consultables, mais rien ne peut plus être modifié ni lancé.</span>
          {isCadre && (
            <Button size="sm" variant="outline" disabled={restorePatient.isPending} className="gap-1.5"
              onClick={() => restorePatient.mutateAsync(patient).then(() => toast.success('Patient réactivé')).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Réactivation impossible'))}>
              <RotateCcw className="w-4 h-4" />Réactiver
            </Button>
          )}
          {isCadre && (
            <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50" onClick={() => setConfirmErase(true)}>
              <Trash2 className="w-4 h-4" />Supprimer définitivement
            </Button>
          )}
        </div>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 text-2xl font-bold flex-shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{patient.lastName.toUpperCase()} {patient.firstName}</h1>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />Né(e) le {formatDate(patient.dateOfBirth, 'dd/MM/yyyy')}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" />{patient.center.name}</span>
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" />Enregistré le {formatDate(patient.createdAt, 'dd/MM/yyyy')} par {patient.createdBy.firstName} {patient.createdBy.lastName}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={eligibilityBadge[patient.eligibilityStatus]}>
                    {ELIGIBILITY_LABELS[patient.eligibilityStatus]}{patient.eligibilityDecidedAt && ` le ${formatDate(patient.eligibilityDecidedAt, 'dd/MM/yyyy')}`}
                  </Badge>
                  {program && <Badge variant="secondary" className={programBadge[program.status]}>Parcours {(program.activityStatus ? PROGRAM_ACTIVITY_LABELS[program.activityStatus] : PROGRAM_STATUS_LABELS[program.status]).toLowerCase()}</Badge>}
                </div>
              </div>
              {program && (
                <div className="pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      Progression du parcours
                      {program.averageScore != null && <span className="text-gray-400 font-normal"> · score moyen {program.averageScore}%</span>}
                      {program.totalDurationSeconds > 0 && <span className="text-gray-400 font-normal"> · {formatDuration(program.totalDurationSeconds)} au total</span>}
                    </span>
                    <span className="text-sm font-bold text-orange-600">{program.validatedCount}/{program.selectedCount} séances validées</span>
                  </div>
                  <Progress value={program.selectedCount ? (program.validatedCount / program.selectedCount) * 100 : 0} className="h-2.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={patient.eligibilityStatus === 'eligible' ? 'parcours' : 'eligibility'} className="space-y-4">
        <TabsList className="patient-detail-tabs w-full border-b border-slate-200 bg-transparent p-0 h-auto rounded-none">
          <TabsTrigger value="eligibility" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShieldCheck className="w-4 h-4 mr-2" />Éligibilité
          </TabsTrigger>
          <TabsTrigger value="parcours" className="rounded-lg px-4 py-2 text-sm"><Route className="w-4 h-4 mr-2" />Parcours</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="w-4 h-4 mr-2" />Séances
          </TabsTrigger>
          <TabsTrigger value="competencies" className="rounded-lg px-4 py-2 text-sm"><Award className="w-4 h-4 mr-2" />Compétences</TabsTrigger>
        </TabsList>

        {/* Patient archivé : consultation seule (un fieldset désactivé neutralise boutons et champs) */}
        <TabsContent value="parcours">
          {program && patient.eligibilityStatus === 'eligible' ? <PatientProgramBis key={program.id} patient={patient} program={program} actions={<ProgramActions program={program} />} /> : <fieldset disabled={!!patient.removedAt} className="contents"><ProgramSection patient={patient} program={program ?? null} /></fieldset>}
        </TabsContent>
        <TabsContent value="competencies">
          {program ? <PatientCompetencies patient={patient} program={program} /> : <p className="p-6 text-gray-500">Aucun parcours : aucune compétence évaluée.</p>}
        </TabsContent>
        {program && !patient.removedAt && <ResumePrompt patient={patient} program={program} />}
        <TabsContent value="eligibility" className="space-y-5">
          <fieldset disabled={!!patient.removedAt} className="contents">
            <CodexSection patient={patient} />
            <EligibilitySection patient={patient} />
          </fieldset>
        </TabsContent>
        <TabsContent value="history">
          <SessionHistory patientIri={patient['@id']} />
        </TabsContent>
      </Tabs>

      {editing && <PatientDialog open patient={patient} onOpenChange={setEditing} />}

      <Dialog open={confirmErase} onOpenChange={(open) => { setConfirmErase(open); if (!open) setEraseText(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement {patient.firstName} {patient.lastName.toUpperCase()} ?</DialogTitle>
            <DialogDescription>
              Le dossier, les parcours, les séances (réponses et compétences) et les tests CODEX de ce patient seront effacés de la base. Cette action est irréversible
              et ne peut pas être annulée. Une trace sans donnée de santé (qui, quand, centre) est conservée. Le patient reste présent dans les sauvegardes jusqu'à leur rotation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="erase-confirm">Pour confirmer, saisissez : <strong>{patient.lastName.toUpperCase()} {patient.firstName}</strong></Label>
            <Input id="erase-confirm" value={eraseText} autoComplete="off" onChange={(e) => setEraseText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmErase(false)}>Annuler</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={erasePatient.isPending || eraseText.trim().toLowerCase() !== `${patient.lastName} ${patient.firstName}`.toLowerCase()}
              onClick={() => erasePatient.mutateAsync({ patient, confirmation: eraseText }).then(
                () => { toast.success('Patient supprimé définitivement'); navigate('/patients'); },
                (err) => toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Suppression impossible'),
              )}
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver {patient.firstName} {patient.lastName.toUpperCase()} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le patient sort de la file active : il n'apparaît plus dans les listes ni dans les statistiques, et plus rien ne peut être lancé pour lui.
              Sa fiche, ses séances et ses bilans restent consultables (filtre « Archivés ») et il peut être réactivé à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-500 hover:bg-orange-600" disabled={archivePatient.isPending}
              onClick={() => archivePatient.mutateAsync(patient).then(() => toast.success('Patient archivé')).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Archivage impossible'))}>
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Parcours ─────────────────────────────────────────────────────────── */

function ProgramSection({ patient, program }: { patient: Patient; program: TrainingProgram | null }) {
  const [creating, setCreating] = useState(false);
  const { launch, confirmation } = useCourseLaunch(patient.id, program);

  if (patient.eligibilityStatus !== 'eligible') {
    return (
      <EmptyState icon={<Lock className="w-8 h-8" />} title="Parcours verrouillé">
        {patient.eligibilityStatus === 'non_eligible'
          ? "Le patient est déclaré non éligible : pas de sélection de cours ni d'accès aux cours."
          : "Déclarez le patient éligible (onglet Éligibilité) pour composer son parcours d'entraînement."}
      </EmptyState>
    );
  }

  if (!program) {
    return (
      <EmptyState icon={<Route className="w-8 h-8" />} title="Aucun parcours">
        <p>Les cours systématiques seront pré-sélectionnés ; vous pourrez ajouter les cours optionnels adaptés au patient.</p>
        <Button className="mt-4 gap-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setCreating(true)}>
          <Route className="w-4 h-4" />
          Créer le parcours
        </Button>
        <CreateProgramDialog patient={patient} open={creating} onOpenChange={setCreating} />
      </EmptyState>
    );
  }

  const optional = program.modules.filter((m) => !m.module.mandatory);
  const readOnly = program.status === 'acheve';
  const canStart = program.status === 'non_actif' || program.status === 'actif';
  const noOptionalSelected = optional.length > 0 && !optional.some((m) => m.selected);

  // Regroupement par thématique, dans l'ordre de la liste officielle des séances
  const themes = new Map<string, { title: string; items: ProgramModule[] }>();
  for (const item of program.modules) {
    const key = item.module.chapter?.id ?? 'sans-thematique';
    const theme = themes.get(key) ?? { title: item.module.chapter?.title ?? 'Autres séances', items: [] };
    theme.items.push(item);
    themes.set(key, theme);
  }

  return (
    <div className="space-y-4">
      {confirmation}
      <CodexSummary patient={patient} />
      <ProgramActions program={program} />
      <p className="text-sm text-gray-500">
        {program.modules.filter((m) => m.selected).length} séances sélectionnées sur {program.modules.length} —
        les séances systématiques sont cochées par défaut, les optionnelles sont à cocher selon le profil du patient.
      </p>
      {noOptionalSelected && !readOnly && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p><strong>Aucune séance optionnelle sélectionnée.</strong> Ce n'est pas obligatoire, mais vérifiez si l'une d'elles est adaptée au profil du patient.</p>
        </div>
      )}
      {[...themes.values()].map((theme) => (
        <ModuleGroup key={theme.title} title={theme.title} items={theme.items} patient={patient} readOnly={readOnly} canStart={canStart} onLaunch={launch} />
      ))}
    </div>
  );
}

/** Création du parcours : séances systématiques incluses d'office (grisées), optionnelles à cocher */
function CreateProgramDialog({ patient, open, onOpenChange }: { patient: Patient; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createProgram = useCreateProgram();
  const client = useQueryClient();
  const { data } = useModules();
  const { data: chapterList } = useChapters();
  const [chosen, setChosen] = useState<string[]>([]);
  const modules = (data?.member ?? []).filter((m) => m.published).sort((a, b) => a.position - b.position);
  const mandatory = modules.filter((m) => m.mandatory);
  const optional = modules.filter((m) => !m.mandatory);
  // Systématiques regroupées par chapitre, dans l'ordre des chapitres
  const chapters = new Map((chapterList?.member ?? []).map((c) => [c['@id'], c]));
  const mandatoryByChapter = new Map<string, typeof modules>();
  for (const m of mandatory) mandatoryByChapter.set(m.chapter ?? '', [...(mandatoryByChapter.get(m.chapter ?? '') ?? []), m]);
  const mandatoryGroups = [...mandatoryByChapter].sort(([a], [b]) => (chapters.get(a)?.position ?? 999) - (chapters.get(b)?.position ?? 999));

  const submit = async () => {
    try {
      const program = await createProgram.mutateAsync(patient['@id']);
      const wanted = program.modules.filter((pm) => chosen.includes(pm.module.id));
      const results = await Promise.allSettled(wanted.map((pm) => api(pm['@id'].replace(/^\/api/, ''), { method: 'PATCH', body: { selected: true } })));
      client.invalidateQueries({ queryKey: ['program', 'patient', patient['@id']] });
      client.invalidateQueries({ queryKey: ['programs'] });
      if (results.some((r) => r.status === 'rejected')) toast.warning('Parcours créé, mais certaines séances optionnelles n\'ont pas pu être ajoutées : utilisez « Sélection séances optionnelles ».');
      else toast.success('Parcours créé');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Création impossible');
    }
  };

  const row = (m: (typeof modules)[number], fixed: boolean) => (
    <label key={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${fixed ? 'bg-gray-50 text-gray-500' : 'bg-orange-50/60'}`}>
      <Checkbox
        checked={fixed || chosen.includes(m.id)}
        disabled={fixed || createProgram.isPending}
        onCheckedChange={(on) => setChosen((cur) => (on === true ? [...cur, m.id] : cur.filter((id) => id !== m.id)))}
      />
      <span className="flex-1">{m.title}</span>
      <span className="text-xs text-gray-400">{m.estimatedDuration} min</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl text-left">
        <DialogHeader>
          <DialogTitle>Créer le parcours</DialogTitle>
          <DialogDescription>Les séances systématiques sont incluses d'office. Cochez les séances optionnelles adaptées au profil du patient.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Un seul accordéon replié : on arrive directement sur les séances optionnelles */}
          <Accordion type="single" collapsible className="rounded-lg border border-gray-100 px-3">
            <AccordionItem value="mandatory" className="border-b-0">
              <AccordionTrigger className="py-3 text-gray-800 hover:no-underline font-semibold">
                <span className="flex-1 text-left">Séances systématiques ({mandatory.length}) · incluses d'office</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                {mandatoryGroups.map(([chapter, items]) => (
                  <div key={chapter || 'sans-chapitre'} className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">{chapters.get(chapter)?.title ?? 'Autres séances'}</p>
                    {items.map((m) => row(m, true))}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-800">Séances optionnelles ({chosen.length}/{optional.length})</h3>
            {optional.map((m) => row(m, false))}
            {optional.length === 0 && <p className="text-sm text-gray-500">Aucune séance optionnelle disponible.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createProgram.isPending}>Annuler</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={createProgram.isPending} onClick={submit}>
            {createProgram.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModuleGroup({
  title, items, patient, readOnly, canStart, onLaunch,
}: {
  title: string; items: ProgramModule[]; patient: Patient; readOnly: boolean; canStart: boolean; onLaunch: (moduleId: string) => void;
}) {
  const navigate = useNavigate();
  const toggle = useToggleProgramModule(patient['@id']);
  const selectedCount = items.filter((m) => m.selected).length;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="text-sm text-gray-500">{selectedCount}/{items.length} sélectionnée{selectedCount > 1 ? 's' : ''}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${item.selected ? 'bg-orange-50/60' : 'bg-gray-50'}`}>
            <Checkbox
              id={item.id}
              checked={item.selected}
              disabled={readOnly || toggle.isPending}
              onCheckedChange={(checked) =>
                toggle.mutate(
                  { selection: item, selected: checked === true },
                  { onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Modification impossible') },
                )
              }
            />
            <label htmlFor={item.id} className="flex-1 min-w-0 cursor-pointer">
              <p className={`text-sm font-medium ${item.selected ? 'text-gray-900' : 'text-gray-500'}`}>{item.module.title}</p>
              <p className="text-xs text-gray-400">
                <span className={item.module.mandatory ? 'text-blue-600' : 'text-violet-600'}>{sessionLabel(item.module.code)}</span>
                {' · '}<Clock className="w-3 h-3 inline mr-0.5" />{item.module.estimatedDuration} min
              </p>
            </label>
            <CourseStatusBadge item={item} />
            <div className="flex items-center gap-1.5">
              {item.status !== 'valide' && (
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500" aria-label="Prévisualiser"
                  title="Prévisualiser (sans démarrer de séance)"
                  onClick={() => navigate(`/sessions/run?moduleId=${item.module.id}&preview=1`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {item.selected && canStart && item.status !== 'valide' && (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1.5"
                  onClick={() => onLaunch(item.module.id)}
                >
                  <Play className="w-3 h-3" />
                  {item.status === 'non_termine' ? 'Reprendre' : 'Lancer'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CourseStatusBadge({ item }: { item: ProgramModule }) {
  if (item.status === 'valide') {
    return (
      <div className="text-right text-xs flex-shrink-0">
        <p className="font-semibold text-green-700 flex items-center gap-1 justify-end">
          <CheckCircle2 className="w-3.5 h-3.5" />Validée{item.score != null && ` · ${item.score}%`}
        </p>
        <p className="text-gray-400">{formatDate(item.validatedAt)}{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ''}</p>
      </div>
    );
  }
  if (item.status === 'non_termine') {
    return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs flex-shrink-0">Non terminée</Badge>;
  }

  return null;
}

/** Actions sur le parcours : clôture justifiée, validation par un cadre, reprise d'un parcours interrompu */
const CADRE_ONLY_MESSAGE = 'Seul un profil « Cadre de santé » peut valider définitivement le parcours d’EHD d’un patient.';

const CADRE_ONLY_CLOSE_MESSAGE = 'Seul un profil « Cadre de santé » peut clôturer le parcours d’EHD d’un patient.';

/** Bouton grisé réservé aux cadres : aria-disabled (et non disabled) pour rester cliquable et afficher le message au clic comme au survol */
function CadreOnlyButton({ message, className, children }: { message: string; className: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" aria-disabled className={`gap-1.5 opacity-50 cursor-not-allowed ${className}`} onClick={() => toast.info(message)}>{children}</Button>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ProgramActions({ program }: { program: TrainingProgram }) {
  const { isCadre } = useAuth();
  const action = useProgramAction();
  const { data: reasons } = useInterruptionReasons();
  const [interrupting, setInterrupting] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [reopening, setReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const run = (kind: 'complete' | 'interrupt' | 'resume' | 'reopen', body: unknown, success: string) =>
    action.mutateAsync({ programId: program.id, action: kind, body }).then(
      () => toast.success(success),
      (err) => toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Action impossible'),
    );

  const reasonLabel = (iri: string) => reasons?.member.find((r) => r['@id'] === iri)?.label;

  if (program.status === 'acheve') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1">
          <strong>Parcours achevé</strong>
          {program.validatedBy && <> — validé par {program.validatedBy.firstName} {program.validatedBy.lastName}</>} le {formatDate(program.completedAt)}.
          Il n'est plus modifiable{isCadre && <> sauf si vous annulez la validation</>}.
        </p>
        {isCadre && (
          <>
            <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => setReopening(true)}>
              <RotateCcw className="w-4 h-4" />Annuler la validation
            </Button>
            <Dialog open={reopening} onOpenChange={(open) => { setReopening(open); if (!open) setReopenReason(''); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Annuler la validation du parcours ?</DialogTitle>
                  <DialogDescription>
                    Le parcours redeviendra « en cours ». Les cours déjà validés restent verrouillés. L'annulation est tracée (qui, quand, motif).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="reopen-reason">Motif (obligatoire)</Label>
                  <Textarea id="reopen-reason" rows={3} maxLength={500} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReopening(false)}>Retour</Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={reopenReason.trim() === '' || action.isPending}
                    onClick={() => run('reopen', { reason: reopenReason.trim() }, 'Validation annulée').then(() => setReopening(false))}
                  >
                    Annuler la validation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    );
  }

  if (program.status === 'interrompu') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <CirclePause className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p><strong>Parcours interrompu</strong> le {formatDate(program.interruptedAt)} : {program.interruptionReasons.map(reasonLabel).filter(Boolean).join(', ')}.</p>
          {program.interruptionNotes && <p className="mt-1 italic">« {program.interruptionNotes} »</p>}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 bg-white" disabled={action.isPending} onClick={() => run('resume', {}, 'Parcours repris')}>
          <RotateCcw className="w-4 h-4" />Reprendre
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {program.status === 'actif' && (isCadre ? (
        <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" disabled={program.validatedCount === 0} onClick={() => setConfirmComplete(true)}>
          <CheckCircle2 className="w-4 h-4" />Valider le parcours
        </Button>
      ) : (
        <CadreOnlyButton message={CADRE_ONLY_MESSAGE} className="bg-green-600 text-white hover:bg-green-600"><CheckCircle2 className="w-4 h-4" />Valider le parcours</CadreOnlyButton>
      ))}
      {isCadre ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInterrupting(true)}>
          <CirclePause className="w-4 h-4" />Clôturer le parcours
        </Button>
      ) : (
        <CadreOnlyButton message={CADRE_ONLY_CLOSE_MESSAGE} className="border border-input bg-background hover:bg-background"><CirclePause className="w-4 h-4" />Clôturer le parcours</CadreOnlyButton>
      )}

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider le parcours d'entraînement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {program.validatedCount}/{program.selectedCount} séances validées. Le parcours passera « achevé » et ne sera plus modifiable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => run('complete', {}, 'Parcours validé')}>Valider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={interrupting} onOpenChange={setInterrupting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer le parcours</DialogTitle>
            <DialogDescription>Le parcours sera interrompu avant son terme. Indiquez au moins un motif.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {reasons?.member.filter((r) => r.active).map((reason) => (
              <div key={reason.id} className="flex flex-wrap items-center gap-2">
                <Checkbox
                  id={`ir-${reason.id}`}
                  checked={checked.includes(reason.id)}
                  onCheckedChange={(c) => setChecked((cur) => (c === true ? [...cur, reason.id] : cur.filter((id) => id !== reason.id)))}
                />
                <label htmlFor={`ir-${reason.id}`} className="text-sm cursor-pointer">{reason.label}</label>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ir-notes">Précisions (facultatif)</Label>
            <Textarea id="ir-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterrupting(false)}>Annuler</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={checked.length === 0 || action.isPending}
              onClick={() => run('interrupt', { reasons: checked, notes: notes || null }, 'Parcours interrompu').then(() => setInterrupting(false))}
            >
              Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Rappel à l'ouverture de la fiche (cahier des charges §4) : cours débutés mais non validés.
 * Un seul : proposition de le reprendre. Plusieurs : avertissement, puis proposition du dernier.
 */
function ResumePrompt({ patient, program }: { patient: Patient; program: TrainingProgram }) {
  const navigate = useNavigate();
  const storageKey = `resume-prompt:${patient.id}`;
  const unfinished = program.modules
    .filter((m) => m.selected && m.status === 'non_termine')
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  const eligible = (program.status === 'actif' || program.status === 'non_actif') && unfinished.length > 0;
  const [step, setStep] = useState<'list' | 'last' | 'closed'>(() => {
    try {
      if (sessionStorage.getItem(storageKey)) return 'closed';
    } catch {
      // stockage indisponible : on affiche le rappel
    }
    return unfinished.length > 1 ? 'list' : 'last';
  });

  const close = () => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // stockage indisponible
    }
    setStep('closed');
  };

  if (!eligible || step === 'closed') return null;
  const last = unfinished[0];

  return (
    <AlertDialog open onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        {step === 'list' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{unfinished.length} cours n'ont pas été achevés</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {unfinished.map((m) => <li key={m.id}>{sessionLabel(m.module.code)} — {m.module.title}</li>)}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={close}>Fermer</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); setStep('last'); }}>Continuer</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Reprendre le cours interrompu ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le cours « {last.module.title} » a été interrompu {last.startedAt ? `le ${formatDate(last.startedAt, "d MMMM 'à' HH:mm")}` : ''}.
                Il reprendra depuis le début.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={close}>Non</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => { close(); navigate(`/sessions/run?patientId=${patient.id}&moduleId=${last.module.id}&programId=${program.id}`); }}
              >
                Oui, reprendre
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─── Test CODEX ───────────────────────────────────────────────────────── */

function CodexSection({ patient }: { patient: Patient }) {
  const navigate = useNavigate();
  const { data } = useCodexTests(patient['@id']);
  const tests = data?.member ?? [];

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardHeader className="flex-col gap-3 lg:flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Test CODEX</CardTitle>
          <p className="text-sm text-gray-500 mt-1">3 mots à mémoriser, horloge à dessiner, rappel des mots et orientation si nécessaire.</p>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Un bouton désactivé ne reçoit pas le survol : c'est l'enveloppe qui porte l'info-bulle */}
              <span tabIndex={tests.length > 0 ? 0 : undefined}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" disabled={tests.length > 0} onClick={() => navigate(`/patients/${patient.id}/codex`)}>
                  <Play className="w-4 h-4" />Faire passer le test
                </Button>
              </span>
            </TooltipTrigger>
            {tests.length > 0 && <TooltipContent>Le test CODEX a déjà été passé : il ne peut l’être qu’une seule fois.</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun test réalisé.</p>
        ) : (
          <div className="space-y-2">
            {tests.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-gray-50 text-sm">
                <Badge variant="secondary" className={t.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{t.clockChecks ? (t.passed ? 'Normal' : 'Anormal') : (t.passed ? 'Réussi (ancien protocole)' : 'Échec (ancien protocole)')}</Badge>
                <span className="text-gray-600">Horloge ({t.clockTime}) : {t.clockTestPassed ? '✓' : '✗'} · Mots ({t.words.join(', ')}) : {t.wordRecallPassed ? '✓' : '✗'}{t.orientationScore != null && ` · Orientation : ${t.orientationScore}/5`}{t.nephrologistReviewRequired && <strong className="block text-red-700 mt-1">CODEX anormal — résultat à transmettre au néphrologue par l’IDE.</strong>}</span>
                <span className="ml-auto text-xs text-gray-400">{formatDate(t.createdAt, "d MMM yyyy 'à' HH:mm")} · {t.nurse.firstName} {t.nurse.lastName}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Rappel du profil patient sur la page de sélection des séances (cahier des charges §2) */
function CodexSummary({ patient }: { patient: Patient }) {
  const { data } = useCodexTests(patient['@id']);
  const last = data?.member[0];

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white ring-1 ring-gray-100 text-sm">
      <ShieldCheck className="w-4 h-4 text-gray-400" />
      <span className="text-gray-500">Test CODEX :</span>
      {last ? (
        <span className={last.passed ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
          {last.clockChecks ? (last.passed ? 'normal' : 'anormal') : (last.passed ? 'réussi (ancien protocole)' : 'échec (ancien protocole)')} le {formatDate(last.createdAt)} (horloge {last.clockTestPassed ? '✓' : '✗'}, mots {last.wordRecallPassed ? '✓' : '✗'})
        </span>
      ) : (
        <span className="text-amber-700">non réalisé</span>
      )}
    </div>
  );
}

/* ─── Éligibilité ──────────────────────────────────────────────────────── */

function EligibilitySection({ patient }: { patient: Patient }) {
  const { data: reasons } = useEligibilityReasons();
  const { data: codex } = useCodexTests(patient['@id']);
  const updatePatient = useUpdatePatient(patient.id);
  // « Éligible » n'est proposé qu'après le test CODEX (un patient déjà éligible garde son statut)
  const codexDone = (codex?.member.length ?? 0) > 0;
  const statuses = Object.entries(ELIGIBILITY_LABELS).filter(([value]) => value !== 'eligible' || codexDone || patient.eligibilityStatus === 'eligible');
  const [status, setStatus] = useState<EligibilityStatus>(patient.eligibilityStatus);
  const [selectedReasons, setSelectedReasons] = useState<string[]>(patient.eligibilityReasons);
  const [notes, setNotes] = useState(patient.eligibilityNotes ?? '');

  const toggleReason = (iri: string, checked: boolean) =>
    setSelectedReasons((current) => (checked ? [...current, iri] : current.filter((r) => r !== iri)));

  const save = async () => {
    try {
      await updatePatient.mutateAsync({
        eligibilityStatus: status,
        // Les motifs ne concernent que la non-éligibilité
        eligibilityReasons: status === 'non_eligible' ? selectedReasons : [],
        eligibilityNotes: status === 'non_eligible' ? notes || null : null,
      });
      toast.success('Éligibilité enregistrée');
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Enregistrement impossible');
    }
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardHeader>
        <CardTitle className="text-base">Éligibilité au parcours d'entraînement</CardTitle>
        <p className="text-sm text-gray-500">À statuer après le questionnaire profil et le test CODEX.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5 max-w-xs">
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as EligibilityStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {!codexDone && patient.eligibilityStatus !== 'eligible' && <p className="text-xs text-gray-400">« Éligible » sera proposé une fois le test CODEX passé.</p>}
        </div>

        {status === 'non_eligible' && (
          <div className="space-y-4 p-4 rounded-xl bg-red-50/50 border border-red-100">
            <div className="space-y-2">
              <Label>Motifs (au moins un)</Label>
              {reasons?.member.filter((r) => r.active).map((reason) => (
                <div key={reason.id} className="flex flex-wrap items-center gap-2">
                  <Checkbox
                    id={reason.id}
                    checked={selectedReasons.includes(reason['@id'])}
                    onCheckedChange={(checked) => toggleReason(reason['@id'], checked === true)}
                  />
                  <label htmlFor={reason.id} className="text-sm text-gray-700 cursor-pointer">{reason.label}</label>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="elig-notes">Précisions (facultatif)</Label>
              <Textarea id="elig-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white" />
            </div>
          </div>
        )}

        <Button onClick={save} disabled={updatePatient.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
          {updatePatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Historique des séances ───────────────────────────────────────────── */

function SessionHistory({ patientIri }: { patientIri: string }) {
  const { data, isLoading } = useSessions({ patient: patientIri });
  const sessions = data?.member ?? [];

  if (isLoading) return <div className="flex justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (sessions.length === 0) {
    return <EmptyState icon={<Activity className="w-8 h-8" />} title="Aucune séance">Les séances réalisées apparaîtront ici.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id} className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-orange-600" /></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{session.module.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.startedAt, "d MMMM yyyy 'à' HH:mm")} · {session.nurse.firstName} {session.nurse.lastName}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-gray-900">{session.score != null ? `${session.score}%` : '—'}</p>
              <p className="text-xs text-gray-400">{session.status === 'validee' ? 'Validée' : session.status === 'interrompue' ? 'Interrompue' : 'En cours'}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="flex justify-center mb-3 opacity-40">{icon}</div>
      <p className="font-medium text-gray-600">{title}</p>
      <div className="text-sm mt-1 max-w-md mx-auto">{children}</div>
    </div>
  );
}
