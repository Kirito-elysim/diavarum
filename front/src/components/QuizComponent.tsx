import { useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import type { QuizBlock, QuizOption, DragDropPair } from '../types';

interface QuizProps {
  block: QuizBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}

export function QuizComponent({ block, onAnswer, disabled }: QuizProps) {
  if (block.questionType === 'qcu')       return <QCUQuestion  block={block} onAnswer={onAnswer} disabled={disabled} />;
  if (block.questionType === 'qcm')       return <QCMQuestion  block={block} onAnswer={onAnswer} disabled={disabled} />;
  return <DragDropQuestion block={block} onAnswer={onAnswer} disabled={disabled} />;
}

/* ─── QCU ────────────────────────────────────────────────────────────────── */
function QCUQuestion({ block, onAnswer, disabled }: QuizProps) {
  const [selected,  setSelected]  = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shake,     setShake]     = useState(false);

  const handleSelect = (id: string) => {
    if (submitted || disabled) return;
    setSelected(id);
  };

  // Question de réflexion (non notée) : ni correction, ni score, une seule réponse
  const ungraded = block.graded === false;

  const handleSubmit = () => {
    if (!selected) return;
    const opt       = block.options?.find((o: QuizOption) => o.id === selected);
    const isCorrect = ungraded || (opt?.isCorrect ?? false);
    setSubmitted(true);
    if (!isCorrect) { setShake(true); setTimeout(() => setShake(false), 400); }
    onAnswer(isCorrect, isCorrect ? 100 : 0);
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <QuestionHeader label="Question" text={block.question} />

      {/* Options */}
      <div className="space-y-3">
        {block.options?.map((opt: QuizOption, idx: number) => {
          const isSelected = selected === opt.id;
          const isCorrect  = opt.isCorrect;
          const letter     = String.fromCharCode(65 + idx);

          let ringClass = '';
          let bgClass   = '';
          let textClass = '';
          let letterBg  = 'bg-white/10 text-white/50';
          let anim      = '';

          if (submitted && ungraded) {
            if (isSelected) {
              ringClass = 'ring-2 ring-sky-400'; bgClass = 'bg-sky-500/10'; textClass = 'text-sky-200'; letterBg = 'bg-sky-400 text-white';
            }
          } else if (submitted) {
            if (isCorrect) {
              ringClass = 'ring-2 ring-emerald-400'; bgClass = 'bg-emerald-500/10'; textClass = 'text-emerald-300';
              letterBg = 'bg-emerald-400 text-white'; anim = 'pop-in';
            } else if (isSelected) {
              ringClass = 'ring-2 ring-red-400'; bgClass = 'bg-red-500/10'; textClass = 'text-red-300';
              letterBg = 'bg-red-400 text-white'; anim = shake ? 'shake' : '';
            } else {
              bgClass = 'bg-white/3'; textClass = 'text-white/30 opacity-50';
            }
          } else if (isSelected) {
            ringClass = 'ring-2 ring-orange-400'; bgClass = 'bg-orange-500/10'; textClass = 'text-orange-200';
            letterBg = 'bg-orange-400 text-white';
          } else {
            bgClass = 'bg-white/5 hover:bg-white/8'; textClass = 'text-white/80';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={submitted || disabled}
              className={cn(
                'w-full flex items-center gap-4 p-5 rounded-2xl transition-all text-left min-h-[68px] touch-manipulation touch-ripple',
                ringClass, bgClass, textClass, anim
              )}
            >
              <span className={cn('w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black transition-all', letterBg)}>
                {letter}
              </span>
              <span className="flex-1 text-[17px] font-medium leading-snug">{opt.label}</span>
              {submitted && !ungraded && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 check-bounce" />}
              {submitted && !ungraded && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!selected || !!disabled} label="Valider ma réponse" />
      )}

      {/* Explanation */}
      {submitted && block.explanation && <Explanation text={block.explanation} isCorrect={ungraded || (block.options?.find((o: QuizOption) => o.id === selected)?.isCorrect ?? false)} />}
    </div>
  );
}

/* ─── QCM ────────────────────────────────────────────────────────────────── */
function QCMQuestion({ block, onAnswer, disabled }: QuizProps) {
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    if (submitted || disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    const correctIds = new Set(block.options?.filter((o: QuizOption) => o.isCorrect).map((o: QuizOption) => o.id));
    const allOk = [...correctIds].every((id) => selected.has(id as string));
    const noWrong = [...selected].every((id) => correctIds.has(id));
    const isCorrect = allOk && noWrong;
    // Score proportionnel aux bonnes réponses cochées, sans pénalité pour les mauvaises (cahier des charges §4)
    const correctSel = [...selected].filter((id) => correctIds.has(id)).length;
    const score = correctIds.size > 0 ? Math.round((correctSel / correctIds.size) * 100) : 0;
    setSubmitted(true);
    onAnswer(isCorrect, score);
  };

  return (
    <div className="space-y-6">
      <QuestionHeader label="Plusieurs réponses" text={block.question} multi />

      <div className="space-y-3">
        {block.options?.map((opt: QuizOption) => {
          const isSelected = selected.has(opt.id);
          const isCorrect  = opt.isCorrect;

          let ringClass = ''; let bgClass = ''; let textClass = ''; let checkClass = ''; let anim = '';
          if (submitted) {
            if (isCorrect) {
              ringClass = 'ring-2 ring-emerald-400'; bgClass = 'bg-emerald-500/10'; textClass = 'text-emerald-300';
              checkClass = 'border-emerald-400 bg-emerald-400'; anim = 'pop-in';
            } else if (isSelected) {
              ringClass = 'ring-2 ring-red-400'; bgClass = 'bg-red-500/10'; textClass = 'text-red-300';
              checkClass = 'border-red-400 bg-red-400';
            } else {
              bgClass = 'bg-white/3'; textClass = 'text-white/30 opacity-50'; checkClass = 'border-white/20';
            }
          } else if (isSelected) {
            ringClass = 'ring-2 ring-orange-400'; bgClass = 'bg-orange-500/10'; textClass = 'text-orange-200';
            checkClass = 'border-orange-400 bg-orange-400';
          } else {
            bgClass = 'bg-white/5 hover:bg-white/8'; textClass = 'text-white/80'; checkClass = 'border-white/20';
          }

          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={submitted || disabled}
              className={cn(
                'w-full flex items-center gap-4 p-5 rounded-2xl transition-all text-left min-h-[68px] touch-manipulation touch-ripple',
                ringClass, bgClass, textClass, anim
              )}
            >
              <span className={cn(
                'w-7 h-7 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all',
                checkClass
              )}>
                {(isSelected || (submitted && isCorrect)) && (
                  <span className="w-3.5 h-3.5 bg-white rounded-sm block" />
                )}
              </span>
              <span className="flex-1 text-[17px] font-medium leading-snug">{opt.label}</span>
              {submitted && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 check-bounce" />}
              {submitted && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={selected.size === 0 || !!disabled} label="Valider mes réponses" />
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} isCorrect={false} />}
    </div>
  );
}

/* ─── Drag & Drop (pointer events — tablet-native) ───────────────────────── */
function DragDropQuestion({ block, onAnswer, disabled }: QuizProps) {
  const [matches,    setMatches]    = useState<Record<string, string>>({});
  const [submitted,  setSubmitted]  = useState(false);
  const [dragging,   setDragging]   = useState<string | null>(null);
  const [dragPos,    setDragPos]    = useState({ x: 0, y: 0 });
  const [hoveredZone,setHoveredZone]= useState<string | null>(null);

  const rightItems = block.pairs?.map((p: DragDropPair) => p.right) ?? [];
  const [shuffled] = useState(() => [...rightItems].sort(() => Math.random() - 0.5));

  const dropZoneRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getHoveredZone = useCallback((x: number, y: number): string | null => {
    for (const [id, el] of dropZoneRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }, []);

  const onPointerDown = (item: string, e: React.PointerEvent) => {
    if (submitted || disabled || Object.values(matches).includes(item)) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(item);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    setHoveredZone(getHoveredZone(e.clientX, e.clientY));
  }, [dragging, getHoveredZone]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const zone = getHoveredZone(e.clientX, e.clientY);
    if (zone) {
      setMatches((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { if (next[k] === dragging) delete next[k]; });
        next[zone] = dragging;
        return next;
      });
    }
    setDragging(null);
    setHoveredZone(null);
  }, [dragging, getHoveredZone]);

  const removeMatch = (pairId: string) => {
    if (submitted) return;
    setMatches((prev) => { const next = { ...prev }; delete next[pairId]; return next; });
  };

  const handleSubmit = () => {
    const correct = block.pairs?.filter((p: DragDropPair) => matches[p.id] === p.right).length ?? 0;
    const total   = block.pairs?.length ?? 1;
    setSubmitted(true);
    onAnswer(correct === total, Math.round((correct / total) * 100));
  };

  const allMatched = (block.pairs?.length ?? 0) > 0 && block.pairs?.every((p: DragDropPair) => matches[p.id]);

  return (
    <div className="space-y-6" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <QuestionHeader label="Association" text={block.question} />

      {/* Instructions */}
      {!submitted && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
          <span className="text-xl">👆</span>
          <p className="text-sm text-orange-300 font-medium">Faites glisser les définitions sur les concepts correspondants</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left — drop zones */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Concepts</p>
          {block.pairs?.map((pair: DragDropPair) => {
            const matched    = matches[pair.id];
            const isCorrect  = submitted && matched === pair.right;
            const isWrong    = submitted && matched && matched !== pair.right;
            const isHovered  = hoveredZone === pair.id && dragging;

            return (
              <div
                key={pair.id}
                ref={(el) => { if (el) dropZoneRefs.current.set(pair.id, el); else dropZoneRefs.current.delete(pair.id); }}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl border-2 min-h-[64px] transition-all',
                  isCorrect ? 'border-emerald-400 bg-emerald-500/10' :
                  isWrong   ? 'border-red-400 bg-red-500/10' :
                  isHovered ? 'border-orange-400 bg-orange-500/10 scale-[1.02] shadow-md shadow-orange-500/10' :
                  matched   ? 'border-orange-400/50 bg-orange-500/5' :
                              'border-dashed border-white/15 bg-white/3'
                )}
              >
                <span className="font-bold text-white text-base">{pair.left}</span>
                {matched && (
                  <button
                    onClick={() => !submitted && removeMatch(pair.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all touch-manipulation',
                      submitted
                        ? isCorrect ? 'text-emerald-300 bg-emerald-500/20' : 'text-red-300 bg-red-500/20'
                        : 'text-orange-300 bg-orange-500/20 hover:bg-orange-500/30 active:scale-95'
                    )}
                  >
                    <span>{matched}</span>
                    {submitted && (isCorrect
                      ? <CheckCircle className="w-4 h-4" />
                      : <XCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
                {!matched && (
                  <span className="text-xs text-white/20 font-medium">Déposez ici</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right — draggable chips */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Définitions</p>
          {shuffled.map((item: string) => {
            const isUsed = Object.values(matches).includes(item);
            const isDraggingThis = dragging === item;
            return (
              <div
                key={item}
                onPointerDown={(e) => onPointerDown(item, e)}
                className={cn(
                  'p-4 rounded-2xl border-2 min-h-[64px] flex items-center transition-all select-none',
                  isUsed
                    ? 'border-white/5 bg-white/3 opacity-40'
                    : isDraggingThis
                    ? 'border-orange-400 bg-orange-500/10 opacity-40'
                    : submitted
                    ? 'border-white/5 bg-white/3'
                    : 'border-white/10 bg-white/5 cursor-grab active:cursor-grabbing hover:border-orange-400/40 hover:bg-white/8 active:scale-95 touch-manipulation'
                )}
                style={{ touchAction: isUsed || submitted ? 'auto' : 'none' }}
              >
                {!isUsed && !submitted && (
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center mr-3 flex-shrink-0">
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                      <circle cx="3" cy="2.5" r="1.5" fill="rgba(255,255,255,0.3)"/>
                      <circle cx="7" cy="2.5" r="1.5" fill="rgba(255,255,255,0.3)"/>
                      <circle cx="3" cy="7"   r="1.5" fill="rgba(255,255,255,0.3)"/>
                      <circle cx="7" cy="7"   r="1.5" fill="rgba(255,255,255,0.3)"/>
                      <circle cx="3" cy="11.5"r="1.5" fill="rgba(255,255,255,0.3)"/>
                      <circle cx="7" cy="11.5"r="1.5" fill="rgba(255,255,255,0.3)"/>
                    </svg>
                  </span>
                )}
                <span className="text-base text-white/80 font-medium leading-snug">{item}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating drag ghost */}
      {dragging && (
        <div
          className="fixed pointer-events-none z-50 px-5 py-3 rounded-2xl bg-orange-500 text-white text-base font-semibold shadow-2xl shadow-orange-300 -translate-x-1/2 -translate-y-1/2 max-w-[200px] text-center"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          {dragging}
        </div>
      )}

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!allMatched || !!disabled} label="Valider les associations" />
      )}

      {submitted && (
        <div className="p-5 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
          <p className="text-base font-bold text-sky-300">
            {block.pairs?.filter((p: DragDropPair) => matches[p.id] === p.right).length} / {block.pairs?.length} associations correctes
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────────────────────────── */
function QuestionHeader({ label, text, multi }: { label: string; text: string; multi?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-2xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <HelpCircle className="w-5 h-5 text-orange-400" />
      </div>
      <div className="flex-1">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1.5">
          {label}
          {multi && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md text-[10px] font-bold">Multiple</span>}
        </span>
        <p className="text-[18px] font-semibold text-white leading-snug">{text}</p>
      </div>
    </div>
  );
}

function SubmitButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-16 rounded-2xl text-lg font-bold transition-all touch-manipulation',
        disabled
          ? 'bg-white/5 text-white/20 cursor-not-allowed'
          : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] hover:from-orange-600 hover:to-orange-700'
      )}
    >
      {label}
    </button>
  );
}

function Explanation({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  return (
    <div className={cn(
      'flex gap-3 p-5 rounded-2xl fade-scale-in',
      isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-sky-500/10 border border-sky-500/20'
    )}>
      <span className="text-2xl flex-shrink-0">{isCorrect ? '🎉' : '💡'}</span>
      <div>
        <p className={cn('text-sm font-bold mb-1', isCorrect ? 'text-emerald-300' : 'text-sky-300')}>Explication</p>
        <p className={cn('text-base leading-relaxed', isCorrect ? 'text-emerald-200/80' : 'text-sky-200/80')}>{text}</p>
      </div>
    </div>
  );
}
