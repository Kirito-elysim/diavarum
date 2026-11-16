import { useState, type ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { BarChart3, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, Clock, Folder, ListChecks, Lock, Play, User } from 'lucide-react';
import { toast } from 'sonner';
import { useSessions, useToggleProgramModule } from '../api/hooks';
import type { Patient, ProgramModule, TrainingProgram, TrainingSession } from '../api/types';
import { api, ApiError } from '../lib/api';
import { formatDate, formatDuration, sessionLabel } from '../lib/format';
import { useCourseLaunch } from './CourseLaunchConfirmation';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

type Filter = 'all' | 'todo' | 'started' | 'validated';
const matches = (item: ProgramModule, filter: Filter) => filter === 'all' || item.status === ({todo: 'non_demarre', started: 'non_termine', validated: 'valide'} as const)[filter];

function useProgramSessions(patient: Patient, program: TrainingProgram) {
  const query = useSessions({patient: patient['@id']});
  const sessions = (query.data?.member ?? []).filter(s => s.program === program['@id'] && s.status === 'validee');
  const latest = new Map<string, TrainingSession>();
  for (const session of sessions) {
    const previous = latest.get(session.module.id);
    if (!previous || (session.completedAt ?? '') > (previous.completedAt ?? '')) latest.set(session.module.id, session);
  }
  return {...query, latest};
}

function CompetencyList({ session }: { session: TrainingSession }) {
  const validations = session.competencyValidations ?? [];
  const queries = useQueries({ queries: validations.map(v => ({
    queryKey: ['competency', v.competency],
    queryFn: () => api<{label: string}>(v.competency.replace(/^\/api/, '')),
    staleTime: 60_000,
  })) });
  if (!validations.length) return <p className="text-sm text-gray-500">Aucune compétence renseignée.</p>;
  return <div className="space-y-1 text-sm">
    <span className="inline-block rounded-full bg-green-100 px-3 py-0.5 font-medium text-green-800">Compétences validées ({validations.filter(v => v.validated).length}/{validations.length})</span>
    {validations.map((v, index) => <div key={v.id} className="flex items-start gap-2">
      {v.validated ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> : <span className="text-gray-400">—</span>}
      <span>{queries[index].data?.label ?? (queries[index].isError ? 'Libellé indisponible' : 'Chargement…')}{!v.validated && <span className="text-gray-500"> · Non validée</span>}</span>
    </div>)}
  </div>;
}

export function PatientCompetencies({patient, program}: {patient: Patient; program: TrainingProgram}) {
  const {latest, isLoading, isError, refetch} = useProgramSessions(patient, program);
  return <section className="space-y-4"><h2 className="text-2xl font-bold">Compétences</h2><p className="text-sm text-gray-500">Compétences évaluées lors des séances validées de ce parcours.</p>
    {isLoading ? <p>Chargement des compétences…</p> : isError ? <Button variant="outline" onClick={() => refetch()}>Réessayer le chargement des compétences</Button> : latest.size === 0 ? <p className="rounded-xl border bg-white p-6 text-gray-500">Aucune séance validée pour ce parcours.</p> : [...latest.values()].map(session => <article key={session.id} className="space-y-3 rounded-xl border bg-white p-5"><h3 className="font-semibold">{session.module.title}</h3><p className="text-sm text-gray-500">{session.nurse.firstName} {session.nurse.lastName} · {formatDate(session.completedAt, 'dd/MM/yyyy à HH:mm')}</p><CompetencyList session={session}/></article>)}
  </section>;
}


/** Popup de choix des séances optionnelles du parcours (les systématiques sont déjà cochées) */
function OptionalDialog({patient, program, open, onOpenChange}: {patient: Patient; program: TrainingProgram; open: boolean; onOpenChange: (open: boolean) => void}) {
  const toggle = useToggleProgramModule(patient['@id']);
  const locked = program.status === 'acheve' || !!patient.removedAt;
  const themes = new Map<string, {title: string; items: ProgramModule[]}>();
  for (const item of program.modules.filter(m => !m.module.mandatory)) {
    const key = item.module.chapter?.id ?? 'other';
    const theme = themes.get(key) ?? {title: item.module.chapter?.title ?? 'Autres séances', items: []};
    theme.items.push(item); themes.set(key, theme);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>Séances optionnelles</DialogTitle><DialogDescription>Cochez celles adaptées au profil du patient. Elles s'ajoutent à son parcours. Une séance validée reste verrouillée.</DialogDescription></DialogHeader>
    <div className="space-y-3">
      {[...themes.values()].map(theme => <div key={theme.title} className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-800">{theme.title}</h3>
        {theme.items.map(item => <label key={item.id} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm">
          <Checkbox checked={item.selected} disabled={locked || item.status === 'valide' || toggle.isPending}
            onCheckedChange={checked => toggle.mutate({selection: item, selected: checked === true}, {onError: err => toast.error(err instanceof ApiError ? err.message : 'Modification impossible')})}/>
          <span className="flex-1">{item.module.title}</span>
          <span className="text-xs text-slate-400">{item.module.estimatedDuration} min</span>
          {item.status === 'valide' && <Lock className="h-3.5 w-3.5 text-gray-400"/>}
        </label>)}
      </div>)}
      {themes.size === 0 && <p className="text-sm text-slate-500">Aucune séance optionnelle dans ce parcours.</p>}
    </div>
    <DialogFooter><Button onClick={() => onOpenChange(false)}>Terminer</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export function PatientProgramBis({patient, program, actions}: {patient: Patient; program: TrainingProgram; actions: ReactNode}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState('position');
  const [choosing, setChoosing] = useState(false);
  const {launch} = useCourseLaunch(patient.id, program);
  const {latest, isLoading, isError, refetch} = useProgramSessions(patient, program);
  const selected = program.modules.filter(m => m.selected);
  const validated = selected.filter(m => m.status === 'valide').length;
  const started = selected.filter(m => m.status === 'non_termine').length;
  const todo = selected.length - validated - started;
  const percent = selected.length ? Math.round(validated / selected.length * 100) : 0;
  const groups = new Map<string, {title: string; items: ProgramModule[]}>();
  for (const item of [...selected].sort((a,b) => sort === 'title' ? a.module.title.localeCompare(b.module.title, 'fr') : a.position - b.position)) {
    const key = item.module.chapter?.id ?? 'other';
    const group = groups.get(key) ?? {title: item.module.chapter?.title ?? 'Autres séances', items: []};
    group.items.push(item); groups.set(key, group);
  }
  const optional = program.modules.filter(m => !m.module.mandatory);
  const noOptionalSelected = optional.length > 0 && !optional.some(m => m.selected);
  const chapterAverage = (key: string) => {
    const scores = program.modules.filter(m => (m.module.chapter?.id ?? 'other') === key && m.module.code !== 'PT' && m.status === 'valide' && m.score != null).map(m => m.score as number);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  };
  const canStart = !patient.removedAt && patient.eligibilityStatus === 'eligible' && ['actif', 'non_actif'].includes(program.status);
  const filters = [{key:'todo', label:'À réaliser', count:todo, icon:Clock}, {key:'started', label:'En cours', count:started, icon:Play}, {key:'validated', label:'Validés', count:validated, icon:CheckCircle2}, {key:'all', label:'Tous', count:selected.length, icon:BookOpen}] as const;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-950">Parcours de formation</h2><p className="mt-1 text-sm text-slate-500">Suivi des modules, validation des compétences et historique des séances.</p></div><fieldset disabled={!!patient.removedAt}>{actions}</fieldset></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{background:`conic-gradient(#ff6200 ${percent}%, #fff0e8 0)`}}><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold">{percent}%</div></div><div><p className="font-semibold">Progression globale</p><p className="text-sm text-slate-600">{validated} / {selected.length} séances validées</p></div></div>
      {[{label:'Modules validés', value:validated, icon:BookOpen, color:'bg-green-50 text-green-600'}, {label:'Modules en cours',value:started,icon:Play,color:'bg-blue-50 text-blue-600'}, {label:'Modules à réaliser',value:todo,icon:Clock,color:'bg-orange-50 text-orange-600'}].map(kpi => <div key={kpi.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"><div className={`rounded-full p-3 ${kpi.color}`}><kpi.icon className="h-7 w-7"/></div><div><p className="text-2xl font-bold">{kpi.value}</p><p className="text-sm text-slate-600">{kpi.label}</p></div></div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1" role="group" aria-label="Filtrer les modules">{filters.map(f => <Button key={f.key} variant="ghost" size="sm" aria-pressed={filter === f.key} className={`gap-2 ${filter === f.key ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' : ''}`} onClick={() => setFilter(f.key)}><f.icon className="h-4 w-4"/>{f.label} ({f.count})</Button>)}</div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="gap-2" onClick={() => setChoosing(true)}><ListChecks className="h-4 w-4"/>Sélection séances optionnelles ({optional.filter(m => m.selected).length}/{optional.length})</Button><label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">Trier par :<select aria-label="Trier les modules" className="min-w-0 bg-transparent" value={sort} onChange={e => setSort(e.target.value)}><option value="position">Ordre du parcours</option><option value="title">Nom du module</option></select></label></div></div>
    {noOptionalSelected && program.status !== 'acheve' && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Aucune séance optionnelle sélectionnée. Ce n’est pas obligatoire, mais vérifiez si l’une d’elles est adaptée au profil du patient.</p>}
    <OptionalDialog patient={patient} program={program} open={choosing} onOpenChange={setChoosing}/>
    {isError && <div className="text-sm text-amber-700">Les détails des validations n’ont pas pu être chargés. <button className="underline" onClick={() => refetch()}>Réessayer</button></div>}
    {selected.filter(m => matches(m, filter)).length === 0 && <p className="rounded-xl border bg-white p-6 text-gray-500">Aucun module dans cette catégorie.{selected.length === 0 && ' Utilisez « Sélection séances optionnelles » pour ajouter des séances.'}</p>}
    <div className="space-y-3">{[...groups].map(([key, group]) => {
      const visible = group.items.filter(m => matches(m, filter));
      if (!visible.length) return null;
      const count = group.items.filter(m => m.status === 'valide').length;
      return <details key={key} open className="group rounded-xl border border-slate-200 bg-white px-3"><summary className="flex cursor-pointer list-none items-center gap-3 py-3 font-semibold"><Folder className="h-5 w-5 shrink-0 text-orange-600"/><span className="flex-1">{group.title}<span className="ml-3 text-xs font-medium text-slate-500">Moyenne : {chapterAverage(key) !== null ? `${chapterAverage(key)} %` : '—'}</span></span><span className={`rounded-full px-3 py-1 text-xs font-medium ${count ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{count} / {group.items.length} validés</span><ChevronDown className="h-4 w-4 shrink-0 group-open:rotate-180"/></summary><div className="space-y-2 pb-3">{visible.map(item => {
        const session = latest.get(item.module.id);
        return <article key={item.id} className="grid items-center gap-4 rounded-xl bg-stone-50/80 p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex items-center gap-3">{item.status === 'valide' ? <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600"/> : <Play className="h-6 w-6 shrink-0 text-orange-500"/>}<div><h3 className="text-sm font-semibold leading-snug">{item.module.title}</h3><p className="mt-1 text-xs text-slate-500">{sessionLabel(item.module.code)} · {item.module.estimatedDuration} min</p>{item.status === 'non_termine' && <p className="mt-1 text-xs text-orange-600">Séance non terminée · reprise depuis le début</p>}</div></div>
          {item.status === 'valide' ? <><div className="space-y-1 text-xs text-slate-600"><p className="flex items-center gap-2"><User className="h-4 w-4"/>{session ? `Validé par ${session.nurse.firstName} ${session.nurse.lastName}` : isLoading ? 'Chargement…' : 'Validation enregistrée'}</p><p className="flex items-center gap-2"><Calendar className="h-4 w-4"/>{formatDate(item.validatedAt, 'dd/MM/yyyy à HH:mm')}</p><p className="flex items-center gap-2"><Clock className="h-4 w-4"/>Temps passé : {item.durationSeconds != null ? formatDuration(item.durationSeconds) : 'Non renseigné'}</p><p className="flex items-center gap-2 font-semibold text-slate-800"><BarChart3 className="h-4 w-4"/>Score : {item.score != null ? `${item.score} %` : 'Non renseigné'}</p></div><div>{session ? <CompetencyList session={session}/> : <p className="text-xs text-slate-500">Détail des compétences {isLoading ? 'en cours de chargement' : 'indisponible'}.</p>}<p className="mt-2 flex items-center gap-1 text-xs text-gray-400"><Lock className="h-3 w-3"/>Séance validée et verrouillée</p></div></> : <div className="flex flex-wrap justify-end gap-2 lg:col-span-2">{canStart && <Button size="sm" className="gap-2 bg-orange-500 text-white hover:bg-orange-600" onClick={() => launch(item.module.id)}><Play className="h-4 w-4"/>{item.status === 'non_termine' ? 'Reprendre' : 'Lancer'}</Button>}</div>}
        </article>;
      })}</div></details>;
    })}</div>
    <p className="text-xs text-slate-500">Indicateurs calculés sur les {selected.length} modules sélectionnés. « En cours » inclut les séances interrompues non validées.</p>
  </section>;
}
