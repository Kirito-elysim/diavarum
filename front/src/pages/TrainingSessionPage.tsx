import { CourseNavigation } from '../components/CourseNavigation';
import { PictoGridView } from '../components/PictoGridView';
import { CourseText } from '../components/CourseText';
import { courseTextStyle } from '../lib/courseTextStyle';
import { CourseHeader } from '../components/CourseHeader';
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useSearchParams, useNavigate, useBlocker, useLocation } from 'react-router-dom';
import { useInterruptSession, useModule, usePatient, useProgram, useStartSession, useValidateSession, verifySecurityCode } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';
import { learnerSessionUrl, lockLearnerSession, unlockLearnerSession } from '../lib/learnerSession';
import { exerciseResults } from '../lib/scoring';
import { ApiError } from '../lib/api';
import { QuizComponent } from '../components/QuizComponent';
import { CarouselView } from '../components/CarouselView';
import {
  ReorderView, FillBlankView, TrueFalseView, MemoryView,
  SliderView, TapSequenceView, FlipCardsView, CategorizeView,
  DrawingView, ScenarioView,
  RevealLegendsView, PullTimelineView,
  SortBinView, ConnectDotsView, WordSearchView, YesNoPathView,
} from '../components/InteractiveBlocks';
import {
  ChevronLeft, ChevronRight, X,
  CheckCircle2, BookOpen, ZoomIn, Pause, Play, Clock,
  AlertCircle, Route, Shield, Delete, ArrowRight, MapPin, Maximize,
  ExternalLink, RefreshCw,
} from 'lucide-react';
import type {
  ModulePage,
  ContentBlock, TextBlock, ImageBlock, InfoCardBlock, ImageTextBlock,
  TimelineBlock, HotspotBlock, IframeBlock, FlipCardsBlock,
} from '../types';
// New block types are imported by their component props; no extra type imports needed here.
import { cn } from '../lib/utils';
import { infoCardCategory, markerWidth, pageCenters, pageFills, pageStretches } from '../lib/courseVisuals';
import { HotspotMarker, SheetMarker } from '../components/HotspotMarker';

/* ─── Fullscreen helpers ──────────────────────────────────────────────────── */
/** API plein écran préfixée des anciens WebKit (tablettes Android et iPad plus anciennes) */
type WebkitFullscreen = { webkitRequestFullscreen?: () => void; webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element | null };

function requestFullscreen() {
  const el = document.documentElement as HTMLElement & WebkitFullscreen;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else el.webkitRequestFullscreen?.();
}

function exitFullscreen() {
  const doc = document as Document & WebkitFullscreen;
  if (doc.fullscreenElement) doc.exitFullscreen().catch(() => {});
  else if (doc.webkitFullscreenElement) doc.webkitExitFullscreen?.();
}

/** Données minimales dont le lecteur a besoin */
interface PlayerModule {
  id: string;
  code: string;
  title: string;
  estimatedDuration: number;
  pages: ModulePage[];
  competencies: { id: string; label: string }[];
}

interface PlayerPatient {
  id: string;
  firstName: string;
  lastName: string;
}

/* ─── Chronomètre ────────────────────────────────────────────────────────── */
/** Durée effective de la séance : ne tourne que pendant le cours, pauses exclues */
function useStopwatch(running: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return { elapsed, mm, ss };
}

/* ─── Content block renderers ────────────────────────────────────────────── */
function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className="course-free-text">
      <p className="text-[25px] leading-snug text-[#004138] whitespace-pre-line break-words" style={courseTextStyle(block.textStyle)}><CourseText text={block.content} /></p>
    </div>
  );
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const zoomEnabled = block.zoomEnabled === true;
  return (
    <>
      <figure className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl">
          <img src={block.url} alt={block.alt} className={cn('mx-auto block max-w-full', block.maxHeight ? 'w-full object-contain' : 'h-auto')} style={block.maxHeight ? { height: block.maxHeight } : undefined} loading="lazy" />
          {zoomEnabled && (
            <button type="button" aria-label="Agrandir l’image" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()} className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#004138]/80 text-white">
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {block.caption && <figcaption className="course-label text-[#004138]/60 text-center font-medium italic px-2">{block.caption}</figcaption>}
      </figure>
      {zoomEnabled && (
        <dialog ref={dialog} aria-label="Image agrandie" className="m-auto max-h-[100dvh] max-w-[100vw] overflow-auto bg-transparent p-4 text-white backdrop:bg-black/95">
          <button type="button" aria-label="Fermer le zoom" className="ml-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => dialog.current?.close()}>
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <img src={block.url} alt={block.alt} className="mx-auto max-w-full max-h-[calc(100dvh-8rem)] rounded-2xl object-contain" loading="lazy" />
          {block.caption && <p className="mt-2 text-center course-label">{block.caption}</p>}
        </dialog>
      )}
    </>
  );
}

function InfoCardView({ block }: { block: InfoCardBlock }) {
  const c = infoCardCategory(block.variant);
  const Icon = c.icon;
  return (
    <div className={cn('course-info-card rounded-2xl flex items-center', block.compact ? 'mx-auto w-fit max-w-full gap-3 px-4 py-2' : 'gap-5 px-5 py-3')} style={{ backgroundColor: c.bg, border: `3px solid ${c.border}` }}>
      <div className="h-20 w-20 flex items-center justify-center flex-shrink-0" style={c.iconUrl ? undefined : { backgroundColor: c.iconBg }}>
        {c.iconUrl ? <img src={c.iconUrl} alt="" className="w-full h-full object-contain" /> : <Icon className="w-5 h-5 text-white" />}
      </div>
      <div className="flex-1">
        <p className={cn('text-[25px] leading-snug whitespace-pre-line break-words', c.body)} style={courseTextStyle(block.textStyle)}><CourseText text={block.content} /></p>
      </div>
    </div>
  );
}

