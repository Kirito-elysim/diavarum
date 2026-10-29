import { CoursePageCounter, CoursePageHeading } from '../CoursePageHeading';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ModulePage } from '../../types';
import { Button } from '../ui/button';
import { pageHeaderMeta } from '../../lib/courseVisuals';

const PreviewBlock = lazy(() => import('../../pages/TrainingSessionPage').then(module => ({ default: module.BlockCard })));
const frameDocument = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="tablet-root"></div></body></html>';

/** Isolated viewport: media queries and fixed overlays follow the tablet, not the editor window. */
export function TabletPreview({ pages, start }: { pages: ModulePage[]; start: number }) {
  const [portrait, setPortrait] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const width = portrait ? 800 : 1280;
  const height = portrait ? 1280 : 800;
  const scale = Math.min(1, size.width / (width + 32), size.height / (height + 32));
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  return <div className="space-y-3 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-semibold text-emerald-950">Galaxy Tab A11+ · 11 pouces</p><p className="text-xs text-gray-500">Simulation web {width} × {height} · affichage réduit pour tenir dans la fenêtre</p></div>
      <div className="flex gap-2" role="group" aria-label="Orientation de la tablette"><Button variant={portrait ? 'outline' : 'default'} aria-pressed={!portrait} onClick={() => setPortrait(false)}>Paysage</Button><Button variant={portrait ? 'default' : 'outline'} aria-pressed={portrait} onClick={() => setPortrait(true)}>Portrait</Button></div>
    </div>
    <div ref={stage} className="h-[65dvh] min-h-64 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-100">
      <div style={{ width: (width + 32) * scale, height: (height + 32) * scale }} className="relative shrink-0">
        <div className="absolute left-0 top-0 rounded-[28px] bg-slate-900 p-4 shadow-xl origin-top-left" style={{ width: width + 32, height: height + 32, transform: `scale(${scale})` }}>
          <iframe title="Écran de la tablette" srcDoc={frameDocument} width={width} height={height} className="block rounded-xl border-0 bg-[#ECF5E9]" onLoad={event => {
            const doc = event.currentTarget.contentDocument;
            if (!doc) return;
            doc.head.querySelectorAll('[data-tablet-style]').forEach(node => node.remove());
            document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
              const copy = node.cloneNode(true) as HTMLElement;
              copy.setAttribute('data-tablet-style', '');
              doc.head.appendChild(copy);
            });
            setTarget(doc.getElementById('tablet-root'));
          }} />
          {target && createPortal(<TabletContent pages={pages} start={start} />, target)}
        </div>
      </div>
    </div>
    <p className="text-xs text-gray-500">Le brouillon est interactif. Aucun résultat patient n’est enregistré. Le zoom et les barres Android peuvent modifier la surface disponible sur la tablette réelle.</p>
  </div>;
}

function TabletContent({ pages, start }: { pages: ModulePage[]; start: number }) {
  const [index, setIndex] = useState(start);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { isCorrect: boolean; score: number; selected?: string[] }>>({});
  const scroll = useRef<HTMLElement>(null);
  const page = pages[index];
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [index]);
  if (!page) return <p>Ajoutez un écran pour le prévisualiser.</p>;
  const meta = pageHeaderMeta(page);
  return <div className="course-theme h-dvh flex flex-col" style={{ background: '#ECF5E9' }}>
    <header className="shrink-0 mx-4 mt-4 rounded-3xl overflow-hidden shadow-sm text-white flex flex-wrap items-end gap-x-6 gap-y-3 px-6 py-4" style={{ background: '#1C5335' }}>
      <div className="min-w-0 flex-1 basis-72"><CoursePageHeading title={page.title} instruction={meta.instruction} icon={meta.icon} showCounter={false} pageNumber={index + 1} totalPages={pages.length} /></div>
      <div className="flex items-center gap-3 self-end"><button className="min-h-11 px-4 rounded-full bg-white/10 text-sm" onClick={() => { setIndex(start); setAnswers({}); setAttempt(a => a + 1); }}>Recommencer</button><CoursePageCounter pageNumber={index + 1} totalPages={pages.length} /></div>
    </header>
    <main ref={scroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain"><div className="space-y-5 px-4 sm:px-10 py-5"><Suspense fallback={<p>Chargement…</p>}>{page.blocks.map(block => <PreviewBlock key={`${attempt}:${page.id}:${block.id}`} block={block} quizAnswers={answers} onQuizAnswer={(id, isCorrect, score, selected) => setAnswers(current => ({ ...current, [id]: { isCorrect, score, selected } }))} />)}</Suspense></div></main>
    <footer className="shrink-0 mx-4 sm:mx-10 pt-4 pb-4 flex justify-between gap-10"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)} className="flex-1 h-12 px-6 rounded-full bg-white font-semibold disabled:opacity-30" style={{ border: '2px solid rgba(0,65,56,0.18)', color: '#004138' }}>Précédent</button><button disabled={index === pages.length - 1} onClick={() => setIndex(i => i + 1)} className="flex-1 h-12 px-6 rounded-full bg-[#E86825] text-white font-semibold disabled:opacity-30">Suivant</button></footer>
  </div>;
}
