import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInterruptSession, useModule, usePatient, useProgram, useStartSession, useValidateSession, verifySecurityCode } from '../api/hooks';
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
  ChevronLeft, ChevronRight, X, Info, AlertTriangle,
  Lightbulb, CheckCircle2, BookOpen, ZoomIn, Pause, Play, Clock,
  AlertCircle, Route, Shield, Delete, ArrowRight, MapPin, Maximize,
  ExternalLink, RefreshCw,
} from 'lucide-react';
import type {
  ModulePage,
  ContentBlock, TextBlock, ImageBlock, InfoCardBlock,
  TimelineBlock, HotspotBlock, IframeBlock, FlipCardsBlock,
} from '../types';
// New block types are imported by their component props; no extra type imports needed here.
import { cn } from '../lib/utils';

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
    <p className="text-[18px] leading-[1.75] text-white/80 tracking-[-0.01em] whitespace-pre-line">{block.content}</p>
  );
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <figure className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl bg-white/5 cursor-zoom-in" onClick={() => setZoomed(true)}>
          <img src={block.url} alt={block.alt} className="w-full object-contain max-h-72 transition-transform duration-300 hover:scale-[1.02]" loading="lazy" />
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl p-2">
            <ZoomIn className="w-4 h-4 text-white/80" />
          </div>
        </div>
        {block.caption && <figcaption className="text-sm text-white/40 text-center font-medium italic px-2">{block.caption}</figcaption>}
      </figure>
      {zoomed && (
        <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors" onClick={() => setZoomed(false)}>
            <X className="w-6 h-6" />
          </button>
          <img src={block.url} alt={block.alt} className="max-w-full max-h-[90vh] rounded-2xl object-contain fade-scale-in" onClick={(e) => e.stopPropagation()} />
          {block.caption && <p className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm">{block.caption}</p>}
        </div>
      )}
    </>
  );
}