/* ─── Timeline block (frise interactive) ─────────────────────────────────── */
function TimelineBlockView({ block }: { block: TimelineBlock }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    setActiveIdx(idx);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardW = el.scrollWidth / block.items.length;
      setActiveIdx(Math.round(el.scrollLeft / cardW));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [block.items.length]);

  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-sm" style={{ border: '1.5px solid rgba(0,65,56,0.14)' }}>
      {block.title && (
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <div className="w-1.5 h-6 rounded-full bg-[#E86825]" />
          <span className="text-[#004138] font-bold course-label">{block.title}</span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {block.items.map((item) => (
          <div key={item.id} className="snap-center flex-shrink-0 w-full relative" style={{ minHeight: 340 }}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,7,18,0.97) 0%, rgba(3,7,18,0.6) 55%, rgba(3,7,18,0.25) 100%)' }} />
            <div className="relative h-full flex flex-col justify-end px-6 pb-6 pt-16" style={{ minHeight: 340 }}>
              {item.tag && (
                <span className="inline-flex self-start px-3 py-1 rounded-full course-caption font-bold uppercase tracking-widest mb-3"
                  style={{ backgroundColor: 'rgba(232,104,37,0.25)', color: '#FCC6A8', border: '1px solid rgba(232,104,37,0.4)' }}>
                  {item.tag}
                </span>
              )}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-orange-400 font-black course-copy"
                  style={{ backgroundColor: 'rgba(232,104,37,0.2)', border: '2px solid rgba(232,104,37,0.5)' }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-black course-copy leading-tight mb-1.5">{item.title}</h3>
                  <p className="text-white/70 course-label leading-relaxed">{item.content}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: 'rgba(0,65,56,0.05)' }}>
        <button
          onClick={() => scrollTo(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#004138]/70 disabled:opacity-30 transition-opacity touch-manipulation"
          style={{ backgroundColor: 'rgba(0,65,56,0.08)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {block.items.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)} className={cn(
              'rounded-full transition-all duration-300 touch-manipulation',
              i === activeIdx ? 'w-6 h-2.5 bg-[#E86825]' : 'w-2.5 h-2.5 bg-[#004138]/15 hover:bg-[#004138]/30'
            )} />
          ))}
        </div>
        <button
          onClick={() => scrollTo(Math.min(block.items.length - 1, activeIdx + 1))}
          disabled={activeIdx === block.items.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#004138]/70 disabled:opacity-30 transition-opacity touch-manipulation"
          style={{ backgroundColor: 'rgba(0,65,56,0.08)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Hotspot block (click-to-legend) ────────────────────────────────────── */
function HotspotBlockView({ block }: { block: HotspotBlock }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const legendDialog = useRef<HTMLDialogElement>(null);
  const active = block.hotspots.find((h) => h.id === activeId) ?? null;
  // Légendes sans texte : le titre sert de réponse, affiché sur une seule ligne une fois le repère touché
  const labelsOnly = block.hotspots.every((h) => !h.description);
  // Repères en pictos : les titres restent cachés jusqu'au toucher de leur picto, sur une seule ligne
  const hideUntilSeen = labelsOnly || !!block.sheet;

  return (
    <div className="space-y-5">
    {block.question && <p className="text-[25px] font-normal text-[#004138] leading-snug whitespace-pre-line [&_strong]:font-bold"><CourseText text={block.question} /></p>}
    <div className={cn('rounded-3xl overflow-hidden bg-white ring-1 ring-gray-100/80 shadow-sm', block.legendDialog && 'mx-auto max-w-[980px] landscape:max-w-[min(980px,calc(100vw-290px),max(420px,calc(250dvh-850px)))]')}>
      {/* Image with markers */}
      <div className="relative select-none" onClick={() => setActiveId(null)}>
        <img src={block.imageUrl} alt={block.alt} className="w-full h-auto" loading="lazy" />
        {activeId && !labelsOnly && !block.legendDialog && <div className="absolute inset-0 bg-black/30 transition-opacity" />}
        {block.hotspots.map((hs, i) => {
          const size = hs.size ?? 48;
          const sheetCell = block.sheet?.url && hs.sheetRow !== undefined ? block.sheet : null;
          const bare = !!hs.iconUrl || !!sheetCell; // picto importé : affiché tel quel, sans pastille
          const isSeen = seen.has(hs.id) || hs.id === activeId;
          return (
            <button
              key={hs.id}
              onClick={(e) => {
                e.stopPropagation();
                setActiveId(hs.id === activeId ? null : hs.id);
                setSeen((prev) => new Set(prev).add(hs.id));
                legendDialog.current?.showModal();
              }}
              className={cn(
                'absolute flex items-center justify-center rounded-full font-black course-caption transition-all duration-200 touch-manipulation',
                bare
                  ? cn('hover:scale-110', hs.id === activeId && 'scale-110')
                  : cn('shadow-lg', hs.id === activeId
                    ? 'scale-110 bg-orange-500 text-white ring-4 ring-orange-300/60'
                    : 'bg-white/90 text-orange-600 hover:scale-110 ring-2 ring-orange-400/60')
              )}
              aria-label={`Afficher la légende ${i + 1} : ${hs.label}`}
              aria-expanded={activeId === hs.id}
              aria-haspopup={block.legendDialog ? 'dialog' : undefined}
              style={{ width: markerWidth(size), aspectRatio: '1', left: `${hs.x}%`, top: `${hs.y}%`, transform: 'translate(-50%, -50%)', zIndex: hs.id === activeId ? 20 : 10 }}
            >
              {sheetCell
                ? <SheetMarker sheet={sheetCell} row={hs.sheetRow ?? 0} col={isSeen ? 1 : 0} />
                : bare
                ? <img src={isSeen && hs.iconSeenUrl ? hs.iconSeenUrl : hs.iconUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                : <HotspotMarker point={hs} index={i} />}
              {!bare && hs.id !== activeId && (
                <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" style={{ animationDuration: `${1.5 + i * 0.4}s` }} />
              )}
            </button>
          );
        })}
      </div>

      {block.caption && (
        <p className="course-caption text-gray-400 text-center px-5 pt-3 pb-1 font-medium italic flex items-center justify-center gap-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />{block.caption}
        </p>
      )}

      {block.legendDialog ? (
        <dialog ref={legendDialog} aria-label="Informations" onClose={() => setActiveId(null)} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-[#004138]/15 bg-white p-6 text-[#004138] shadow-lg backdrop:bg-black/45">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span />
            <button type="button" aria-label="Fermer la légende" onClick={() => legendDialog.current?.close()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ECF5E9]">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {active?.description && <p className="course-copy"><CourseText text={active.description} /></p>}
        </dialog>
      ) : <>
      {/* Info panel */}
      <div className={cn('transition-all duration-300 overflow-hidden', active ? 'max-h-none opacity-100' : 'max-h-0 opacity-0')}>
        {active && !labelsOnly && (
          <div className="mx-4 mb-4 mt-2 rounded-2xl p-4" style={{ backgroundColor: '#FFF4ED', border: '1.5px solid #FCC6A8' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span />
              <button aria-label="Fermer la légende" onClick={() => setActiveId(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 touch-manipulation">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[#004138] course-copy leading-relaxed"><CourseText text={active.description} /></p>
          </div>
        )}
      </div>

      {/* Hotspot buttons */}
      <div className={cn('px-4 pb-4 pt-1', hideUntilSeen ? 'flex flex-nowrap gap-2' : 'grid grid-cols-2 gap-2')}>
        {block.hotspots.map((hs, i) => (
          <button
            key={hs.id}
            onClick={() => setActiveId(hs.id === activeId ? null : hs.id)}
            disabled={hideUntilSeen && !seen.has(hs.id)}
            aria-hidden={hideUntilSeen && !seen.has(hs.id) ? true : undefined}
            tabIndex={hideUntilSeen && !seen.has(hs.id) ? -1 : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all touch-manipulation',
              hideUntilSeen && 'flex-1 min-w-0',
              hideUntilSeen && !seen.has(hs.id) && 'invisible',
              hs.id === activeId
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-[#FAFAFA] text-[#004138] hover:bg-orange-50 ring-1 ring-[#004138]/15'
            )}
          >
            <span className={cn('w-5 h-5 rounded-lg flex items-center justify-center course-caption font-black flex-shrink-0',
              hs.id === activeId ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600')}><HotspotMarker point={hs} index={i} className="h-3.5 w-3.5" /></span>
            <span className="course-label font-semibold break-words min-w-0">{/^repère\s*\d+$/i.test(hs.label.trim()) ? i + 1 : hs.label}</span>
          </button>
        ))}
      </div>
      </>}
    </div>
    </div>
  );
}

/* ─── Image (ou picto) à gauche, texte à droite ──────────────────────────── */
function ImageTextView({ block }: { block: ImageTextBlock }) {
  const picto = block.size === 'picto';
  return (
    <div className={cn('course-image-text flex gap-10', block.verticalAlign === 'center' ? 'items-center' : 'items-start', !picto && (block.imagePosition === 'top' ? 'flex-col gap-5' : 'flex-col sm:flex-row'), block.imageSide === 'right' && block.imagePosition !== 'top' && 'sm:flex-row-reverse')}>
      {block.imageUrl ? <img
        src={block.imageUrl}
        alt={block.alt}
        loading="lazy"
        className={cn('object-contain', picto ? 'h-24 w-24 shrink-0' : 'w-full rounded-3xl', !picto && block.imagePosition !== 'top' && (block.imageWidth === 'third' ? 'sm:w-[calc((100%-40px)/3)] sm:shrink-0' : block.imageWidth === 'half' ? 'sm:w-[calc(50%-20px)] sm:shrink-0' : block.imageWidth === 'half-screen' ? 'sm:w-[50vw] sm:max-w-[60%] sm:shrink-0' : 'sm:w-[48%]'))}
        style={!picto ? { maxWidth: block.imageAspectRatio && block.imageMaxHeight ? `min(100%, ${block.imageMaxHeight * block.imageAspectRatio}px, calc((100dvh - 330px) * ${block.imageAspectRatio}))` : block.imageMaxWidth, maxHeight: block.imageMaxHeight ? `min(${block.imageMaxHeight}px, calc(100dvh - 330px))` : undefined } : undefined}
      /> : <div className="h-64 w-full sm:w-[48%] shrink-0 rounded-3xl bg-[#FFE0D0]" aria-label="Image à ajouter" />}
      {block.infoCard ? <div className="min-w-0 flex-1 space-y-5">
        <p className="text-[25px] leading-snug text-[#004138] whitespace-pre-line break-words" style={courseTextStyle(block.textStyle)}><CourseText text={block.content} /></p>
        <InfoCardView block={block.infoCard} />
      </div> : block.list ? <div className="min-w-0 flex-1 text-[25px] leading-snug text-[#004138] break-words" style={courseTextStyle(block.textStyle)}>
        {block.listIntro && <p className="mb-3"><CourseText text={block.listIntro} /></p>}
        <ul className={cn('list-none pl-[10px]', block.listSpacing === 'normal' ? 'space-y-0 [&_li]:leading-[1.375]' : 'space-y-4')}>
          {block.list.map((item, index) => <li key={index} className={item.imageUrl ? 'flex items-center gap-3' : (block.listMarker === 'dash' ? "relative pl-5 before:absolute before:left-0 before:content-['–']" : "relative pl-5 before:absolute before:left-0 before:content-['▪']")}>
            {item.imageUrl ? <><img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 object-contain" /><span className="min-w-0 flex-1"><CourseText text={item.text} /></span></> : <CourseText text={item.text} />}
            {item.children && <ul className={cn('list-none pl-[10px]', block.listSpacing === 'normal' ? 'mt-0 space-y-0' : 'mt-3 space-y-2')}>
              {item.children.map((text, childIndex) => <li key={childIndex} className="relative pl-5 before:absolute before:left-0 before:content-['–']"><CourseText text={text} /></li>)}
            </ul>}
          </li>)}
        </ul>
      </div> : <p className="min-w-0 flex-1 text-[25px] leading-snug text-[#004138] whitespace-pre-line break-words" style={courseTextStyle(block.textStyle)}><CourseText text={block.content} /></p>}
    </div>
  );
}

/* ─── Iframe block ────────────────────────────────────────────────────────── */
function IframeBlockView({ block }: { block: IframeBlock }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const height = block.height ?? 480;

  const reload = () => { setKey((k) => k + 1); setLoaded(false); setError(false); };

  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-sm" style={{ border: '1.5px solid rgba(0,65,56,0.14)' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,65,56,0.1)', background: 'rgba(0,65,56,0.04)' }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white" style={{ border: '1px solid rgba(0,65,56,0.1)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="course-caption text-[#004138]/50 truncate font-mono">{block.url}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#004138]/40 hover:text-[#004138]/70 hover:bg-[#004138]/8 transition-all touch-manipulation"
            title="Recharger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#004138]/40 hover:text-[#004138]/70 hover:bg-[#004138]/8 transition-all touch-manipulation"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Iframe area */}
      <div className="relative" style={{ height }}>
        {/* Loading skeleton */}
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: '#ECF5E9' }}>
            <div className="w-12 h-12 rounded-2xl bg-[#E86825]/15 flex items-center justify-center animate-pulse">
              <BookOpen className="w-6 h-6 text-[#E86825]" />
            </div>
            <div className="space-y-2 w-48">
              <div className="h-2 rounded-full bg-[#004138]/10 animate-pulse" />
              <div className="h-2 rounded-full bg-[#004138]/8 animate-pulse w-3/4 mx-auto" />
            </div>
            <p className="text-[#004138]/40 course-caption">Chargement du contenu…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#ECF5E9' }}>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="text-[#004138] font-semibold mb-1">Contenu inaccessible</p>
              <p className="text-[#004138]/60 course-label">Ce site bloque l'intégration dans une page.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={reload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#004138]/70 hover:bg-[#ECF5E9] course-label font-medium transition-all touch-manipulation" style={{ border: '1px solid rgba(0,65,56,0.14)' }}>
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              <a href={block.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF4ED] text-[#A64314] hover:bg-[#FFE0D0] course-label font-medium transition-all touch-manipulation">
                <ExternalLink className="w-4 h-4" />
                Ouvrir
              </a>
            </div>
          </div>
        )}

        <iframe
          key={key}
          src={block.url}
          title={block.title}
          className="w-full h-full border-0"
          style={{ display: loaded && !error ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(false); }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen"
        />
      </div>

      {block.caption && (
        <p className="course-caption text-[#004138]/40 text-center px-5 py-3 italic" style={{ borderTop: '1px solid rgba(0,65,56,0.08)' }}>
          {block.caption}
        </p>
      )}
    </div>
  );
}

/* ─── Pre-session screen ─────────────────────────────────────────────────── */
function PreSessionScreen({
  patientFirstName, patientLastName,
  moduleTitle, modulePages, moduleDuration, competencies,
  parcoursTitle, parcoursModuleIndex, parcoursModuleTotal,
  onStart,
}: {
  patientFirstName: string; patientLastName: string;
  moduleTitle: string; modulePages: number; moduleDuration: number;
  competencies: PlayerModule['competencies'];
  parcoursTitle?: string; parcoursModuleIndex?: number; parcoursModuleTotal?: number;
  onStart: () => void;
}) {
  const handleStart = () => {
    requestFullscreen();
    onStart();
  };

  return (
    <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-auto" style={{ userSelect: 'none', background: '#ECF5E9' }}>
      {/* Logo */}
      <div className="w-16 h-16 rounded-3xl bg-[#E86825] flex items-center justify-center mb-5 shadow-xl shadow-orange-900/15">
        <BookOpen className="w-8 h-8 text-white" aria-hidden="true" />
      </div>

      <h1 className="text-4xl font-black text-[#004138] mb-2 tracking-tight">Prêt à commencer ?</h1>
      <p className="text-[#004138]/60 text-lg mb-6">
        {patientFirstName} {patientLastName}
      </p>

      {/* Module info card */}
      <div className="w-full max-w-xl rounded-3xl p-5 sm:px-6 mb-4 text-left bg-white shadow-sm" style={{ border: '1.5px solid rgba(0,65,56,0.14)' }}>
        {parcoursTitle && (
          <div className="flex items-center gap-2 text-[#E86825] mb-4">
            <Route className="w-4 h-4 flex-shrink-0" />
            <span className="course-label font-semibold truncate">{parcoursTitle}</span>
            {parcoursModuleIndex !== undefined && parcoursModuleTotal !== undefined && (
              <span className="ml-auto text-[#004138]/40 course-caption whitespace-nowrap">
                Module {parcoursModuleIndex + 1}/{parcoursModuleTotal}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#FFF4ED]">
            <BookOpen className="w-6 h-6 text-[#E86825]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#004138] text-lg break-words">{moduleTitle}</p>
            <p className="text-[#004138]/50 course-label">{modulePages} pages · {moduleDuration} min</p>
          </div>
        </div>
        {competencies.length > 0 && (
          <section aria-labelledby="pre-session-competencies" className="mt-4 border-t border-[#004138]/15 pt-4">
            <h2 id="pre-session-competencies" className="course-label font-bold">Compétences à valider</h2>
            <ul role="list" className="mt-2 list-disc space-y-1 pl-5 course-label marker:text-[#A64314]">
              {competencies.map(({ id, label }) => <li key={id} className="break-words">{label}</li>)}
            </ul>
          </section>
        )}
      </div>

      {/* Sortie protégée : le code n'est jamais affiché à l'écran (le patient pourrait le voir) */}
      <div className="w-full max-w-xl rounded-3xl p-5 sm:px-6 mb-6 flex items-start gap-3 text-left bg-[#FFFBEB]" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="course-label text-amber-800">
          Pour quitter la séance, votre code de sécurité personnel vous sera demandé.
        </p>
      </div>

      <button
        onClick={handleStart}
        className="w-full max-w-sm h-16 rounded-full bg-[#E86825] hover:bg-[#CC5518] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-xl shadow-orange-900/20 active:scale-[0.97] transition-transform touch-manipulation"
      >
        <Maximize className="w-5 h-5 opacity-80" />
        Commencer la séance
        <ArrowRight className="w-6 h-6" />
      </button>
      <p className="text-[#004138]/35 course-caption mt-3">La séance s'ouvrira en plein écran</p>
    </div>
  );
}

/* ─── PIN exit modal ─────────────────────────────────────────────────────── */
function PINExitModal({
  onSuccess,
  onCancel,
  title = 'Code IDE',
  subtitle = 'Entrez votre code pour quitter la séance',
}: {
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}) {
  const [entered,  setEntered]  = useState('');
  const [shake,    setShake]    = useState(false);
  const [checking, setChecking] = useState(false);
  const [message,  setMessage]  = useState('');

  const press = (d: string) => {
    if (entered.length >= 6 || checking) return;
    setEntered(entered + d);
    setMessage('');
  };

  const del = () => setEntered((s) => s.slice(0, -1));

  // Vérification côté serveur : code personnel de l'IDE connectée ou code national
  const submit = async () => {
    if (entered.length < 4 || checking) return;
    setChecking(true);
    try {
      await verifySecurityCode(entered);
      await onSuccess();
    } catch (err) {
      setShake(true);
      setMessage(err instanceof ApiError && err.status === 429 ? 'Trop de tentatives. Réessayez dans 15 minutes.' : err instanceof ApiError && (err.status === 401 || err.status === 403) ? 'Code incorrect' : 'Vérification ou enregistrement impossible. Réessayez.');
      setTimeout(() => { setEntered(''); setShake(false); }, 600);
    } finally {
      setChecking(false);
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

  return (
    <div className="course-theme session-overlay fixed inset-0 z-[10000] overflow-y-auto backdrop-blur-md flex flex-col items-center justify-center px-6 py-6 fade-scale-in" style={{ backgroundColor: 'rgba(28,83,53,0.97)' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
        <Shield className="w-7 h-7 text-amber-400" />
      </div>

      <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
      <p className="text-white/50 course-label mb-8 text-center max-w-xs">{subtitle}</p>

      {/* Dots */}
      <div className={cn('flex items-center gap-4 mb-3', shake && 'shake')}>
        {[0,1,2,3,4,5].map((i) => (
          <div
            key={i}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all duration-150',
              i < entered.length ? 'bg-[#E86825] border-[#E86825] scale-110' : 'bg-transparent border-white/30',
              i >= 4 && i >= entered.length && 'opacity-40'
            )}
          />
        ))}
      </div>
      <p className="h-6 mb-4 course-label text-red-300">{message}</p>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k) => {
          if (k === '⌫') return (
            <button
              key={k}
              onClick={del}
              aria-label="Effacer"
              className="h-16 rounded-full flex items-center justify-center text-white/60 active:opacity-70 transition-opacity touch-manipulation"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <Delete className="w-5 h-5" />
            </button>
          );
          if (k === '✓') return (
            <button
              key={k}
              onClick={submit}
              disabled={entered.length < 4 || checking}
              aria-label="Valider"
              className="h-16 rounded-full flex items-center justify-center bg-[#E86825] text-white disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
            >
              {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
            </button>
          );
          return (
            <button
              key={k}
              onClick={() => press(k)}
              className="h-16 rounded-full text-white text-2xl font-bold active:opacity-70 active:scale-95 transition-all touch-manipulation"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {k}
            </button>
          );
        })}
      </div>

      <button
        onClick={onCancel}
        className="mt-8 text-white/50 course-label hover:text-white/70 transition-colors touch-manipulation"
      >
        Annuler
      </button>
    </div>
  );
}

/* ─── Pause overlay ──────────────────────────────────────────────────────── */
function PauseOverlay({
  mm, ss, moduleName, patientName,
  onResume, onRequestExit,
}: {
  mm: string; ss: string;
  moduleName: string; patientName: string;
  onResume: () => void; onRequestExit: () => void;
}) {
  return (
    <div className="course-theme session-overlay fixed inset-0 z-[10000] flex flex-col items-center justify-center px-8 fade-scale-in" style={{ background: '#ECF5E9' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 bg-[#FFF4ED]">
        <Pause className="w-12 h-12 text-[#E86825]" />
      </div>

      <h2 className="text-4xl font-black text-[#004138] mb-2">Séance en pause</h2>
      <p className="text-[#004138]/60 course-label mb-10 text-center">{moduleName} · {patientName}</p>

      <div className="flex items-center gap-3 bg-white px-8 py-5 rounded-3xl mb-12 shadow-sm" style={{ border: '1.5px solid rgba(0,65,56,0.14)' }}>
        <Clock className="w-6 h-6 text-[#004138]/60" />
        <span className="text-5xl font-black text-[#004138] tracking-tight font-sans tabular-nums">{mm}:{ss}</span>
        <span className="text-[#004138]/40 course-label font-semibold">écoulé</span>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onResume}
          className="w-full h-16 rounded-full bg-[#E86825] hover:bg-[#CC5518] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-lg shadow-orange-900/15 active:scale-[0.98] transition-transform touch-manipulation"
        >
          <Play className="w-6 h-6" />
          Reprendre la séance
        </button>
        <button
          onClick={onRequestExit}
          className="w-full h-14 rounded-full border-2 font-semibold course-label hover:bg-[#ECF5E9] active:bg-[#dcebdd] transition-colors touch-manipulation flex items-center justify-center gap-2"
          style={{ borderColor: 'rgba(0,65,56,0.18)', color: '#004138' }}
        >
          <Shield className="w-4 h-4" />
          Quitter (code IDE)
        </button>
      </div>
    </div>
  );
}

/* ─── Swipe hook ─────────────────────────────────────────────────────────── */
function isGestureElement(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.touchAction === 'none' || el.dataset.courseGesture !== undefined) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'CANVAS' || tag === 'SELECT') return true;
  if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
  return false;
}

function useSwipe(onLeft: () => void, onRight: () => void, threshold = 55) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const shouldSwipe = useRef(true);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    shouldSwipe.current = true;
    let el = e.target as HTMLElement | null;
    while (el && el !== e.currentTarget) {
      if (isGestureElement(el)) { shouldSwipe.current = false; break; }
      el = el.parentElement;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    if (shouldSwipe.current) {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx < 0) onLeft();
        else onRight();
      }
    }
    startX.current = null;
    startY.current = null;
  }, [onLeft, onRight, threshold]);

  return { onTouchStart, onTouchEnd };
}

/* ─── Module completion screen ───────────────────────────────────────────── */
function ModuleCompletionScreen({
  patient, module, score, elapsedSeconds,
  nextModuleName, nextModuleDuration,
  onNext, onRequestExit, competencies,
}: {
  patient:             PlayerPatient;
  module:              PlayerModule;
  score:               number | null;
  elapsedSeconds:      number;
  nextModuleName?:     string;
  nextModuleDuration?: number;
  onNext?:             () => void;
  onRequestExit:       () => void;
  competencies?:       { validated: number; total: number };
}) {
  const isExcellent = score === null || score >= 80;
  const isGood      = score === null || score >= 60;
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-auto" style={{ userSelect: 'none', background: '#1C5335' }}>
      <div className={cn(
        'w-28 h-28 rounded-full flex items-center justify-center mb-8 pop-in shadow-2xl',
        isExcellent ? 'bg-emerald-500/20' : isGood ? 'bg-amber-500/20' : 'bg-red-500/20'
      )}>
        <CheckCircle2 className={cn('w-14 h-14 check-bounce', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')} />
      </div>

      <h1 className="text-4xl font-black text-white mb-2">Cours validé</h1>
      <p className="text-white/50 course-label mb-8">{patient.firstName} {patient.lastName} · {module.title}</p>

      {/* Score + time */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          'w-32 h-32 rounded-full flex flex-col items-center justify-center border-4',
          isExcellent ? 'border-emerald-400/60 bg-emerald-500/10' : isGood ? 'border-amber-400/60 bg-amber-500/10' : 'border-red-400/60 bg-red-500/10'
        )}>
          <span className={cn('text-3xl font-black leading-none', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')}>{score === null ? '—' : `${score}%`}</span>
          <span className="course-caption font-semibold text-white/50 mt-1 uppercase tracking-wider">Score</span>
        </div>
        <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 border-white/15 bg-white/5">
          <span className="text-2xl font-black text-white leading-none font-sans tabular-nums">{mm}:{ss}</span>
          <span className="course-caption font-semibold text-white/50 mt-1 uppercase tracking-wider">Durée</span>
        </div>
      </div>

      <p className={cn('course-label font-semibold mb-1', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')}>
        {score === null ? 'Cours sans exercice noté' : isExcellent ? 'Excellent résultat !' : isGood ? 'Bon résultat' : 'À améliorer'}
      </p>
      {competencies && competencies.total > 0 && (
        <p className="text-white/70 course-label mb-2">{competencies.validated} compétence(s) sur {competencies.total} validée(s)</p>
      )}
      <p className="text-white/50 course-label max-w-xs mb-10">
        {score === null ? 'Durée et compétences enregistrées.' : isExcellent ? 'Contenu parfaitement assimilé.' : isGood ? 'Certains points à revoir.' : 'Révision approfondie recommandée.'}
      </p>

      <div className="w-full max-w-sm space-y-3">
        {onNext && nextModuleName && (
          <button
            onClick={onNext}
            className="w-full min-h-[4rem] py-2 px-5 rounded-full bg-[#E86825] hover:bg-[#CC5518] text-white font-bold course-label flex items-center justify-center gap-3 shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-transform touch-manipulation"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="course-caption font-normal opacity-75 mb-0.5">Cours suivant (rendre la tablette au patient)</p>
              <p className="truncate">{nextModuleName}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {nextModuleDuration && <span className="course-caption opacity-75">{nextModuleDuration} min</span>}
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        )}
        <button
          onClick={onRequestExit}
          className={cn(
            'w-full rounded-full font-semibold course-label flex items-center justify-center gap-2 transition-colors touch-manipulation',
            onNext
              ? 'h-12 border border-white/20 text-white/60 hover:bg-white/5 active:bg-white/10'
              : 'h-16 bg-[#E86825] hover:bg-[#CC5518] text-white font-bold course-label shadow-lg shadow-orange-900/20 active:scale-[0.98]'
          )}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Retour à la fiche patient
        </button>
      </div>
    </div>
  );
}

/* ─── Score final (côté patient) ─────────────────────────────────────────── */
const CONFETTI_COLORS = ['#E86825', '#FFB31B', '#1FABC7', '#ECF5E9', '#FFE0D0'];

function PatientScoreScreen({ score, onFinish }: { score: number | null; onFinish: () => void }) {
  const celebrate = score !== null && score >= 75;

  return (
    <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-hidden" style={{ background: '#ECF5E9' }}>
      {celebrate && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                left: `${(i * 37) % 100}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 10) * 0.15}s`,
                animationDuration: `${2.4 + (i % 5) * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}
      <img src="/illustrations/fin-de-cours.png" alt="" className="w-40 h-40 object-contain mb-2" />
      <p className="text-[#004138]/70 text-lg font-semibold uppercase tracking-widest mb-4">Vous avez obtenu le score de</p>
      <p className="text-8xl font-black text-[#004138] mb-4 pop-in">{score === null ? '—' : `${score} %`}</p>
      <p className="text-[#004138]/60 course-label mb-12">{score === null ? 'Ce cours ne comporte pas de quiz noté.' : celebrate ? 'Bravo !' : 'Merci pour votre participation.'}</p>
      <button
        onClick={onFinish}
        className="w-full max-w-sm h-16 rounded-full bg-[#E86825] hover:bg-[#CC5518] text-white font-bold text-xl shadow-xl shadow-orange-900/15 active:scale-[0.97] transition-transform touch-manipulation"
      >
        Fin du cours
      </button>
      <p className="text-[#004138]/40 course-caption mt-3">Rendez la tablette à votre infirmière</p>
    </div>
  );
}

/* ─── Validation des compétences (côté IDE) ──────────────────────────────── */
function CompetencyValidationScreen({
  moduleTitle, patientName, competencies, choices, onChoose, onFinish, onBack, saving, error,
}: {
  moduleTitle: string;
  patientName: string;
  competencies: { id: string; label: string }[];
  choices: Record<string, boolean>;
  onChoose: (id: string, validated: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
  saving: boolean;
  error: string | null;
}) {
  const complete = competencies.every((c) => choices[c.id] !== undefined);
  const [confirming, setConfirming] = useState(false);
  const validatedCount = competencies.filter((c) => choices[c.id]).length;

  return (
    // Fond sombre volontairement distinct des écrans patient (storyboard : l'IDE doit voir que cet écran ne s'adresse pas au patient), mais mêmes couleurs de marque
    <div className="course-theme fixed inset-0 z-[9999] overflow-auto" style={{ background: '#1C5335' }}>
      <div className="h-1.5 bg-amber-400" />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2 text-amber-300">
          <Shield className="w-5 h-5" />
          <span className="course-label font-semibold uppercase tracking-wider">Espace IDE</span>
        </div>
        <h1 className="text-3xl font-black text-white">Compétences d'entraînement</h1>
        <p className="text-white/50 mt-1 mb-8">{moduleTitle} · {patientName}</p>

        {competencies.length === 0 && (
          <p className="text-white/50 mb-8">Ce cours ne comporte pas de compétence à valider.</p>
        )}

        <div className="space-y-3 mb-10">
          {competencies.map((competency) => (
            <div key={competency.id} className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-white course-label mb-4">{competency.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => onChoose(competency.id, value)}
                    className={cn(
                      'h-12 rounded-full font-semibold course-label transition-all touch-manipulation',
                      choices[competency.id] === value
                        ? value ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        : 'bg-white/8 text-white/60 border border-white/15'
                    )}
                  >
                    {value ? 'Validée' : 'Non validée'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-300 course-label mb-4">{error}</p>}
        <p className="text-white/50 course-caption mb-3">
          Valider les compétences ne suffit pas : « Terminer le cours » enregistre la séance (durée, score, compétences).
        </p>
        {confirming && (
          <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center px-6">
            <div className="w-full max-w-sm rounded-3xl bg-[#1C5335] border border-white/15 p-6 text-center shadow-2xl">
              <p className="text-white text-lg font-bold mb-2">Êtes-vous sûr ?</p>
              <p className="text-white/60 course-label mb-6">
                {competencies.length ? `${validatedCount} compétence(s) validée(s) sur ${competencies.length}. ` : ''}
                Vous ne pourrez pas modifier le score ou les compétences validées.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConfirming(false)} className="h-12 rounded-full bg-white/10 text-white/70 font-semibold">Annuler</button>
                <button onClick={() => { setConfirming(false); onFinish(); }} className="h-12 rounded-full bg-emerald-500 text-white font-semibold">Confirmer</button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirming(true)}
          disabled={!complete || saving}
          className="w-full h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-30 active:scale-[0.98] transition-all touch-manipulation"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
          Terminer le cours
        </button>
        <button onClick={onBack} className="w-full mt-4 text-white/50 course-label touch-manipulation">Revenir au contenu du cours</button>
      </div>
    </div>
  );
}

/* ─── Block card ─────────────────────────────────────────────────────────── */
export function BlockCard({
  block, quizAnswers, onQuizAnswer, fill,
}: {
  fill?: boolean;
  block: ContentBlock;
  quizAnswers: Record<string, { isCorrect: boolean; score: number | null; selected?: string[] }>;
  onQuizAnswer: (id: string, isCorrect: boolean, score: number | null, selected?: string[]) => void;
}) {
  if (block.type === 'picto-grid') return <PictoGridView block={block} fill={fill} />;
  if (block.type === 'text')
    return <TextBlockView block={block} />;
  if (block.type === 'image')
    return <ImageBlockView block={block} />;
  if (block.type === 'info-card')
    return <InfoCardView block={block} />;
  if (block.type === 'image-text')
    return <ImageTextView block={block} />;
  if (block.type === 'timeline')
    return <TimelineBlockView block={block} />;
  if (block.type === 'hotspot')
    return <HotspotBlockView block={block} />;
  if (block.type === 'iframe')
    return <IframeBlockView block={block} />;
  if (block.type === 'quiz')
    return (
      <QuizComponent
        block={block}
        onAnswer={(isCorrect, score, selected) => onQuizAnswer(block.id, isCorrect, score, selected)}
        previousResult={quizAnswers[block.id]}
        disabled={!!quizAnswers[block.id]}
      />
    );

  /* ── New interactive blocks (chaque vue gère son propre fond ; pas de carte englobante) ── */
  const interactiveWrapper = (children: React.ReactNode) => children;

  if (block.type === 'reorder')
    return interactiveWrapper(<ReorderView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'fill-blank')
    return interactiveWrapper(<FillBlankView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'true-false')
    return interactiveWrapper(<TrueFalseView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'memory')
    return interactiveWrapper(<MemoryView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'slider')
    return interactiveWrapper(<SliderView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'tap-sequence')
    return interactiveWrapper(<TapSequenceView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'flip-cards')
    return interactiveWrapper(<FlipCardsView block={block as FlipCardsBlock} fill={fill} />);
  if (block.type === 'categorize')
    return interactiveWrapper(<CategorizeView block={block} onAnswer={(isCorrect, score, selected) => onQuizAnswer(block.id, isCorrect, score, selected)} previousResult={quizAnswers[block.id]} />);
  if (block.type === 'drawing')
    return interactiveWrapper(<DrawingView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'scenario')
    return interactiveWrapper(<ScenarioView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);

  /* ── Senior-friendly interactive blocks ── */
  if (block.type === 'reveal-legends')
    return interactiveWrapper(<RevealLegendsView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'pull-timeline')
    return interactiveWrapper(<PullTimelineView block={block} />);
  if (block.type === 'sort-bin')
    return interactiveWrapper(<SortBinView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'connect-dots')
    return interactiveWrapper(<ConnectDotsView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'word-search')
    return interactiveWrapper(<WordSearchView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
  if (block.type === 'carousel')
    return interactiveWrapper(<CarouselView block={block} fill={fill} />);
  if (block.type === 'video')
    return <figure className="space-y-4">
      <video src={block.url} aria-label={block.title} controls playsInline preload="metadata" data-course-gesture className="mx-auto block max-h-[60dvh] max-w-full rounded-2xl bg-black" />
      {block.transcript && <details className="course-label">
        <summary className="cursor-pointer">Lire la transcription</summary>
        <p className="mt-3 whitespace-pre-line"><CourseText text={block.transcript} /></p>
      </details>}
    </figure>;
  if (block.type === 'yes-no-path')
    return interactiveWrapper(<YesNoPathView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);

  return null;
}

/** Blocs d'une page : même rendu dans le lecteur et dans les aperçus de l'éditeur. Le parent doit être une colonne flex (`flex min-h-full flex-col`) si `pageFills`. */
export function PageBlocks({ page, keyPrefix, quizAnswers, onQuizAnswer }: {
  page: ModulePage; keyPrefix: string; quizAnswers: Record<string, { isCorrect: boolean; score: number | null; selected?: string[] }>; onQuizAnswer: (id: string, isCorrect: boolean, score: number | null, selected?: string[]) => void;
}) {
  const { blocks } = page;
  const fill = pageFills(blocks);
  const center = pageCenters(blocks);
  return <div className={cn('space-y-5', fill && 'flex flex-1 flex-col space-y-0', center && 'flex flex-1 flex-col justify-center space-y-0', page.layout === 'spread' && 'flex flex-1 flex-col justify-evenly gap-5 space-y-0', page.layout === 'center' && 'flex flex-1 flex-col justify-center')}>
    {blocks.map((block) => <div
      key={`${keyPrefix}:${block.id}`}
      className={cn(fill && 'flex flex-1 flex-col', block.type === 'info-card' && block.compact && 'pb-5')}
      style={block.type === 'info-card' && block.spaceAfter !== undefined ? { paddingBottom: block.spaceAfter } : undefined}
    >
      <BlockCard block={block} quizAnswers={quizAnswers} onQuizAnswer={onQuizAnswer} fill={fill} />
    </div>)}
  </div>;
}

/* ─── Main session page ──────────────────────────────────────────────────── */
/** pre → active (patient) → score (patient) → handover (code IDE) → competencies (IDE) → done ; pin-exit = sortie anticipée */
type Phase = 'pre' | 'active' | 'score' | 'handover' | 'competencies' | 'done' | 'pin-exit';

/**
 * Charge le cours (et le patient / parcours hors prévisualisation) avant de monter le lecteur :
 * le chronomètre s'initialise avec la durée du cours.
 */
export default function TrainingSessionPage() {
  const { user } = useAuth();
  const [recoveryPin, setRecoveryPin] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const isPreview = searchParams.get('preview') === '1';
  const moduleId  = searchParams.get('moduleId');
  const patientId = isPreview ? null : searchParams.get('patientId');
  const programId = isPreview ? null : searchParams.get('programId');

  const moduleQuery  = useModule(moduleId);
  const patientQuery = usePatient(patientId);
  const programQuery = useProgram(programId);

  const leaveUnavailableCourse = () => {
    if (user && learnerSessionUrl(user.id)) setRecoveryPin(true);
    else navigate(-1);
  };
  if (recoveryPin) return <PINExitModal onCancel={() => setRecoveryPin(false)} onSuccess={() => {
    unlockLearnerSession();
    navigate('/patients');
  }} />;

  const failed = !moduleId || (!isPreview && (!patientId || !programId)) || moduleQuery.isError || patientQuery.isError || programQuery.isError;
  if (failed) {
    return (
      <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: '#ECF5E9' }}>
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-[#004138]/80">Impossible d'ouvrir ce cours pour ce patient.</p>
        <button onClick={leaveUnavailableCourse} className="h-12 px-6 rounded-2xl bg-white border-2 border-[#004138]/15 text-[#004138] font-semibold">Retour</button>
      </div>
    );
  }

  const module = moduleQuery.data;
  const patient = patientQuery.data;
  const loading = !module || (!isPreview && !patient) || (!!programId && programQuery.isLoading);
  if (loading) {
    return (
      <div className="course-theme fixed inset-0 z-[9999] flex items-center justify-center" role="status" aria-label="Chargement du cours">
        <RefreshCw className="w-8 h-8 text-[#004138]/40 animate-spin" />
      </div>
    );
  }

  if (module.content.length === 0) {
    return (
      <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: '#ECF5E9' }}>
        <BookOpen className="w-10 h-10 text-[#004138]/40" />
        <p className="text-[#004138]/80">Ce cours n'a pas encore de contenu.</p>
        <button onClick={leaveUnavailableCourse} className="h-12 px-6 rounded-2xl bg-white border-2 border-[#004138]/15 text-[#004138] font-semibold">Retour</button>
      </div>
    );
  }

  // Cours suivant : prochain cours sélectionné du parcours
  const selection = programQuery.data?.modules.filter((m) => m.selected) ?? [];
  const currentIndex = selection.findIndex((m) => m.module.id === module.id);
  const next = currentIndex >= 0 ? selection.slice(currentIndex + 1).find((item) => item.status !== 'valide') : undefined;

  return (
    <SessionRunner
      key={`${module.id}:${patientId}:${programId}:${isPreview}`}
      module={{
        id: module.id,
        code: module.code,
        title: module.title,
        estimatedDuration: module.estimatedDuration,
        pages: module.content,
        competencies: module.competencies.map((c) => ({ id: c.id, label: c.label })),
      }}
      patient={patient ? { id: patient.id, firstName: patient.firstName, lastName: patient.lastName } : null}
      isPreview={isPreview}
      programId={programId}
      programPosition={currentIndex >= 0 ? { index: currentIndex, total: selection.length } : null}
      nextModule={next ? { id: next.module.id, title: next.module.title, estimatedDuration: next.module.estimatedDuration } : null}
    />
  );
}

function SessionRunner({
  module, patient, isPreview, programId, programPosition, nextModule,
}: {
  module: PlayerModule;
  patient: PlayerPatient | null;
  isPreview: boolean;
  programId: string | null;
  programPosition: { index: number; total: number } | null;
  nextModule: Pick<PlayerModule, 'id' | 'title' | 'estimatedDuration'> | null;
}) {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const patientName    = patient ? `${patient.firstName} ${patient.lastName}` : '';

  const location = useLocation();
  const { user } = useAuth();
  const allowExit = useRef(false);
  const contentRef = useRef<HTMLElement>(null);
  const startRequested = useRef(false);
  const [restoredExit, setRestoredExit] = useState(location.state?.requestSessionExit === true);
  const blocker = useBlocker(() => !isPreview && !allowExit.current);
  useLayoutEffect(() => {
    if (!isPreview && user) lockLearnerSession(user.id, location.pathname + location.search);
  }, [isPreview, user, location.pathname, location.search]);
  const skipPre = searchParams.get('skipPre') === '1';
  const [phase,        setPhase]        = useState<Phase>((skipPre || isPreview) ? 'active' : 'pre');
  const [pageIndex,    setPageIndex]    = useState(0);
  const [quizAnswers,  setQuizAnswers]  = useState<Record<string, { isCorrect: boolean; score: number | null; selected?: string[] }>>({});
  const [slideClass,   setSlideClass]   = useState('slide-in-right');
  const [animating,    setAnimating]    = useState(false);
  const [paused,       setPaused]       = useState(false);
  const [choices,      setChoices]      = useState<Record<string, boolean>>({});
  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [result,       setResult]       = useState<{ score: number | null; durationSeconds: number } | null>(null);

  const startSession    = useStartSession();
  const validateSession = useValidateSession();
  const interruptSession = useInterruptSession();
  const toggle = useCallback(() => setPaused((p) => !p), []);

  // Le cours est « commencé » dès son lancement : la séance est créée côté serveur, le chronomètre démarre
  useEffect(() => {
    if (isPreview || phase !== 'active' || sessionId || startRequested.current || startSession.isPending || apiError || !patient || !programId) return;
    startRequested.current = true;
    startSession
      .mutateAsync({ patient: `/api/patients/${patient.id}`, module: `/api/modules/${module.id}`, program: `/api/training_programs/${programId}` })
      .then((session) => setSessionId(session.id))
      .catch((err) => setApiError(err instanceof ApiError ? err.message : 'Impossible de démarrer la séance.'));
  }, [isPreview, phase, sessionId, startSession, apiError, patient, programId, module.id]);

  const totalPages  = module.pages.length;
  const currentPage = module.pages[pageIndex];

  // Le chronomètre ne tourne que pendant le cours côté patient (arrêté à la remise de la tablette à l'IDE)
  const { elapsed, mm, ss } = useStopwatch(module.code !== 'PT' && !isPreview && phase === 'active' && !!sessionId && !paused && blocker.state !== 'blocked' && !restoredExit);

  const interactiveTypes = ['quiz', 'reorder', 'fill-blank', 'true-false', 'memory', 'scenario', 'sort-bin', 'yes-no-path', 'tap-sequence', 'categorize'];
  const interactiveBlocks = isPreview ? [] : currentPage.blocks.filter((b) => interactiveTypes.includes(b.type));
  const allQuizAnswered = isPreview || interactiveBlocks.every((block) => {
    const answer = quizAnswers[block.id];
    return !!answer && (block.type !== 'categorize' || answer.score !== null);
  });

  const handleQuizAnswer = (id: string, isCorrect: boolean, score: number | null, selected?: string[]) =>
    setQuizAnswers((p) => ({ ...p, [id]: { isCorrect, score, selected } }));

  const navigatePage = useCallback((dir: 'next' | 'prev') => {
    if (animating || (paused && !isPreview)) return;
    if (dir === 'next' && !allQuizAnswered) return;
    if (dir === 'prev' && pageIndex === 0) return;
    if (dir === 'next' && pageIndex === totalPages - 1) { setPhase(isPreview ? 'done' : 'score'); return; }

    setSlideClass(dir === 'next' ? 'slide-out-left' : 'slide-out-right');
    setAnimating(true);
    setTimeout(() => {
      setPageIndex((i) => dir === 'next' ? i + 1 : i - 1);
      setSlideClass(dir === 'next' ? 'slide-in-right' : 'slide-in-left');
      setTimeout(() => setAnimating(false), 320);
      contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, 270);
  }, [animating, paused, allQuizAnswered, pageIndex, totalPages, isPreview]);

  const { onTouchStart, onTouchEnd } = useSwipe(
    () => navigatePage('next'),
    () => navigatePage('prev'),
  );

  const backToPatient = () => {
    allowExit.current = true;
    unlockLearnerSession();
    exitFullscreen();
    navigate(patient ? `/patients/${patient.id}` : '/patients');
  };

  // Sortie anticipée : la séance n'est pas validée, rien n'est comptabilisé
  const handlePINSuccess = async () => {
    if (sessionId && !result) await interruptSession.mutateAsync(sessionId);
    backToPatient();
  };

  const finishCourse = async () => {
    if (!sessionId) return;
    setApiError(null);
    try {
      const saved = await validateSession.mutateAsync({
        sessionId,
        durationSeconds: elapsed,
        answers: exerciseResults(module.pages, quizAnswers),
        competencies: module.competencies.map((c) => ({ id: c.id, validated: choices[c.id] })),
      });
      setResult({ score: saved.score, durationSeconds: saved.durationSeconds });
      setPhase('done');
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Enregistrement impossible, réessayez.');
    }
  };

  const handleNextModule = () => {
    if (!nextModule || !patient || !programId) return;
    allowExit.current = true;
    unlockLearnerSession();
    navigate(`/sessions/run?patientId=${patient.id}&moduleId=${nextModule.id}&programId=${programId}&skipPre=1`);
  };

  if (blocker.state === 'blocked' || restoredExit) {
    return <PINExitModal
      onSuccess={handlePINSuccess}
      onCancel={() => { if (blocker.state === 'blocked') blocker.reset(); setRestoredExit(false); }}
    />;
  }

  /* ── Pre-session ──────────────────────────────────────────────────── */
  if (phase === 'pre') {
    return (
      <PreSessionScreen
        patientFirstName={patient?.firstName ?? ''}
        patientLastName={patient?.lastName ?? ''}
        moduleTitle={module.title}
        modulePages={module.pages.length}
        moduleDuration={module.estimatedDuration}
        competencies={module.competencies}
        parcoursTitle={programPosition ? "Parcours d'entraînement" : undefined}
        parcoursModuleIndex={programPosition?.index}
        parcoursModuleTotal={programPosition?.total}
        onStart={() => setPhase('active')}
      />
    );
  }

  /* ── Completion ───────────────────────────────────────────────────── */
  if (phase === 'done') {
    if (isPreview) {
      return (
        <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8" style={{ background: '#ECF5E9' }}>
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#004138] mb-2">Prévisualisation terminée</h2>
            <p className="text-[#004138]/70 course-label">Vous avez parcouru toutes les pages du cours « {module.title} »</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="h-14 px-6 rounded-full bg-[#E86825] hover:bg-[#CC5518] text-white font-semibold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-900/10"
          >
            <BookOpen className="w-5 h-5" />
            Retour
          </button>
        </div>
      );
    }
    if (!patient || !result) return null;
    return (
      <ModuleCompletionScreen
        patient={patient}
        module={module}
        score={result.score}
        elapsedSeconds={result.durationSeconds}
        nextModuleName={nextModule?.title}
        nextModuleDuration={nextModule?.estimatedDuration}
        onNext={nextModule ? handleNextModule : undefined}
        onRequestExit={backToPatient}
        competencies={{ validated: module.competencies.filter((c) => choices[c.id]).length, total: module.competencies.length }}
      />
    );
  }

  /* ── Score final, côté patient ────────────────────────────────────── */
  if (phase === 'score') {
    const results = exerciseResults(module.pages, quizAnswers);
    const total = results.reduce((sum, r) => sum + r.total, 0);
    const score = total ? Math.round((100 * results.reduce((sum, r) => sum + r.correct, 0)) / total) : null;
    return <PatientScoreScreen score={score} onFinish={() => setPhase('handover')} />;
  }

  /* ── Fin du contenu : la tablette revient à l'IDE (code demandé) ───── */
  if (phase === 'handover') {
    return (
      <PINExitModal
        title="Fin du cours"
        subtitle="Rendez la tablette à l'IDE : son code est demandé pour valider la séance."
        onSuccess={() => setPhase('competencies')}
        onCancel={() => setPhase('score')}
      />
    );
  }

  if (phase === 'competencies') {
    return (
      <CompetencyValidationScreen
        moduleTitle={module.title}
        patientName={patientName}
        competencies={module.competencies}
        choices={choices}
        onChoose={(id, validated) => setChoices((c) => ({ ...c, [id]: validated }))}
        onFinish={finishCourse}
        onBack={() => setPhase('active')}
        saving={validateSession.isPending}
        error={apiError}
      />
    );
  }

  /* ── PIN exit ─────────────────────────────────────────────────────── */
  if (phase === 'pin-exit') {
    return (
      <PINExitModal
        onSuccess={handlePINSuccess}
        onCancel={() => setPhase('active')}
      />
    );
  }

  /* ── Active session ───────────────────────────────────────────────── */
  const overEstimate = elapsed > module.estimatedDuration * 60;

  // Séance en cours de création (ou refusée par le serveur)
  if (!isPreview && !sessionId) {
    return (
      <div className="course-theme session-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: '#ECF5E9' }}>
        {apiError ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-[#004138]/80 max-w-sm">{apiError}</p>
            <button onClick={backToPatient} className="h-12 px-6 rounded-2xl bg-white border-2 border-[#004138]/15 text-[#004138] font-semibold">Retour à la fiche patient</button>
          </>
        ) : (
          <RefreshCw className="w-8 h-8 text-[#004138]/40 animate-spin" />
        )}
      </div>
    );
  }

  // Page réduite à des cartes à retourner : elles occupent toute la place disponible
  const fillPage = pageStretches(currentPage);

  return (
    <div className="course-theme fixed inset-0 z-[9999] flex flex-col" style={{ userSelect: 'none', background: '#ECF5E9' }}>

      {/* ── Header (carte arrondie, flottante) ──────────────────────── */}
      <CourseHeader page={currentPage} pageNumber={pageIndex + 1} totalPages={totalPages} actions={<>
            {isPreview ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 h-11 px-4 rounded-full bg-white/10 text-white/60 hover:bg-white/15 transition-all touch-manipulation"
              >
                <span className="course-label font-medium">Fermer l’aperçu</span>
              </button>
            ) : (
              <>
                {module.code !== 'PT' && <div
                  className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all', overEstimate ? 'bg-amber-500/20' : 'bg-white/10')}
                  title={`Durée indicative : ${module.estimatedDuration} min`}
                >
                  <Clock className={cn('w-4 h-4', overEstimate ? 'text-amber-300' : 'text-white/80')} />
                  <span className={cn('font-medium course-label font-sans leading-none tabular-nums', overEstimate ? 'text-amber-300' : 'text-white/80')}>{mm}:{ss}</span>
                </div>}
                <button
                  onClick={toggle}
                  className={cn(
                    'h-11 px-3 rounded-full flex items-center justify-center gap-2 course-label font-medium transition-all touch-manipulation',
                    paused ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-white/10 text-white/60 hover:bg-white/15'
                  )}
                >
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{paused ? 'Reprendre' : 'Pause'}</span>
                </button>
              </>
            )}
      </>} />

      {/* ── Content (défile ; la navigation reste fixée en bas, hors du défilement) ── */}
      <main ref={contentRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={cn('mx-4 sm:mx-10 py-5 [@media(max-height:820px)]:py-3', fillPage && 'flex min-h-full flex-col', slideClass)}>
          <PageBlocks page={currentPage} keyPrefix={currentPage.id} quizAnswers={quizAnswers} onQuizAnswer={handleQuizAnswer} />

          {pageIndex === 0 && totalPages > 1 && currentPage.showSwipeHint !== false && (
            <div className="flex items-center justify-center gap-3 pt-4 text-[#004138]/35">
              <ChevronLeft className="w-4 h-4" />
              <p className="course-caption font-medium">Glissez pour naviguer</p>
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </main>

      {/* ── Navigation (toujours calée en bas, hors du contenu défilant) ── */}
      <CourseNavigation
        onPrevious={() => navigatePage('prev')}
        onNext={() => navigatePage('next')}
        previousDisabled={pageIndex === 0 || animating || (!isPreview && paused)}
        nextDisabled={(!allQuizAnswered && !isPreview) || animating || (!isPreview && paused)}
        nextLabel={paused && !isPreview ? 'Séance en pause' : pageIndex === totalPages - 1 ? 'Terminer' : 'Page suivante'}
      />

      {/* ── Pause overlay ────────────────────────────────────────── */}
      {paused && !isPreview && (
        <PauseOverlay
          mm={mm}
          ss={ss}
          moduleName={module.title}
          patientName={patientName}
          onResume={toggle}
          onRequestExit={() => { toggle(); setPhase('pin-exit'); }}
        />
      )}

    </div>
  );
}
