import { CourseText } from './CourseText';
import { useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import type { QuizBlock, QuizOption, DragDropPair } from '../types';

interface QuizProps {
  block: QuizBlock;
  onAnswer: (isCorrect: boolean, score: number, selected?: string[]) => void;
  previousResult?: { isCorrect: boolean; score: number; selected?: string[] };
  disabled?: boolean;
}

export function QuizComponent({ block, onAnswer, disabled, previousResult }: QuizProps) {
  if (block.questionType === 'qcu')       return <QCUQuestion  block={block} onAnswer={onAnswer} disabled={disabled} previousResult={previousResult} />;
  if (block.questionType === 'qcm')       return <QCMQuestion  block={block} onAnswer={onAnswer} disabled={disabled} previousResult={previousResult} />;
  return <DragDropQuestion block={block} onAnswer={onAnswer} disabled={disabled} previousResult={previousResult} />;
}

/* ─── QCU ────────────────────────────────────────────────────────────────── */
function QCUQuestion({ block, onAnswer, disabled, previousResult }: QuizProps) {
  const [selected,  setSelected]  = useState<string | null>(previousResult?.selected?.[0] ?? null);
  const [submitted, setSubmitted] = useState(!!previousResult);
  const [shake,     setShake]     = useState(false);

  const handleSelect = (id: string) => {
    if (submitted || disabled) return;
    setSelected(id);
  };

  // Question de réflexion (non notée) : ni correction, ni score, une seule réponse
  const ungraded = block.graded === false;
  const showCorrection = block.showCorrection ?? !ungraded;

  const handleSubmit = () => {
    if (!selected) return;
    const opt       = block.options?.find((o: QuizOption) => o.id === selected);
    const isCorrect = opt?.isCorrect ?? false;
    setSubmitted(true);
    if (!isCorrect && showCorrection) { setShake(true); setTimeout(() => setShake(false), 400); }
    onAnswer(ungraded && !showCorrection || isCorrect, isCorrect ? 100 : 0, [selected]);
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <QuestionHeader label="Question" text={block.question} />
      {ungraded && <p className="text-[#1FABC7] font-medium">Question non notée.</p>}

      {/* Options */}
      <div className="space-y-3">
        {block.options?.map((opt: QuizOption) => {
          const isSelected = selected === opt.id;
          const isCorrect  = opt.isCorrect;

          let borderClass = 'border-[#1C5335]';
          let bgClass   = 'bg-transparent hover:bg-[#FAFAFA]';
          let textClass = 'text-[#1F3A34]';
          let letterBg  = 'bg-[#004138]/8 text-[#004138]/50';
          let anim      = '';

          if (submitted && !showCorrection) {
            if (isSelected) {
              borderClass = 'border-[#1FABC7]'; bgClass = 'bg-[#1FABC7]/10'; textClass = 'text-[#0E6477]'; letterBg = 'bg-[#1FABC7] text-white';
            }
          } else if (submitted) {
            if (isCorrect) {
              borderClass = 'border-emerald-500'; bgClass = 'bg-emerald-50'; textClass = 'text-emerald-800';
              letterBg = 'bg-emerald-500 text-white'; anim = 'pop-in';
            } else if (isSelected) {
              borderClass = 'border-red-500'; bgClass = 'bg-red-50'; textClass = 'text-red-800';
              letterBg = 'bg-red-500 text-white'; anim = shake ? 'shake' : '';
            } else {
              borderClass = 'border-[#004138]/8'; bgClass = 'bg-[#ECF5E9]/60'; textClass = 'text-[#1F3A34]/40';
            }
          } else if (isSelected) {
            borderClass = 'border-[#E86825]'; bgClass = 'bg-[#FFF4ED]'; textClass = 'text-[#A64314]';
            letterBg = 'bg-[#E86825] text-white';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={submitted || disabled}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left min-h-[68px] touch-manipulation touch-ripple',
                borderClass, bgClass, textClass, anim
              )}
            >
              <span aria-hidden="true" className={cn('w-9 h-9 rounded-lg border border-current flex-shrink-0 flex items-center justify-center text-sm font-black transition-all', letterBg)}>
                {isSelected ? '✓' : ''}
              </span>
              <span className="flex-1 font-normal leading-snug whitespace-pre-line" style={{ fontSize: (block.options?.length ?? 0) >= 5 ? 20 : 25 }}><CourseText text={opt.label} /></span>
              {submitted && showCorrection && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 check-bounce" />}
              {submitted && showCorrection && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!selected || !!disabled} label="Valider ma réponse" />
      )}

      {/* Explanation */}
      {submitted && showCorrection && block.explanation && <Explanation text={block.explanation} isCorrect={(block.options?.find((o: QuizOption) => o.id === selected)?.isCorrect ?? false)} />}
    </div>
  );
}

/* ─── QCM ────────────────────────────────────────────────────────────────── */
function QCMQuestion({ block, onAnswer, disabled, previousResult }: QuizProps) {
  const [selected,  setSelected]  = useState<Set<string>>(() => new Set(previousResult?.selected));
  const [submitted, setSubmitted] = useState(!!previousResult);
  const ungraded = block.graded === false;
  const showCorrection = block.showCorrection ?? !ungraded;

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
    onAnswer(ungraded || isCorrect, score, [...selected]);
  };

  return (
    <div className="space-y-6">
      <QuestionHeader label="Plusieurs réponses" text={block.question} multi />
      {ungraded && <p className="text-[#1FABC7] font-medium">Question non notée.</p>}

      <div className="space-y-3">
        {block.options?.map((opt: QuizOption) => {
          const isSelected = selected.has(opt.id);
          const isCorrect  = opt.isCorrect;

          let borderClass = 'border-[#1C5335]'; let bgClass = 'bg-transparent hover:bg-[#FAFAFA]'; let textClass = 'text-[#1F3A34]'; let checkClass = 'border-[#004138]/25'; let anim = '';
          if (submitted && !showCorrection) {
            if (isSelected) { borderClass = 'border-[#1FABC7]'; bgClass = 'bg-[#1FABC7]/10'; textClass = 'text-[#0E6477]'; checkClass = 'border-[#1FABC7] bg-[#1FABC7]'; }
          } else if (submitted) {
            if (isCorrect) {
              borderClass = 'border-emerald-500'; bgClass = 'bg-emerald-50'; textClass = 'text-emerald-800';
              checkClass = 'border-emerald-500 bg-emerald-500'; anim = 'pop-in';
            } else if (isSelected) {
              borderClass = 'border-red-500'; bgClass = 'bg-red-50'; textClass = 'text-red-800';
              checkClass = 'border-red-500 bg-red-500';
            } else {
              borderClass = 'border-[#004138]/8'; bgClass = 'bg-[#ECF5E9]/60'; textClass = 'text-[#1F3A34]/40'; checkClass = 'border-[#1C5335]';
            }
          } else if (isSelected) {
            borderClass = 'border-[#E86825]'; bgClass = 'bg-[#FFF4ED]'; textClass = 'text-[#A64314]';
            checkClass = 'border-[#E86825] bg-[#E86825]';
          }

          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={submitted || disabled}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left min-h-[68px] touch-manipulation touch-ripple',
                borderClass, bgClass, textClass, anim
              )}
            >
              <span className={cn(
                'w-7 h-7 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all',
                checkClass
              )}>
                {(isSelected || (submitted && showCorrection && isCorrect)) && (
                  <span className="w-3.5 h-3.5 bg-white rounded-sm block" />
                )}
              </span>
              <span className="flex-1 font-normal leading-snug whitespace-pre-line" style={{ fontSize: (block.options?.length ?? 0) >= 5 ? 20 : 25 }}><CourseText text={opt.label} /></span>
              {submitted && showCorrection && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 check-bounce" />}
              {submitted && showCorrection && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={selected.size === 0 || !!disabled} label="Valider mes réponses" />
      )}
      {submitted && showCorrection && block.explanation && <Explanation text={block.explanation} isCorrect={false} />}
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
      <QuestionHeader label="Relier" text={block.question} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left — drop zones */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#004138]/50 uppercase tracking-widest px-1">Concepts</p>
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
                  isCorrect ? 'border-emerald-500 bg-emerald-50' :
                  isWrong   ? 'border-red-500 bg-red-50' :
                  isHovered ? 'border-[#E86825] bg-[#FFF4ED] scale-[1.02] shadow-md shadow-orange-900/10' :
                  matched   ? 'border-[#E86825]/50 bg-[#FFF4ED]/60' :
                              'border-dashed border-[#004138]/20 bg-white'
                )}
              >
                <span className="font-bold text-[#004138] text-base">{pair.left}</span>
                {matched && (
                  <button
                    onClick={() => !submitted && removeMatch(pair.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all touch-manipulation',
                      submitted
                        ? isCorrect ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'
                        : 'text-[#A64314] bg-[#FFE0D0] hover:bg-[#FCC6A8] active:scale-95'
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
                  <span className="text-xs text-[#004138]/30 font-medium">Déposez ici</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right — draggable chips */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#004138]/50 uppercase tracking-widest px-1">Définitions</p>
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
                    ? 'border-[#004138]/5 bg-[#ECF5E9]/60 opacity-40'
                    : isDraggingThis
                    ? 'border-[#E86825] bg-[#FFF4ED] opacity-40'
                    : submitted
                    ? 'border-[#004138]/5 bg-[#ECF5E9]/60'
                    : 'border-[#004138]/15 bg-white cursor-grab active:cursor-grabbing hover:border-[#E86825]/40 hover:bg-[#FFF4ED]/50 active:scale-95 touch-manipulation'
                )}
                style={{ touchAction: isUsed || submitted ? 'auto' : 'none' }}
              >
                {!isUsed && !submitted && (
                  <span className="w-6 h-6 rounded-lg bg-[#004138]/8 flex items-center justify-center mr-3 flex-shrink-0">
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                      <circle cx="3" cy="2.5" r="1.5" fill="rgba(0,65,56,0.35)"/>
                      <circle cx="7" cy="2.5" r="1.5" fill="rgba(0,65,56,0.35)"/>
                      <circle cx="3" cy="7"   r="1.5" fill="rgba(0,65,56,0.35)"/>
                      <circle cx="7" cy="7"   r="1.5" fill="rgba(0,65,56,0.35)"/>
                      <circle cx="3" cy="11.5"r="1.5" fill="rgba(0,65,56,0.35)"/>
                      <circle cx="7" cy="11.5"r="1.5" fill="rgba(0,65,56,0.35)"/>
                    </svg>
                  </span>
                )}
                <span className="text-base text-[#1F3A34] font-medium leading-snug">{item}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating drag ghost */}
      {dragging && (
        <div
          className="fixed pointer-events-none z-50 px-5 py-3 rounded-2xl bg-[#E86825] text-white text-base font-semibold shadow-2xl shadow-orange-900/20 -translate-x-1/2 -translate-y-1/2 max-w-[200px] text-center"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          {dragging}
        </div>
      )}

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!allMatched || !!disabled} label="Valider les associations" />
      )}

      {submitted && (
        <div className="p-5 bg-[#1FABC7]/10 border border-[#1FABC7]/25 rounded-2xl">
          <p className="text-base font-bold text-[#0E6477]">
            {block.pairs?.filter((p: DragDropPair) => matches[p.id] === p.right).length} / {block.pairs?.length} associations correctes
          </p>
          {block.explanation && <p className="mt-3 whitespace-pre-line text-[#0E6477]/80">{block.explanation}</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────────────────────────── */
function QuestionHeader({ text, multi }: { label?: string; text: string; multi?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <p className="flex-1 text-[25px] font-bold text-[#004138] leading-snug">{text}</p>
      {multi && <span className="flex-shrink-0 mt-1 bg-[#E86825]/15 text-[#E86825] px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide">Plusieurs réponses</span>}
    </div>
  );
}

function SubmitButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-16 rounded-full text-lg font-bold transition-all touch-manipulation',
        disabled
          ? 'bg-[#004138]/8 text-[#004138]/25 cursor-not-allowed'
          : 'bg-[#E86825] text-white shadow-lg shadow-orange-900/15 active:scale-[0.98] hover:bg-[#CC5518]'
      )}
    >
      {label}
    </button>
  );
}

function Explanation({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  return (
    <div className={cn(
      'flex gap-3 p-5 rounded-2xl fade-scale-in border',
      isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-[#1FABC7]/10 border-[#1FABC7]/25'
    )}>
      <span className="text-2xl flex-shrink-0">{isCorrect ? '🎉' : '💡'}</span>
      <div>
        <p className={cn('text-sm font-bold mb-1', isCorrect ? 'text-emerald-700' : 'text-[#0E6477]')}>Explication</p>
        <p className={cn('text-base leading-relaxed', isCorrect ? 'text-emerald-800/80' : 'text-[#0E6477]/80')}>{text}</p>
      </div>
    </div>
  );
}