function InfoCardView({ block }: { block: InfoCardBlock }) {
  const configs = {
    info:    { icon: Info,          bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', title: 'text-sky-300', body: 'text-sky-200/80' },
    warning: { icon: AlertTriangle, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', title: 'text-amber-300', body: 'text-amber-200/80' },
    success: { icon: CheckCircle2,  bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', title: 'text-emerald-300', body: 'text-emerald-200/80' },
    tip:     { icon: Lightbulb,     bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', title: 'text-violet-300', body: 'text-violet-200/80' },
  };
  const c = configs[block.variant];
  const Icon = c.icon;
  return (
    <div className="rounded-3xl p-6 flex gap-4" style={{ backgroundColor: c.bg, border: `1.5px solid ${c.border}` }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: c.bg }}>
        <Icon className={cn('w-5 h-5', c.title)} />
      </div>
      <div>
        <p className={cn('font-bold text-lg mb-1.5', c.title)}>{block.title}</p>
        <p className={cn('text-base leading-relaxed', c.body)}>{block.content}</p>
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
    <div className="rounded-3xl overflow-hidden bg-gray-900 shadow-xl">
      {block.title && (
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <div className="w-1.5 h-6 rounded-full bg-orange-500" />
          <span className="text-white font-bold text-base">{block.title}</span>
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
                <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ backgroundColor: 'rgba(249,115,22,0.25)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)' }}>
                  {item.tag}
                </span>
              )}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-orange-400 font-black text-lg"
                  style={{ backgroundColor: 'rgba(249,115,22,0.2)', border: '2px solid rgba(249,115,22,0.5)' }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-black text-xl leading-tight mb-1.5">{item.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.content}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => scrollTo(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/60 disabled:opacity-30 transition-opacity touch-manipulation"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {block.items.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)} className={cn(
              'rounded-full transition-all duration-300 touch-manipulation',
              i === activeIdx ? 'w-6 h-2.5 bg-orange-500' : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/40'
            )} />
          ))}
        </div>
        <button
          onClick={() => scrollTo(Math.min(block.items.length - 1, activeIdx + 1))}
          disabled={activeIdx === block.items.length - 1}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/60 disabled:opacity-30 transition-opacity touch-manipulation"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
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
  const active = block.hotspots.find((h) => h.id === activeId) ?? null;

  return (
    <div className="rounded-3xl overflow-hidden bg-white ring-1 ring-gray-100/80 shadow-sm">
      {/* Image with markers */}
      <div className="relative select-none" onClick={() => setActiveId(null)}>
        <img src={block.imageUrl} alt={block.alt} className="w-full object-cover" style={{ maxHeight: 280 }} loading="lazy" />
        {activeId && <div className="absolute inset-0 bg-black/30 transition-opacity" />}
        {block.hotspots.map((hs, i) => (
          <button
            key={hs.id}
            onClick={(e) => { e.stopPropagation(); setActiveId(hs.id === activeId ? null : hs.id); }}
            className={cn(
              'absolute flex items-center justify-center rounded-full font-black text-xs shadow-lg transition-all duration-200 touch-manipulation',
              hs.id === activeId
                ? 'w-9 h-9 bg-orange-500 text-white scale-110 ring-4 ring-orange-300/60'
                : 'w-8 h-8 bg-white/90 text-orange-600 hover:scale-110 ring-2 ring-orange-400/60'
            )}
            style={{ left: `calc(${hs.x}% - 16px)`, top: `calc(${hs.y}% - 16px)`, zIndex: hs.id === activeId ? 20 : 10 }}
          >
            {i + 1}
            {hs.id !== activeId && (
              <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" style={{ animationDuration: `${1.5 + i * 0.4}s` }} />
            )}
          </button>
        ))}
      </div>

      {block.caption && (
        <p className="text-xs text-gray-400 text-center px-5 pt-3 pb-1 font-medium italic flex items-center justify-center gap-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />{block.caption}
        </p>
      )}

      {/* Info panel */}
      <div className={cn('transition-all duration-300 overflow-hidden', active ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0')}>
        {active && (
          <div className="mx-4 mb-4 mt-2 rounded-2xl p-4" style={{ backgroundColor: '#fff7ed', border: '1.5px solid #fed7aa' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-black">{block.hotspots.findIndex((h) => h.id === active.id) + 1}</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">{active.label}</p>
              </div>
              <button onClick={() => setActiveId(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 touch-manipulation">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed pl-9">{active.description}</p>
          </div>
        )}
      </div>

      {/* Hotspot buttons */}
      <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2">
        {block.hotspots.map((hs, i) => (
          <button
            key={hs.id}
            onClick={() => setActiveId(hs.id === activeId ? null : hs.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all touch-manipulation',
              hs.id === activeId
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-gray-50 text-gray-700 hover:bg-orange-50 ring-1 ring-gray-100'
            )}
          >
            <span className={cn('w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
              hs.id === activeId ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600')}>{i + 1}</span>
            <span className="text-xs font-semibold truncate">{hs.label}</span>
          </button>
        ))}
      </div>
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
    <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/50" />
          <span className="w-3 h-3 rounded-full bg-amber-500/50" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-white/40 truncate font-mono">{block.url}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-all touch-manipulation"
            title="Recharger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-all touch-manipulation"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(0,38,31,0.8)' }}>
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center animate-pulse">
              <BookOpen className="w-6 h-6 text-orange-400" />
            </div>
            <div className="space-y-2 w-48">
              <div className="h-2 rounded-full bg-white/10 animate-pulse" />
              <div className="h-2 rounded-full bg-white/8 animate-pulse w-3/4 mx-auto" />
            </div>
            <p className="text-white/30 text-xs">Chargement du contenu…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(0,38,31,0.95)' }}>
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Contenu inaccessible</p>
              <p className="text-white/40 text-sm">Ce site bloque l'intégration dans une page.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={reload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 text-white/60 hover:bg-white/12 text-sm font-medium transition-all touch-manipulation">
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              <a href={block.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 text-sm font-medium transition-all touch-manipulation">
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
        <p className="text-xs text-white/30 text-center px-5 py-3 italic" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {block.caption}
        </p>
      )}
    </div>
  );
}

/* ─── Pre-session screen ─────────────────────────────────────────────────── */
function PreSessionScreen({
  patientFirstName, patientLastName,
  moduleTitle, modulePages, moduleDuration,
  parcoursTitle, parcoursModuleIndex, parcoursModuleTotal,
  onStart,
}: {
  patientFirstName: string; patientLastName: string;
  moduleTitle: string; modulePages: number; moduleDuration: number;
  parcoursTitle?: string; parcoursModuleIndex?: number; parcoursModuleTotal?: number;
  onStart: () => void;
}) {
  const handleStart = () => {
    requestFullscreen();
    onStart();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-auto" style={{ userSelect: 'none', background: 'radial-gradient(ellipse at top, #004138 0%, #001A16 70%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #E86825 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-10 shadow-2xl shadow-orange-900/50">
        <BookOpen className="w-10 h-10 text-white" />
        <div className="absolute -inset-1 rounded-3xl bg-orange-500/20 animate-pulse" />
      </div>

      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Prêt à commencer ?</h1>
      <p className="text-white/40 text-lg mb-10">
        {patientFirstName} {patientLastName}
      </p>

      {/* Module info card */}
      <div className="w-full max-w-sm rounded-3xl p-6 mb-6 space-y-3 text-left backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        {parcoursTitle && (
          <div className="flex items-center gap-2 text-orange-400 mb-4">
            <Route className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold truncate">{parcoursTitle}</span>
            {parcoursModuleIndex !== undefined && parcoursModuleTotal !== undefined && (
              <span className="ml-auto text-white/30 text-xs whitespace-nowrap">
                Module {parcoursModuleIndex + 1}/{parcoursModuleTotal}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1))' }}>
            <BookOpen className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg truncate">{moduleTitle}</p>
            <p className="text-white/40 text-sm">{modulePages} pages · {moduleDuration} min</p>
          </div>
        </div>
      </div>

      {/* Sortie protégée : le code n'est jamais affiché à l'écran (le patient pourrait le voir) */}
      <div className="w-full max-w-sm rounded-3xl p-5 mb-10 backdrop-blur-sm flex items-start gap-3 text-left" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'rgba(252,211,77,0.8)' }}>
          Pour quitter la séance, votre code de sécurité personnel vous sera demandé.
        </p>
      </div>

      <button
        onClick={handleStart}
        className="w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xl flex items-center justify-center gap-3 shadow-2xl shadow-orange-900/40 active:scale-[0.97] transition-transform touch-manipulation"
      >
        <Maximize className="w-5 h-5 opacity-70" />
        Commencer la séance
        <ArrowRight className="w-6 h-6" />
      </button>
      <p className="text-white/20 text-xs mt-3">La séance s'ouvrira en plein écran</p>
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
  onSuccess: () => void;
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
      onSuccess();
    } catch (err) {
      setShake(true);
      setMessage(err instanceof ApiError && err.status === 429 ? 'Trop de tentatives. Réessayez dans 15 minutes.' : 'Code incorrect');
      setTimeout(() => { setEntered(''); setShake(false); }, 600);
    } finally {
      setChecking(false);
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

  return (
    <div className="fixed inset-0 z-[10000] backdrop-blur-md flex flex-col items-center justify-center px-6 fade-scale-in" style={{ backgroundColor: 'rgba(0,26,22,0.98)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <Shield className="w-7 h-7 text-amber-400" />
      </div>

      <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
      <p className="text-white/40 text-sm mb-8 text-center max-w-xs">{subtitle}</p>

      {/* Dots */}
      <div className={cn('flex items-center gap-4 mb-3', shake && 'shake')}>
        {[0,1,2,3,4,5].map((i) => (
          <div
            key={i}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all duration-150',
              i < entered.length ? 'bg-orange-500 border-orange-500 scale-110' : 'bg-transparent border-white/30',
              i >= 4 && i >= entered.length && 'opacity-40'
            )}
          />
        ))}
      </div>
      <p className="h-6 mb-4 text-sm text-red-400">{message}</p>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k) => {
          if (k === '⌫') return (
            <button
              key={k}
              onClick={del}
              aria-label="Effacer"
              className="h-16 rounded-2xl flex items-center justify-center text-white/50 active:opacity-70 transition-opacity touch-manipulation"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
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
              className="h-16 rounded-2xl flex items-center justify-center bg-orange-500 text-white disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
            >
              {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
            </button>
          );
          return (
            <button
              key={k}
              onClick={() => press(k)}
              className="h-16 rounded-2xl text-white text-2xl font-bold active:opacity-70 active:scale-95 transition-all touch-manipulation"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {k}
            </button>
          );
        })}
      </div>

      <button
        onClick={onCancel}
        className="mt-8 text-white/30 text-sm hover:text-white/50 transition-colors touch-manipulation"
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
    <div className="fixed inset-0 z-[10000] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center px-8 fade-scale-in">
      <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-8">
        <Pause className="w-12 h-12 text-white" />
      </div>

      <h2 className="text-4xl font-black text-white mb-2">Séance en pause</h2>
      <p className="text-white/50 text-base mb-10 text-center">{moduleName} · {patientName}</p>

      <div className="flex items-center gap-3 bg-white/10 px-8 py-5 rounded-3xl mb-12">
        <Clock className="w-6 h-6 text-white/60" />
        <span className="text-5xl font-black text-white tracking-tight font-mono">{mm}:{ss}</span>
        <span className="text-white/40 text-sm font-semibold">écoulé</span>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onResume}
          className="w-full h-16 rounded-2xl bg-orange-500 text-white font-bold text-xl flex items-center justify-center gap-3 shadow-lg shadow-orange-900/30 active:scale-[0.98] transition-transform touch-manipulation"
        >
          <Play className="w-6 h-6" />
          Reprendre la séance
        </button>
        <button
          onClick={onRequestExit}
          className="w-full h-14 rounded-2xl border border-white/20 text-white/60 font-semibold text-base hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation flex items-center justify-center gap-2"
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
  if (style.touchAction === 'none') return true;
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-auto" style={{ userSelect: 'none', background: 'radial-gradient(ellipse at center, #004138 0%, #001A16 80%)' }}>
      <div className={cn(
        'w-28 h-28 rounded-full flex items-center justify-center mb-8 pop-in shadow-2xl',
        isExcellent ? 'bg-emerald-500/20 shadow-emerald-500/20' : isGood ? 'bg-amber-500/20 shadow-amber-500/20' : 'bg-red-500/20 shadow-red-500/20'
      )}>
        <CheckCircle2 className={cn('w-14 h-14 check-bounce', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')} />
      </div>

      <h1 className="text-4xl font-black text-white mb-2">Cours validé</h1>
      <p className="text-white/40 text-base mb-8">{patient.firstName} {patient.lastName} · {module.title}</p>

      {/* Score + time */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          'w-32 h-32 rounded-full flex flex-col items-center justify-center border-4',
          isExcellent ? 'border-emerald-400/60 bg-emerald-500/10' : isGood ? 'border-amber-400/60 bg-amber-500/10' : 'border-red-400/60 bg-red-500/10'
        )}>
          <span className={cn('text-3xl font-black leading-none', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')}>{score === null ? '—' : `${score}%`}</span>
          <span className="text-xs font-semibold text-white/40 mt-1 uppercase tracking-wider">Score</span>
        </div>
        <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 border-white/10 bg-white/5">
          <span className="text-2xl font-black text-white leading-none font-mono">{mm}:{ss}</span>
          <span className="text-xs font-semibold text-white/40 mt-1 uppercase tracking-wider">Durée</span>
        </div>
      </div>

      <p className={cn('text-base font-semibold mb-1', isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-400')}>
        {score === null ? 'Cours sans exercice noté' : isExcellent ? 'Excellent résultat !' : isGood ? 'Bon résultat' : 'À améliorer'}
      </p>
      {competencies && competencies.total > 0 && (
        <p className="text-white/70 text-sm mb-2">{competencies.validated} compétence(s) sur {competencies.total} validée(s)</p>
      )}
      <p className="text-white/40 text-sm max-w-xs mb-10">
        {score === null ? 'Durée et compétences enregistrées.' : isExcellent ? 'Contenu parfaitement assimilé.' : isGood ? 'Certains points à revoir.' : 'Révision approfondie recommandée.'}
      </p>

      <div className="w-full max-w-sm space-y-3">
        {onNext && nextModuleName && (
          <button
            onClick={onNext}
            className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/20 active:scale-[0.98] transition-transform touch-manipulation"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-normal opacity-75 mb-0.5">Cours suivant (rendre la tablette au patient)</p>
              <p className="truncate">{nextModuleName}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {nextModuleDuration && <span className="text-xs opacity-75">{nextModuleDuration} min</span>}
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        )}
        <button
          onClick={onRequestExit}
          className={cn(
            'w-full rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors touch-manipulation',
            onNext
              ? 'h-12 border border-white/10 text-white/50 hover:bg-white/5 active:bg-white/10'
              : 'h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base shadow-2xl shadow-orange-500/20 active:scale-[0.98]'
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #004138 0%, #001A16 80%)' }}>
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
      <p className="text-white/60 text-lg font-semibold uppercase tracking-widest mb-4">Vous avez obtenu le score de</p>
      <p className="text-8xl font-black text-white mb-4 pop-in">{score === null ? '—' : `${score} %`}</p>
      <p className="text-white/50 text-base mb-12">{score === null ? 'Ce cours ne comporte pas de quiz noté.' : celebrate ? 'Bravo !' : 'Merci pour votre participation.'}</p>
      <button
        onClick={onFinish}
        className="w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xl shadow-2xl active:scale-[0.97] transition-transform touch-manipulation"
      >
        Fin du cours
      </button>
      <p className="text-white/30 text-xs mt-3">Rendez la tablette à votre infirmière</p>
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
    // Fond neutre, distinct des écrans patient (storyboard : l'IDE doit voir que cet écran ne s'adresse pas au patient)
    <div className="fixed inset-0 z-[9999] overflow-auto" style={{ background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)' }}>
      <div className="h-1.5 bg-amber-400" />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2 text-amber-300">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Espace IDE</span>
        </div>
        <h1 className="text-3xl font-black text-white">Compétences d'entraînement</h1>
        <p className="text-white/50 mt-1 mb-8">{moduleTitle} · {patientName}</p>

        {competencies.length === 0 && (
          <p className="text-white/50 mb-8">Ce cours ne comporte pas de compétence à valider.</p>
        )}

        <div className="space-y-3 mb-10">
          {competencies.map((competency) => (
            <div key={competency.id} className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white text-base mb-4">{competency.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => onChoose(competency.id, value)}
                    className={cn(
                      'h-12 rounded-xl font-semibold text-sm transition-all touch-manipulation',
                      choices[competency.id] === value
                        ? value ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    )}
                  >
                    {value ? 'Validée' : 'Non validée'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <p className="text-white/40 text-xs mb-3">
          Valider les compétences ne suffit pas : « Terminer le cours » enregistre la séance (durée, score, compétences).
        </p>
        {confirming && (
          <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center px-6">
            <div className="w-full max-w-sm rounded-3xl bg-[#00261F] border border-white/10 p-6 text-center">
              <p className="text-white text-lg font-bold mb-2">Clôturer la séance ?</p>
              <p className="text-white/60 text-sm mb-6">
                {competencies.length ? `${validatedCount} compétence(s) validée(s) sur ${competencies.length}. ` : ''}
                La durée et le score seront enregistrés ; cette action est définitive.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConfirming(false)} className="h-12 rounded-xl bg-white/10 text-white/70 font-semibold">Annuler</button>
                <button onClick={() => { setConfirming(false); onFinish(); }} className="h-12 rounded-xl bg-emerald-500 text-white font-semibold">Confirmer</button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirming(true)}
          disabled={!complete || saving}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-30 active:scale-[0.98] transition-all touch-manipulation"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
          Terminer le cours
        </button>
        <button onClick={onBack} className="w-full mt-4 text-white/40 text-sm touch-manipulation">Revenir au contenu du cours</button>
      </div>
    </div>
  );
}

/* ─── Block card ─────────────────────────────────────────────────────────── */
function BlockCard({
  block, quizAnswers, onQuizAnswer,
}: {
  block: ContentBlock;
  quizAnswers: Record<string, { isCorrect: boolean; score: number }>;
  onQuizAnswer: (id: string, isCorrect: boolean, score: number) => void;
}) {
  if (block.type === 'text')
    return <div className="rounded-3xl p-7" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><TextBlockView block={block} /></div>;
  if (block.type === 'image')
    return <div className="rounded-3xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><ImageBlockView block={block} /></div>;
  if (block.type === 'info-card')
    return <InfoCardView block={block} />;
  if (block.type === 'timeline')
    return <TimelineBlockView block={block} />;
  if (block.type === 'hotspot')
    return <HotspotBlockView block={block} />;
  if (block.type === 'iframe')
    return <IframeBlockView block={block} />;
  if (block.type === 'quiz')
    return (
      <div className="rounded-3xl p-7" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderTop: '3px solid rgba(249,115,22,0.6)' }}>
        <QuizComponent
          block={block}
          onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)}
          disabled={!!quizAnswers[block.id]}
        />
      </div>
    );

  /* ── New interactive blocks ── */
  const interactiveWrapper = (children: React.ReactNode) => (
    <div className="rounded-3xl p-7" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderTop: '3px solid rgba(99,102,241,0.5)' }}>
      {children}
    </div>
  );

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
    return interactiveWrapper(<FlipCardsView block={block as FlipCardsBlock} />);
  if (block.type === 'categorize')
    return interactiveWrapper(<CategorizeView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);
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
    return interactiveWrapper(<CarouselView block={block} />);
  if (block.type === 'yes-no-path')
    return interactiveWrapper(<YesNoPathView block={block} onAnswer={(isCorrect, score) => onQuizAnswer(block.id, isCorrect, score)} disabled={!!quizAnswers[block.id]} />);

  return null;
}

/* ─── Main session page ──────────────────────────────────────────────────── */
/** pre → active (patient) → score (patient) → handover (code IDE) → competencies (IDE) → done ; pin-exit = sortie anticipée */
type Phase = 'pre' | 'active' | 'score' | 'handover' | 'competencies' | 'done' | 'pin-exit';

/**
 * Charge le cours (et le patient / parcours hors prévisualisation) avant de monter le lecteur :
 * le chronomètre s'initialise avec la durée du cours.
 */
export default function TrainingSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const isPreview = searchParams.get('preview') === '1';
  const moduleId  = searchParams.get('moduleId');
  const patientId = isPreview ? null : searchParams.get('patientId');
  const programId = isPreview ? null : searchParams.get('programId');

  const moduleQuery  = useModule(moduleId);
  const patientQuery = usePatient(patientId);
  const programQuery = useProgram(programId);

  const failed = !moduleId || (!isPreview && !patientId) || moduleQuery.isError || patientQuery.isError;
  if (failed) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-white/70">Impossible d'ouvrir ce cours pour ce patient.</p>
        <button onClick={() => navigate(-1)} className="h-12 px-6 rounded-2xl bg-white/10 text-white font-semibold">Retour</button>
      </div>
    );
  }

  const module = moduleQuery.data;
  const patient = patientQuery.data;
  const loading = !module || (!isPreview && !patient) || (!!programId && programQuery.isLoading);
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>
        <RefreshCw className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (module.content.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>
        <BookOpen className="w-10 h-10 text-white/40" />
        <p className="text-white/70">Ce cours n'a pas encore de contenu.</p>
        <button onClick={() => navigate(-1)} className="h-12 px-6 rounded-2xl bg-white/10 text-white font-semibold">Retour</button>
      </div>
    );
  }

  // Cours suivant : prochain cours sélectionné du parcours
  const selection = programQuery.data?.modules.filter((m) => m.selected) ?? [];
  const currentIndex = selection.findIndex((m) => m.module.id === module.id);
  const next = currentIndex >= 0 ? selection[currentIndex + 1] : undefined;

  return (
    <SessionRunner
      key={module.id}
      module={{
        id: module.id,
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

  const skipPre = searchParams.get('skipPre') === '1';
  const [phase,        setPhase]        = useState<Phase>((skipPre || isPreview) ? 'active' : 'pre');
  const [pageIndex,    setPageIndex]    = useState(0);
  const [quizAnswers,  setQuizAnswers]  = useState<Record<string, { isCorrect: boolean; score: number }>>({});
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
    if (isPreview || phase !== 'active' || sessionId || startSession.isPending || apiError || !patient || !programId) return;
    startSession
      .mutateAsync({ patient: `/api/patients/${patient.id}`, module: `/api/modules/${module.id}`, program: `/api/training_programs/${programId}` })
      .then((session) => setSessionId(session.id))
      .catch((err) => setApiError(err instanceof ApiError ? err.message : 'Impossible de démarrer la séance.'));
  }, [isPreview, phase, sessionId, startSession, apiError, patient, programId, module.id]);

  const totalPages  = module.pages.length;
  const currentPage = module.pages[pageIndex];
  const progress    = Math.round(((pageIndex + 1) / totalPages) * 100);

  // Le chronomètre ne tourne que pendant le cours côté patient (arrêté à la remise de la tablette à l'IDE)
  const { elapsed, mm, ss } = useStopwatch(!isPreview && phase === 'active' && !!sessionId && !paused);

  const interactiveTypes = ['quiz', 'reorder', 'fill-blank', 'true-false', 'memory', 'scenario', 'sort-bin', 'yes-no-path', 'tap-sequence', 'categorize'];
  const interactiveBlocks = isPreview ? [] : currentPage.blocks.filter((b) => interactiveTypes.includes(b.type));
  const allQuizAnswered = isPreview || interactiveBlocks.length === 0 || interactiveBlocks.every((b) => quizAnswers[b.id] !== undefined);

  const handleQuizAnswer = (id: string, isCorrect: boolean, score: number) =>
    setQuizAnswers((p) => ({ ...p, [id]: { isCorrect, score } }));

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
      window.scrollTo({ top: 0 });
    }, 270);
  }, [animating, paused, allQuizAnswered, pageIndex, totalPages, isPreview]);

  const { onTouchStart, onTouchEnd } = useSwipe(
    () => navigatePage('next'),
    () => navigatePage('prev'),
  );

  const backToPatient = () => { exitFullscreen(); navigate(patient ? `/patients/${patient.id}` : '/patients'); };

  // Sortie anticipée : la séance n'est pas validée, rien n'est comptabilisé
  const handlePINSuccess = async () => {
    if (sessionId) await interruptSession.mutateAsync(sessionId).catch(() => {});
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
    navigate(`/sessions/run?patientId=${patient.id}&moduleId=${nextModule.id}&programId=${programId}&skipPre=1`);
  };

  /* ── Pre-session ──────────────────────────────────────────────────── */
  if (phase === 'pre') {
    return (
      <PreSessionScreen
        patientFirstName={patient?.firstName ?? ''}
        patientLastName={patient?.lastName ?? ''}
        moduleTitle={module.title}
        modulePages={module.pages.length}
        moduleDuration={module.estimatedDuration}
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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8" style={{ background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Prévisualisation terminée</h2>
            <p className="text-white/50 text-sm">Vous avez parcouru toutes les pages du cours « {module.title} »</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="h-14 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
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
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>
        {apiError ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white/80 max-w-sm">{apiError}</p>
            <button onClick={backToPatient} className="h-12 px-6 rounded-2xl bg-white/10 text-white font-semibold">Retour à la fiche patient</button>
          </>
        ) : (
          <RefreshCw className="w-8 h-8 text-white/40 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ userSelect: 'none', background: 'linear-gradient(180deg, #00261F 0%, #004138 100%)' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="flex-shrink-0" style={{ background: 'rgba(0,38,31,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => { if (!paused) toggle(); }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white/50 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base truncate leading-tight">{module.title}</p>
            <p className="text-sm text-white/40 truncate">
              {isPreview ? 'Mode prévisualisation' : patientName}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isPreview ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/10 text-white/60 hover:bg-white/15 transition-all touch-manipulation"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-semibold">Quitter</span>
              </button>
            ) : (
              <>
                <div
                  className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-2xl transition-all', overEstimate ? 'bg-amber-500/20' : 'bg-white/10')}
                  title={`Durée indicative : ${module.estimatedDuration} min`}
                >
                  <Clock className={cn('w-4 h-4', overEstimate ? 'text-amber-300' : 'text-white/80')} />
                  <span className={cn('font-black text-lg font-mono leading-none tabular-nums', overEstimate ? 'text-amber-300' : 'text-white/80')}>{mm}:{ss}</span>
                </div>
                <button
                  onClick={toggle}
                  className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center transition-all touch-manipulation',
                    paused ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-white/10 text-white/60 hover:bg-white/15'
                  )}
                >
                  {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 bg-white/5">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Page dots */}
        <div className="flex items-center justify-center gap-2 py-2.5">
          {module.pages.map((_, i) => (
            <div key={i} className={cn(
              'rounded-full transition-all duration-300',
              i === pageIndex ? 'w-8 h-2.5 bg-orange-500' :
              i < pageIndex   ? 'w-2.5 h-2.5 bg-orange-400/60' : 'w-2.5 h-2.5 bg-white/15'
            )} />
          ))}
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={pageIndex} className={cn('max-w-2xl mx-auto px-5 py-8', slideClass)}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Partie {pageIndex + 1}</p>
              <h1 className="text-2xl font-black text-white leading-tight">{currentPage.title}</h1>
            </div>
          </div>

          <div className="space-y-5 pb-36">
            {currentPage.blocks.map((block: ContentBlock, i: number) => (
              <div key={block.id} className="fade-scale-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                <BlockCard block={block} quizAnswers={quizAnswers} onQuizAnswer={handleQuizAnswer} />
              </div>
            ))}
          </div>

          {pageIndex === 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 text-white/20">
              <ChevronLeft className="w-4 h-4" />
              <p className="text-xs font-medium">Glissez pour naviguer</p>
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom nav ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0" style={{ background: 'rgba(0,38,31,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigatePage('prev')}
            disabled={pageIndex === 0 || animating || (!isPreview && paused)}
            className="flex items-center gap-2 h-14 px-5 rounded-2xl border border-white/10 font-semibold text-white/50 hover:bg-white/5 active:bg-white/10 disabled:opacity-30 transition-all touch-manipulation flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          <button
            onClick={() => navigatePage('next')}
            disabled={(!allQuizAnswered && !isPreview) || animating || (!isPreview && paused)}
            className={cn(
              'flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all touch-manipulation shadow-lg',
              paused && !isPreview
                ? 'bg-white/5 text-white/30 shadow-none cursor-not-allowed'
                : allQuizAnswered || isPreview
                  ? pageIndex === totalPages - 1
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 active:scale-[0.98]'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/20 active:scale-[0.98]'
                  : 'bg-white/5 text-white/30 shadow-none cursor-not-allowed'
            )}
          >
            {paused && !isPreview ? (
              <><Pause className="w-5 h-5" /> Séance en pause</>
            ) : pageIndex === totalPages - 1 ? (
              <>Terminer <CheckCircle2 className="w-5 h-5" /></>
            ) : (
              <>Page suivante <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
        <div className="h-safe-bottom" />
      </footer>

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
