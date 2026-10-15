import { CoursePageHeading } from '../components/CoursePageHeading';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getModuleContent, useImportModuleContent } from '../api/hooks';
import type { ModuleContent } from '../api/types';
import type { ModulePage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Field, ItemActions, Toggle } from '../components/course-editor/Fields';
import { BlockFields } from '../components/course-editor/BlockFields';
import { TabletPreview } from '../components/course-editor/TabletPreview';
import { activities, blockLabel, move, newBlock, newPage, uid, validateCourse } from '../components/course-editor/model';

const PreviewBlock = lazy(() => import('./TrainingSessionPage').then(module => ({ default: module.BlockCard })));

export default function CourseEditorPage() {
  const { code } = useParams<{ code: string }>();
  const query = useQuery({ queryKey: ['content-editor', code], queryFn: () => getModuleContent(code!), enabled: !!code });
  if (query.isLoading) return <p className="p-8">Chargement du cours…</p>;
  if (!query.data) return <div className="space-y-4"><p role="alert">Le cours n’a pas pu être chargé.</p><Button onClick={() => query.refetch()}>Réessayer</Button><Link to="/modules">Retour aux cours</Link></div>;
  return <Editor key={code} initial={query.data} />;
}

function Editor({ initial }: { initial: ModuleContent }) {
  const { user } = useAuth();
  const draftKey = `diaverum:course-draft:v1:${user?.id}:${initial.code}`;
  const [course, setCourse] = useState<ModuleContent>(() => structuredClone(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [recovery, setRecovery] = useState<ModuleContent | null>(() => {
    try { const stored = JSON.parse(localStorage.getItem(draftKey) ?? 'null'); return stored?.code === initial.code && Array.isArray(stored.content) && Array.isArray(stored.competencies) && JSON.stringify(stored) !== JSON.stringify(initial) ? stored : null; } catch { return null; }
  });
  const [draftError, setDraftError] = useState(false);
  const [selected, setSelected] = useState<string | null>(initial.content[0]?.id ?? null);
  const [preview, setPreview] = useState(false);
  const [tabletPreview, setTabletPreview] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [removePage, setRemovePage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [history, setHistory] = useState<ModuleContent[]>([]);
  const mutation = useImportModuleContent();
  const serialized = JSON.stringify(course);
  const dirty = serialized !== saved;
  const blocker = useBlocker(dirty);
  const pageIndex = course.content.findIndex(p => p.id === selected);
  const page = course.content[pageIndex];

  useEffect(() => {
    if (recovery) return;
    if (!dirty) { try { localStorage.removeItem(draftKey); } catch { /* Aucune modification à conserver. */ } return; }
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(draftKey, serialized); setDraftError(false); } catch { setDraftError(true); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [serialized, dirty, draftKey, recovery]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { try { localStorage.setItem(draftKey, serialized); } catch { /* Le navigateur demande confirmation. */ } event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, draftKey, serialized]);
  function change(next: ModuleContent) {
    setHistory(previous => [...previous.slice(-29), course]);
    setCourse(next);
    setErrors([]);
  }
  const updatePage = (next: ModulePage) => change({ ...course, content: course.content.map(p => p.id === next.id ? next : p) });
  function addPage() { const p = newPage(); change({ ...course, content: [...course.content, p] }); setSelected(p.id); }
  async function save() {
    try {
      const result = await mutation.mutateAsync(course);
      setCourse(result); setSaved(JSON.stringify(result)); setHistory([]); setConfirmSave(false);
      try { localStorage.removeItem(draftKey); } catch { /* Le contenu est enregistré sur le serveur. */ }
      toast.success(result.published ? 'Cours enregistré et publié' : 'Cours enregistré, non publié');
    } catch (error) { setConfirmSave(false); setErrors([error instanceof Error ? error.message : 'Enregistrement impossible. Votre brouillon est conservé.']); }
  }
  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-900/15 pb-5">
      <div><Link to="/modules" className="text-sm text-emerald-800 underline">Tous les cours</Link><p className="mt-4 text-xs font-bold tracking-widest text-orange-700">ATELIER PÉDAGOGIQUE · {course.code}</p><h1 className="mt-1 text-2xl font-bold text-emerald-950">{course.title || 'Votre cours'}</h1><p className="mt-2 text-sm text-gray-500">{course.content.length} écrans · {dirty ? 'Modifications non enregistrées sur le serveur' : 'Version enregistrée'}</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!history.length || mutation.isPending} onClick={() => { const previous = history.at(-1); if (previous) { setCourse(previous); setHistory(h => h.slice(0, -1)); setErrors([]); if (!previous.content.some(p => p.id === selected)) setSelected(previous.content[0]?.id ?? null); } }}>Annuler la dernière modification</Button>
        <Button variant="outline" disabled={!course.content.length} onClick={() => setPreview(true)}>Aperçu apprenant</Button>
        <Button variant="outline" disabled={!course.content.length} onClick={() => setTabletPreview(true)}>Aperçu sur tablette</Button>
        <Button disabled={mutation.isPending || !!recovery} className="bg-orange-600 hover:bg-orange-700" onClick={() => { const issues = validateCourse(course); setErrors(issues); if (!issues.length) setConfirmSave(true); }}>Enregistrer le cours</Button>
      </div>
    </header>
    {recovery && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3"><p>Un brouillon non enregistré existe sur cet appareil. Souhaitez-vous le reprendre ?</p><div className="flex gap-3"><Button onClick={() => { setCourse(recovery); setSelected(recovery.content[0]?.id ?? null); setRecovery(null); }}>Reprendre le brouillon</Button><Button variant="outline" onClick={() => { localStorage.removeItem(draftKey); setRecovery(null); }}>Utiliser la version enregistrée</Button></div></div>}
    {draftError && <p role="alert" className="rounded-xl bg-amber-50 p-4">La sauvegarde du brouillon sur cet appareil est indisponible. Gardez cette page ouverte jusqu’à l’enregistrement du cours.</p>}
    {dirty && !draftError && !recovery && <p className="text-sm text-gray-500">Le brouillon est conservé sur cet appareil. Utilisez « Enregistrer le cours » pour le retrouver sur les autres appareils.</p>}
    {errors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"><p className="font-semibold">À compléter avant l’enregistrement</p><ul className="mt-2 list-disc pl-5 space-y-1">{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
    <fieldset disabled={mutation.isPending || !!recovery} className="min-w-0 space-y-6">
      <details className="rounded-2xl border bg-white p-5" open={course.content.length === 0}>
        <summary className="cursor-pointer font-semibold text-emerald-950">Informations du cours et compétences IDE</summary>
        <div className="mt-5 space-y-4">
          <Field label="Titre du cours" value={course.title} onChange={title => change({ ...course, title })} />
          <Field label="Description" multiline value={course.description} onChange={description => change({ ...course, description })} />
          <label className="block space-y-2"><span className="text-sm font-medium">Durée indicative (minutes)</span><input type="number" min={5} max={120} className="block w-32 rounded-lg border p-3" value={course.estimatedDuration} onChange={e => change({ ...course, estimatedDuration: Number(e.target.value) })} /></label>
          <Toggle label="Cours publié et accessible aux IDE" checked={course.published} onChange={published => change({ ...course, published })} />
          <h2 className="pt-3 font-semibold">Compétences évaluées par l’IDE</h2>
          {course.competencies.map((label, index) => <div key={index} className="flex items-end gap-2"><div className="flex-1"><Field label={`Compétence ${index + 1}`} value={label} onChange={value => change({ ...course, competencies: course.competencies.map((c, i) => i === index ? value : c) })} /></div><Button variant="ghost" onClick={() => change({ ...course, competencies: course.competencies.filter((_, i) => i !== index) })}>Retirer</Button></div>)}
          <Button variant="outline" disabled={course.competencies.length >= 5} onClick={() => change({ ...course, competencies: [...course.competencies, ''] })}>Ajouter une compétence</Button><p className="text-xs text-gray-500">5 compétences maximum. Une compétence déjà évaluée ne peut pas être supprimée.</p>
        </div>
      </details>
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3"><h2 className="font-semibold text-emerald-950">Déroulé du cours</h2><div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:max-h-[70vh] xl:overflow-y-auto">
          {course.content.map((p, i) => <button key={p.id} aria-current={p.id === selected ? 'step' : undefined} onClick={() => setSelected(p.id)} className={`flex shrink-0 items-start gap-3 rounded-xl border p-3 text-left w-56 xl:w-full ${p.id === selected ? 'bg-emerald-950 border-emerald-950 text-white' : 'bg-white text-gray-700'}`}><span className="font-bold text-orange-500">{String(i + 1).padStart(2, '0')}</span><span className="min-w-0 break-words"><span className="block text-sm font-medium">{p.title || 'Sans titre'}</span><span className="text-xs opacity-60">{p.blocks.length} activités</span></span></button>)}
        </div><Button variant="outline" className="w-full" onClick={addPage}>Ajouter un écran</Button></aside>
        <main className="min-w-0 space-y-5">
          {!page ? <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">Composez votre premier écran</h2><p className="my-3 text-sm text-gray-500">Ajoutez un écran, puis les textes et activités qui le composent.</p><Button onClick={addPage}>Créer le premier écran</Button></div> : <>
            <section className="rounded-2xl border bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-emerald-950">Écran {pageIndex + 1}</h2><div className="flex flex-wrap gap-2"><ItemActions index={pageIndex} count={course.content.length} onMove={direction => change({ ...course, content: move(course.content, pageIndex, direction) })} onRemove={() => setRemovePage(page.id)} /><Button variant="outline" onClick={() => { const copy = { ...structuredClone(page), id: uid(), title: `${page.title} (copie)`, blocks: page.blocks.map(b => ({ ...structuredClone(b), id: uid() })) }; const content = [...course.content]; content.splice(pageIndex + 1, 0, copy); change({ ...course, content }); setSelected(copy.id); }}>Dupliquer l’écran</Button></div></div>
              <Field label="Titre de l’écran" value={page.title} onChange={title => updatePage({ ...page, title })} />
              <Field label="Consigne à l’apprenant" multiline value={page.instruction} onChange={instruction => updatePage({ ...page, instruction })} />
            </section>
            {page.blocks.map((block, index) => <section key={block.id} className="rounded-2xl border bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{index + 1}. {blockLabel(block)}</h3><ItemActions index={index} count={page.blocks.length} onMove={direction => updatePage({ ...page, blocks: move(page.blocks, index, direction) })} onRemove={() => updatePage({ ...page, blocks: page.blocks.filter(b => b.id !== block.id) })} /></div>
              <BlockFields block={block} onChange={next => updatePage({ ...page, blocks: page.blocks.map(b => b.id === block.id ? next : b) })} />
            </section>)}
            <section className="rounded-2xl border border-dashed border-emerald-900/30 p-5"><h3 className="font-semibold text-emerald-950 mb-4">Ajouter à cet écran</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{activities.map(([type, label]) => <Button key={type} variant="outline" className="h-auto min-h-12 whitespace-normal bg-white" onClick={() => updatePage({ ...page, blocks: [...page.blocks, newBlock(type)] })}>{label}</Button>)}</div></section>
          </>}
        </main>
      </div>
    </fieldset>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Aperçu apprenant</DialogTitle><DialogDescription>Essayez les activités du brouillon. Aucun résultat patient n’est enregistré.</DialogDescription></DialogHeader>{preview && <Preview pages={course.content} start={Math.max(0, pageIndex)} />}</DialogContent></Dialog>
    <Dialog open={tabletPreview} onOpenChange={setTabletPreview}><DialogContent className="max-w-7xl"><DialogHeader><DialogTitle>Aperçu sur tablette</DialogTitle><DialogDescription>Visualisez le cours sur la tablette proposée, en paysage ou en portrait.</DialogDescription></DialogHeader>{tabletPreview && <TabletPreview pages={course.content} start={Math.max(0, pageIndex)} />}</DialogContent></Dialog>
    <Dialog open={confirmSave} onOpenChange={open => { if (!mutation.isPending) setConfirmSave(open); }}><DialogContent><DialogHeader><DialogTitle>{course.published ? 'Publier les modifications ?' : 'Enregistrer sans publier ?'}</DialogTitle><DialogDescription>{course.published ? 'La version enregistrée sera remplacée et disponible pour les IDE.' : 'Le contenu sera enregistré, mais ce cours ne sera pas accessible aux IDE.'}</DialogDescription></DialogHeader><div className="flex gap-3"><Button disabled={mutation.isPending} onClick={save}>{mutation.isPending ? 'Enregistrement…' : 'Confirmer l’enregistrement'}</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => setConfirmSave(false)}>Continuer la rédaction</Button></div></DialogContent></Dialog>
    <Dialog open={!!removePage} onOpenChange={open => { if (!open) setRemovePage(null); }}><DialogContent><DialogHeader><DialogTitle>Retirer cet écran ?</DialogTitle><DialogDescription>Ses activités seront retirées du brouillon. Vous pourrez annuler cette modification.</DialogDescription></DialogHeader><Button onClick={() => { const content = course.content.filter(p => p.id !== removePage); change({ ...course, content }); setSelected(content[Math.min(pageIndex, content.length - 1)]?.id ?? null); setRemovePage(null); }}>Retirer l’écran</Button><Button variant="outline" onClick={() => setRemovePage(null)}>Conserver l’écran</Button></DialogContent></Dialog>
    <Dialog open={blocker.state === 'blocked'} onOpenChange={open => { if (!open && blocker.state === 'blocked') blocker.reset(); }}><DialogContent><DialogHeader><DialogTitle>Quitter la rédaction ?</DialogTitle><DialogDescription>Les modifications ne sont pas enregistrées sur le serveur.{draftError ? ' Le brouillon local n’a pas pu être conservé.' : ' Le brouillon restera sur cet appareil.'}</DialogDescription></DialogHeader><Button onClick={() => { try { localStorage.setItem(draftKey, serialized); } catch { toast.error('Impossible de conserver le brouillon. Enregistrez le cours avant de quitter.'); blocker.reset?.(); return; } blocker.proceed?.(); }}>Quitter et conserver le brouillon</Button><Button variant="outline" onClick={() => blocker.reset?.()}>Continuer la rédaction</Button></DialogContent></Dialog>
  </div>;
}

function Preview({ pages, start }: { pages: ModulePage[]; start: number }) {
  const [index, setIndex] = useState(start);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { isCorrect: boolean; score: number; selected?: string[] }>>({});
  const page = pages[index];
  if (!page) return <p>Ajoutez un écran pour le prévisualiser.</p>;
  return <div className="space-y-4"><div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Précédent</Button><Button variant="outline" disabled={index === pages.length - 1} onClick={() => setIndex(i => i + 1)}>Suivant</Button></div>
    <div className="rounded-2xl bg-[#0b2420] p-5 sm:p-8 text-white space-y-5"><CoursePageHeading title={page.title} instruction={page.instruction} pageNumber={index + 1} totalPages={pages.length} level="h2" /><Suspense fallback={<p>Chargement de l’aperçu…</p>}>{page.blocks.map(block => <PreviewBlock key={`${attempt}:${page.id}:${block.id}`} block={block} quizAnswers={answers} onQuizAnswer={(id, isCorrect, score, selected) => setAnswers(current => ({ ...current, [id]: { isCorrect, score, selected } }))} />)}</Suspense></div>
    <Button variant="ghost" onClick={() => { setAnswers({}); setIndex(start); setAttempt(a => a + 1); }}>Recommencer l’aperçu</Button>
  </div>;
}
