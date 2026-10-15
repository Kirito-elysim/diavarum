import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import {
  CheckCircle, XCircle, HelpCircle, GripVertical,
  RefreshCw, Sparkles, ChevronRight,
} from 'lucide-react';
import type {
  ReorderBlock, FillBlankBlock, TrueFalseBlock, MemoryBlock,
  SliderBlock, TapSequenceBlock, FlipCardsBlock, CategorizeBlock,
  DrawingBlock, ScenarioBlock,
  RevealLegendsBlock, PullTimelineBlock,
  SortBinBlock, ConnectDotsBlock, WordSearchBlock, YesNoPathBlock,
} from '../types';

/* Shared sub-components (mirror QuizComponent styles) ──────────────────── */
function BlockHeader({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-2xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <HelpCircle className="w-5 h-5 text-orange-400" />
      </div>
      <div className="flex-1">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1.5">
          {label}
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
        'w-full h-14 rounded-2xl text-base font-bold transition-all touch-manipulation',
        disabled
          ? 'bg-white/5 text-white/20 cursor-not-allowed'
          : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] hover:from-orange-600 hover:to-orange-700'
      )}
    >
      {label}
    </button>
  );
}

function Explanation({ text }: { text: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 fade-scale-in">
      <Sparkles className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-sky-300 mb-1">Explication</p>
        <p className="text-base leading-relaxed text-sky-200/80">{text}</p>
      </div>
    </div>
  );
}

/* ─── 1. Reorder (drag to reorder list) ────────────────────────────────── */
export function ReorderView({ block, onAnswer, disabled }: { block: ReorderBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [shuffled] = useState(() => [...block.items].sort(() => Math.random() - 0.5));
  const [items, setItems] = useState(() => shuffled.map((it, i) => ({ ...it, currentIdx: i })));
  const [submitted, setSubmitted] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const onPointerDown = (idx: number, e: React.PointerEvent) => {
    if (submitted || disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingIdx(idx);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIdx === null) return;
    for (const [idx, el] of itemRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) {
        if (hoveredIdx !== idx) setHoveredIdx(idx);
        break;
      }
    }
  }, [draggingIdx, hoveredIdx]);

  const onPointerUp = useCallback(() => {
    if (draggingIdx === null) return;
    if (hoveredIdx !== null && hoveredIdx !== draggingIdx) {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggingIdx, 1);
        next.splice(hoveredIdx, 0, moved);
        return next.map((it, i) => ({ ...it, currentIdx: i }));
      });
    }
    setDraggingIdx(null);
    setHoveredIdx(null);
  }, [draggingIdx, hoveredIdx]);

  const handleSubmit = () => {
    const correct = items.filter((it, i) => it.id === block.items[i].id).length;
    const total = block.items.length;
    setSubmitted(true);
    onAnswer(correct === total, Math.round((correct / total) * 100));
  };

  return (
    <div className="space-y-5" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <BlockHeader label="Remettre dans l'ordre" text={block.question} />

      <div className="space-y-3">
        {items.map((it, i) => {
          const isCorrectPos = submitted && it.id === block.items[i].id;
          return (
            <div
              key={it.id}
              ref={(el) => { if (el) itemRefs.current.set(i, el); else itemRefs.current.delete(i); }}
              onPointerDown={(e) => onPointerDown(i, e)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-2xl border-2 min-h-[60px] transition-all select-none',
                submitted
                  ? isCorrectPos ? 'border-emerald-400 bg-emerald-500/10' : 'border-red-400 bg-red-500/10'
                  : hoveredIdx === i && draggingIdx !== null ? 'border-orange-400 bg-orange-500/10 scale-[1.02]'
                  : draggingIdx === i ? 'border-orange-400/50 bg-orange-500/5 opacity-60'
                  : 'border-white/10 bg-white/5 touch-manipulation active:scale-[0.98]'
              )}
              style={{ touchAction: submitted || disabled ? 'auto' : 'none' }}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                {submitted ? (
                  isCorrectPos
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <GripVertical className="w-5 h-5 text-white/30" />
                )}
              </div>
              <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black text-white/50 flex-shrink-0">{i + 1}</span>
              <span className={cn('text-base font-medium flex-1', submitted ? (isCorrectPos ? 'text-emerald-200' : 'text-red-200') : 'text-white/80')}>{it.label}</span>
            </div>
          );
        })}
      </div>

      {!submitted && <SubmitButton onClick={handleSubmit} disabled={disabled ?? false} label="Valider l'ordre" />}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 2. Fill in the blanks (type-in) ──────────────────────────────────── */
export function FillBlankView({ block, onAnswer, disabled }: { block: FillBlankBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [values, setValues] = useState<string[]>(() => block.answers.map(() => ''));
  const [submitted, setSubmitted] = useState(false);

  const parts = block.text.split('___');
  const blankCount = parts.length - 1;

  const handleSubmit = () => {
    let correct = 0;
    for (let i = 0; i < blankCount; i++) {
      if (values[i]?.trim().toLowerCase() === block.answers[i].toLowerCase()) correct++;
    }
    setSubmitted(true);
    onAnswer(correct === blankCount, Math.round((correct / blankCount) * 100));
  };

  return (
    <div className="space-y-5">
      <BlockHeader label="Texte à compléter" text={block.question} />

      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 leading-[1.9] text-[18px] text-white/80">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blankCount && (
              <input
                type="text"
                value={values[i]}
                disabled={submitted || disabled}
                onChange={(e) => setValues((v) => v.map((val, j) => j === i ? e.target.value : val))}
                className={cn(
                  'inline-block mx-1 px-3 py-1 rounded-xl border-2 text-center font-bold min-w-[100px] outline-none transition-all',
                  submitted
                    ? values[i]?.trim().toLowerCase() === block.answers[i].toLowerCase()
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-400 bg-red-500/10 text-red-200'
                    : 'border-orange-400/40 bg-orange-500/5 text-orange-200 focus:border-orange-400'
                )}
                style={{ width: `${Math.max(block.answers[i].length * 12 + 30, 80)}px` }}
              />
            )}
            {submitted && i < blankCount && values[i]?.trim().toLowerCase() !== block.answers[i].toLowerCase() && (
              <span className="text-emerald-400 text-sm font-medium ml-1">({block.answers[i]})</span>
            )}
          </span>
        ))}
      </div>

      {!submitted && <SubmitButton onClick={handleSubmit} disabled={(disabled ?? false) || values.some((v) => !v.trim())} label="Valider" />}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 3. True / False (swipeable statements) ───────────────────────────── */
export function TrueFalseView({ block, onAnswer, disabled }: { block: TrueFalseBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState<'none' | 'left' | 'right'>('none');

  const current = block.statements[idx];
  const allAnswered = block.statements.every((s) => answers[s.id] !== null && answers[s.id] !== undefined);

  const answer = (val: boolean) => {
    if (submitted || disabled) return;
    setAnswers((p) => ({ ...p, [current.id]: val }));
    setDirection(val ? 'right' : 'left');
    setTimeout(() => {
      if (idx < block.statements.length - 1) {
        setIdx(idx + 1);
        setDirection('none');
      } else {
        setDirection('none');
      }
    }, 300);
  };

  const handleSubmit = () => {
    const correct = block.statements.filter((s) => answers[s.id] === s.isTrue).length;
    const total = block.statements.length;
    setSubmitted(true);
    onAnswer(correct === total, Math.round((correct / total) * 100));
  };

  const goTo = (i: number) => {
    setDirection(i > idx ? 'left' : 'right');
    setTimeout(() => { setIdx(i); setDirection('none'); }, 200);
  };

  return (
    <div className="space-y-5">
      <BlockHeader label="Vrai ou Faux" text={block.question} />

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {block.statements.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              i === idx ? 'bg-orange-500 scale-125' :
              answers[s.id] !== null && answers[s.id] !== undefined ? 'bg-orange-400/60' : 'bg-white/15'
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className={cn(
          'min-h-[180px] rounded-3xl p-6 flex items-center justify-center text-center border-2 transition-all',
          direction === 'left' ? '-translate-x-8 opacity-0' :
          direction === 'right' ? 'translate-x-8 opacity-0' :
          'translate-x-0 opacity-100',
          submitted
            ? answers[current.id] === current.isTrue
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-red-400 bg-red-500/10'
            : 'border-white/10 bg-white/5'
        )}
      >
        <p className="text-xl font-semibold text-white leading-relaxed">{current.statement}</p>
      </div>

      {/* True / False buttons */}
      {!submitted && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(false)}
            disabled={disabled}
            className={cn(
              'h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all touch-manipulation',
              answers[current.id] === false
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-white/5 text-white/60 border-2 border-red-400/30 active:scale-95'
            )}
          >
            <XCircle className="w-5 h-5" /> Faux
          </button>
          <button
            onClick={() => answer(true)}
            disabled={disabled}
            className={cn(
              'h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all touch-manipulation',
              answers[current.id] === true
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 text-white/60 border-2 border-emerald-400/30 active:scale-95'
            )}
          >
            <CheckCircle className="w-5 h-5" /> Vrai
          </button>
        </div>
      )}

      {submitted && (
        <div className="space-y-2">
          {block.statements.map((s) => (
            <div key={s.id} className={cn(
              'flex items-center gap-3 p-3 rounded-2xl border',
              answers[s.id] === s.isTrue ? 'border-emerald-400/30 bg-emerald-500/5' : 'border-red-400/30 bg-red-500/5'
            )}>
              {answers[s.id] === s.isTrue
                ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              <p className="text-sm text-white/70 flex-1">{s.statement}</p>
              <span className={cn('text-xs font-bold', s.isTrue ? 'text-emerald-400' : 'text-red-400')}>
                {s.isTrue ? 'Vrai' : 'Faux'}
              </span>
            </div>
          ))}
        </div>
      )}

      {!submitted && idx === block.statements.length - 1 && allAnswered && (
        <SubmitButton onClick={handleSubmit} disabled={disabled ?? false} label="Valider" />
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 4. Memory (card matching game) ───────────────────────────────────── */
export function MemoryView({ block, onAnswer, disabled }: { block: MemoryBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [shuffled] = useState(() => [...block.cards].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [wrongPair, setWrongPair] = useState<string[]>([]);

  const onFlip = (cardId: string) => {
    if (submitted || disabled) return;
    if (flipped.length >= 2) return;
    if (flipped.includes(cardId)) return;
    const card = shuffled.find((c) => c.id === cardId);
    if (!card || matched.has(card.pairId)) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      const cardA = shuffled.find((c) => c.id === a);
      const cardB = shuffled.find((c) => c.id === b);
      if (cardA && cardB && cardA.pairId === cardB.pairId) {
        setTimeout(() => {
          setMatched((p) => new Set(p).add(cardA.pairId));
          setFlipped([]);
        }, 500);
      } else {
        setWrongPair(newFlipped);
        setTimeout(() => { setFlipped([]); setWrongPair([]); }, 1000);
      }
    }
  };

  useEffect(() => {
    if (matched.size === block.cards.length / 2 && !submitted) {
      setSubmitted(true);
      const score = Math.max(20, Math.round(100 - (moves - block.cards.length / 2) * 10));
      onAnswer(true, score);
    }
  }, [matched, block.cards.length, moves, submitted, onAnswer]);

  return (
    <div className="space-y-5">
      <BlockHeader label="Jeu de mémoire" text={block.question} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-white/40">Coups : <span className="text-white/70 font-bold">{moves}</span></span>
        <span className="text-white/40">Paires : <span className="text-emerald-400 font-bold">{matched.size}/{block.cards.length / 2}</span></span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {shuffled.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.has(card.pairId);
          const isWrong = wrongPair.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => onFlip(card.id)}
              disabled={disabled || isFlipped}
              className={cn(
                'aspect-square rounded-2xl flex items-center justify-center p-2 text-center transition-all touch-manipulation',
                isFlipped
                  ? isWrong ? 'bg-red-500/20 border-2 border-red-400' : 'bg-emerald-500/15 border-2 border-emerald-400'
                  : 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-2 border-orange-500/30 active:scale-95'
              )}
              style={{ perspective: '1000px' }}
            >
              {isFlipped ? (
                <span className={cn(
                  'text-sm font-semibold leading-tight',
                  isWrong ? 'text-red-200' : 'text-emerald-200'
                )}>{card.content}</span>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-orange-400/50" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 fade-scale-in">
          <p className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Toutes les paires trouvées en {moves} coups !
          </p>
        </div>
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 5. Slider (estimate a value) ─────────────────────────────────────── */
export function SliderView({ block, onAnswer, disabled }: { block: SliderBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [value, setValue] = useState(Math.round((block.min + block.max) / 2));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const diff = Math.abs(value - block.correctValue);
    const isCorrect = diff <= block.tolerance;
    const score = isCorrect
      ? Math.max(50, Math.round(100 - (diff / block.tolerance) * 50))
      : Math.max(0, Math.round(100 - (diff / (block.max - block.min)) * 100));
    setSubmitted(true);
    onAnswer(isCorrect, score);
  };

  const withinTolerance = Math.abs(value - block.correctValue) <= block.tolerance;

  return (
    <div className="space-y-6">
      <BlockHeader label="Estimation" text={block.question} />

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className={cn(
          'text-5xl font-black text-center mb-6 transition-colors',
          submitted
            ? withinTolerance ? 'text-emerald-400' : 'text-red-400'
            : 'text-orange-400'
        )}>
          {value}<span className="text-2xl ml-1 font-bold">{block.unit}</span>
        </div>

        <input
          type="range"
          min={block.min}
          max={block.max}
          value={value}
          disabled={submitted || disabled}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer touch-manipulation"
          style={{
            background: submitted
              ? `linear-gradient(to right, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.3) ${((block.correctValue - block.tolerance - block.min) / (block.max - block.min)) * 100}%, rgba(16,185,129,0.5) ${((block.correctValue - block.tolerance - block.min) / (block.max - block.min)) * 100}%, rgba(16,185,129,0.5) ${((block.correctValue + block.tolerance - block.min) / (block.max - block.min)) * 100}%, rgba(16,185,129,0.3) ${((block.correctValue + block.tolerance - block.min) / (block.max - block.min)) * 100}%, rgba(255,255,255,0.08) 100%)`
              : `linear-gradient(to right, #f97316 0%, #f97316 ${((value - block.min) / (block.max - block.min)) * 100}%, rgba(255,255,255,0.08) ${((value - block.min) / (block.max - block.min)) * 100}%, rgba(255,255,255,0.08) 100%)`
          }}
        />

        <div className="flex items-center justify-between mt-3 text-xs text-white/40 font-medium">
          <span>{block.minLabel ?? block.min}{block.unit}</span>
          <span>{block.maxLabel ?? block.max}{block.unit}</span>
        </div>
      </div>

      {submitted && (
        <div className={cn(
          'p-4 rounded-2xl border fade-scale-in',
          withinTolerance ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
        )}>
          <p className={cn('text-base font-bold', withinTolerance ? 'text-emerald-300' : 'text-red-300')}>
            {withinTolerance ? 'Bien estimé ! ' : 'Pas tout à fait. '}
            La bonne réponse : {block.correctValue}{block.unit}
          </p>
        </div>
      )}

      {!submitted && <SubmitButton onClick={handleSubmit} disabled={disabled ?? false} label="Valider" />}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 6. Tap Sequence (tap in correct order) ───────────────────────────── */
export function TapSequenceView({ block, onAnswer, disabled }: { block: TapSequenceBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [shuffled] = useState(() => [...block.steps].sort(() => Math.random() - 0.5));
  const [tapped, setTapped] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleTap = (idx: number) => {
    if (submitted || disabled) return;
    const step = shuffled[idx];
    const expectedOrder = tapped.length + 1;
    if (step.order === expectedOrder) {
      const newTapped = [...tapped, idx];
      setTapped(newTapped);
      setError(false);
      if (newTapped.length === shuffled.length) {
        setSubmitted(true);
        onAnswer(true, 100);
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const reset = () => {
    setTapped([]);
    setSubmitted(false);
    setError(false);
  };

  return (
    <div className="space-y-5">
      <BlockHeader label="Ordre des étapes" text={block.question} />

      {!submitted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
          <span className="text-base">👆</span>
          <p className="text-sm text-orange-300 font-medium">Touchez les étapes dans le bon ordre</p>
          <span className="ml-auto text-sm font-bold text-orange-400">{tapped.length}/{shuffled.length}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shuffled.map((step, i) => {
          const tapIdx = tapped.indexOf(i);
          const isTapped = tapIdx !== -1;
          return (
            <button
              key={step.id}
              onClick={() => handleTap(i)}
              disabled={disabled || isTapped || submitted}
              className={cn(
                'relative p-4 rounded-2xl border-2 min-h-[80px] flex items-center justify-center text-center transition-all touch-manipulation',
                error && !isTapped ? 'border-red-400 bg-red-500/10 shake' :
                isTapped ? 'border-emerald-400 bg-emerald-500/10' :
                submitted ? 'border-white/5 bg-white/3 opacity-50' :
                'border-white/10 bg-white/5 active:scale-95 hover:border-orange-400/40'
              )}
            >
              {isTapped && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-emerald-400 text-white text-xs font-black flex items-center justify-center">
                  {tapIdx + 1}
                </span>
              )}
              <span className={cn(
                'text-sm font-semibold leading-tight',
                isTapped ? 'text-emerald-200' : 'text-white/80'
              )}>{step.label}</span>
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 fade-scale-in">
          <p className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Séquence correcte !
          </p>
        </div>
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
      {!submitted && tapped.length > 0 && (
        <button onClick={reset} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors touch-manipulation mx-auto">
          <RefreshCw className="w-4 h-4" /> Recommencer
        </button>
      )}
    </div>
  );
}

/* ─── 7. Flip Cards (tap to reveal) ────────────────────────────────────── */
export function FlipCardsView({ block }: { block: FlipCardsBlock }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <BlockHeader label="Cartes interactives" text={block.question} />

      <div className="flex items-center gap-2 px-4 py-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
        <span className="text-base">👆</span>
        <p className="text-sm text-sky-300 font-medium">Touchez une carte pour la retourner</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {block.cards.map((card) => {
          const isFlipped = flipped.has(card.id);
          return (
            <button
              key={card.id}
              onClick={() => toggle(card.id)}
              aria-pressed={isFlipped}
              className={cn(
                'relative min-h-[140px] rounded-2xl p-5 flex items-center justify-center text-center transition-all touch-manipulation',
                isFlipped
                  ? 'bg-gradient-to-br from-orange-500/15 to-orange-600/5 border-2 border-orange-400/50'
                  : 'bg-gradient-to-br from-sky-500/15 to-sky-600/5 border-2 border-sky-400/30 active:scale-95'
              )}
            >
              <div>
                <p className={cn(
                  'text-sm font-bold mb-1 uppercase tracking-wider',
                  isFlipped ? 'text-orange-400' : 'text-sky-400'
                )}>
                  {isFlipped ? 'Réponse' : 'Question'}
                </p>
                <p className="text-base font-medium text-white/90 leading-snug">
                  {isFlipped ? card.back : card.front}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 8. Categorize (drag items into categories) ───────────────────────── */
export function CategorizeView({ block, onAnswer, disabled }: { block: CategorizeBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [shuffled] = useState(() => [...block.items].sort(() => Math.random() - 0.5));
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const zoneRefs = useRef<Map<string, HTMLElement>>(new Map());
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Assign initial null
  useEffect(() => {
    const init: Record<string, string | null> = {};
    block.items.forEach((it) => { init[it.id] = null; });
    setAssignments(init);
  }, [block.items]);

  const unassigned = shuffled.filter((it) => assignments[it.id] === null || assignments[it.id] === undefined);

  const getHoveredCat = useCallback((x: number, y: number): string | null => {
    for (const [cat, el] of zoneRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cat;
    }
    return null;
  }, []);

  const onPointerDown = (id: string, e: React.PointerEvent) => {
    if (submitted || disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return;
    setHoveredCat(getHoveredCat(e.clientX, e.clientY));
  }, [draggingId, getHoveredCat]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return;
    const cat = getHoveredCat(e.clientX, e.clientY);
    if (cat) {
      setAssignments((prev) => ({ ...prev, [draggingId]: cat }));
    }
    setDraggingId(null);
    setHoveredCat(null);
  }, [draggingId, getHoveredCat]);

  const handleSubmit = () => {
    const correct = block.items.filter((it) => assignments[it.id] === it.category).length;
    const total = block.items.length;
    setSubmitted(true);
    onAnswer(correct === total, Math.round((correct / total) * 100));
  };

  const allAssigned = block.items.every((it) => assignments[it.id] !== null && assignments[it.id] !== undefined);

  return (
    <div className="space-y-5" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <BlockHeader label="Classer" text={block.question} />

      {/* Unassigned pool */}
      {unassigned.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/15">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">À classer</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((it) => (
              <div
                key={it.id}
                ref={(el) => { if (el) itemRefs.current.set(it.id, el); else itemRefs.current.delete(it.id); }}
                onPointerDown={(e) => onPointerDown(it.id, e)}
                className={cn(
                  'px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all select-none touch-manipulation',
                  draggingId === it.id ? 'border-orange-400 bg-orange-500/10 opacity-50' :
                  'border-white/10 bg-white/5 text-white/80 active:scale-95 cursor-grab'
                )}
                style={{ touchAction: submitted || disabled ? 'auto' : 'none' }}
              >
                {it.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category zones */}
      <div className="grid grid-cols-2 gap-3">
        {block.categories.map((cat) => {
          const catItems = block.items.filter((it) => assignments[it.id] === cat);
          return (
            <div
              key={cat}
              ref={(el) => { if (el) zoneRefs.current.set(cat, el); else zoneRefs.current.delete(cat); }}
              className={cn(
                'min-h-[100px] rounded-2xl border-2 border-dashed p-3 transition-all',
                hoveredCat === cat && draggingId ? 'border-orange-400 bg-orange-500/10 scale-[1.02]' :
                submitted ? 'border-white/10 bg-white/5' :
                'border-white/15 bg-white/3'
              )}
            >
              <p className={cn(
                'text-xs font-bold uppercase tracking-widest mb-2 text-center',
                hoveredCat === cat && draggingId ? 'text-orange-400' : 'text-white/40'
              )}>{cat}</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {catItems.map((it) => {
                  const isCorrect = submitted && it.category === cat;
                  const isWrong = submitted && it.category !== cat;
                  return (
                    <span
                      key={it.id}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border',
                        isCorrect ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' :
                        isWrong ? 'bg-red-500/20 border-red-400 text-red-200' :
                        'bg-white/8 border-white/15 text-white/70'
                      )}
                    >
                      {it.label}
                    </span>
                  );
                })}
                {catItems.length === 0 && <span className="text-xs text-white/20 italic py-2">Déposez ici</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating ghost */}
      {draggingId && (
        <div className="fixed pointer-events-none z-50 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: 0, top: 0 }}>
          {block.items.find((it) => it.id === draggingId)?.label}
        </div>
      )}

      {!submitted && <SubmitButton onClick={handleSubmit} disabled={(disabled ?? false) || !allAssigned} label="Valider" />}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 9. Drawing / Tracing canvas ──────────────────────────────────────── */
export function DrawingView({ block, onAnswer, disabled }: { block: DrawingBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    if (submitted || disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);
    lastPos.current = pos;
    setDrawing(true);
    setHasDrawn(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing || submitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = block.brushColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const end = () => { setDrawing(false); lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onAnswer(true, 100);
  };

  return (
    <div className="space-y-5">
      <BlockHeader label="Dessiner / Tracer" text={block.question} />

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-sm text-white/60 mb-3 font-medium">{block.prompt}</p>
        <div className="rounded-2xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={320}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="w-full h-auto touch-none"
            style={{ aspectRatio: '600 / 320' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!submitted && (
          <button
            onClick={clear}
            disabled={!hasDrawn || disabled}
            className="flex items-center gap-2 px-5 h-12 rounded-2xl border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation disabled:opacity-30"
          >
            <RefreshCw className="w-4 h-4" /> Effacer
          </button>
        )}
        {!submitted && (
          <div className="flex-1">
            <SubmitButton onClick={handleSubmit} disabled={(disabled ?? false) || !hasDrawn} label="Valider" />
          </div>
        )}
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 fade-scale-in">
          <p className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Dessin enregistré !
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── 10. Scenario (branching choices) ─────────────────────────────────── */
export function ScenarioView({ block, onAnswer, disabled }: { block: ScenarioBlock; onAnswer: (isCorrect: boolean, score: number) => void; disabled?: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  const current = block.steps[stepIdx];

  const handleChoice = (choiceId: string) => {
    if (disabled) return;
    const choice = current.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    setChoices((p) => [...p, choiceId]);
    setFeedback(choice.feedback);

    if (choice.isCorrect) {
      setTimeout(() => {
        if (stepIdx < block.steps.length - 1) {
          setStepIdx(stepIdx + 1);
          setFeedback(null);
        } else {
          setCompleted(true);
          const score = Math.max(20, 100 - wrongCount * 15);
          onAnswer(true, score);
        }
      }, 1800);
    } else {
      setWrongCount((c) => c + 1);
    }
  };

  if (completed) {
    return (
      <div className="space-y-5">
        <BlockHeader label="Scénario" text={block.question} />
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center fade-scale-in">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-emerald-300 mb-1">Scénario réussi !</p>
          <p className="text-sm text-emerald-200/70">Vous avez pris les bonnes décisions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BlockHeader label="Scénario interactif" text={block.question} />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {block.steps.map((_, i) => (
          <div key={i} className={cn(
            'h-2 rounded-full flex-1 transition-all',
            i < stepIdx ? 'bg-emerald-400/60' :
            i === stepIdx ? 'bg-orange-500' : 'bg-white/10'
          )} />
        ))}
      </div>

      {/* Situation */}
      <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20">
        <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Situation</p>
        <p className="text-base text-white/90 leading-relaxed">{current.situation}</p>
      </div>

      {/* Question */}
      <p className="text-[17px] font-semibold text-white/80 px-1">{current.question}</p>

      {/* Choices */}
      <div className="space-y-3">
        {current.choices.map((choice) => {
          const isSelected = choices[choices.length - 1] === choice.id && feedback !== null;
          const showResult = isSelected && feedback !== null;
          return (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={disabled || feedback !== null}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all touch-manipulation min-h-[56px]',
                showResult
                  ? choice.isCorrect
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-red-400 bg-red-500/10'
                  : feedback !== null
                    ? 'border-white/5 bg-white/3 opacity-50'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-orange-400/40 active:scale-[0.98]'
              )}
            >
              <span className="flex-1 text-base font-medium">{choice.label}</span>
              {showResult && (choice.isCorrect
                ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          'p-4 rounded-2xl border fade-scale-in',
          current.choices.find((c) => c.id === choices[choices.length - 1])?.isCorrect
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        )}>
          <p className={cn(
            'text-sm font-bold mb-1',
            current.choices.find((c) => c.id === choices[choices.length - 1])?.isCorrect
              ? 'text-emerald-300' : 'text-amber-300'
          )}>
            {current.choices.find((c) => c.id === choices[choices.length - 1])?.isCorrect ? 'Bonne décision !' : 'Réfléchissez à nouveau...'}
          </p>
          <p className="text-base text-white/80 leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  SENIOR-FRIENDLY INTERACTIONS                                         */
/* ═══════════════════════════════════════════════════════════════════════ */

/* ─── 11. Reveal Legends — tap to progressively uncover labels ────────── */
export function RevealLegendsView({ block, onAnswer, disabled }: {
  block: RevealLegendsBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleTap = (id: string) => {
    if (submitted || disabled) return;
    setRevealed((prev) => new Set(prev).add(id));
    setActiveId(id);
  };

  const allRevealed = revealed.size === block.points.length;

  const handleSubmit = () => {
    setSubmitted(true);
    onAnswer(true, 100);
  };

  const active = block.points.find((p) => p.id === activeId);

  return (
    <div className="space-y-5">
      <BlockHeader label="Révéler les légendes" text={block.question} />

      <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
        <span className="text-base">👆</span>
        <p className="text-sm text-orange-300 font-medium">Touchez chaque point pour révéler sa légende</p>
        <span className="ml-auto text-sm font-bold text-orange-400">{revealed.size}/{block.points.length}</span>
      </div>

      <div className="rounded-3xl overflow-hidden bg-white ring-1 ring-gray-100/80 shadow-sm">
        <div className="relative select-none">
          <img src={block.imageUrl} alt={block.alt} className="w-full object-cover" style={{ maxHeight: 300 }} loading="lazy" />
          {block.points.map((pt, i) => {
            const isRevealed = revealed.has(pt.id);
            const isActive = activeId === pt.id;
            return (
              <button
                key={pt.id}
                onClick={() => handleTap(pt.id)}
                disabled={submitted || disabled}
                className={cn(
                  'absolute flex items-center justify-center rounded-full font-black shadow-lg transition-all duration-200 touch-manipulation',
                  isActive
                    ? 'w-12 h-12 bg-orange-500 text-white scale-110 ring-4 ring-orange-300/60 z-20'
                    : isRevealed
                      ? 'w-10 h-10 bg-emerald-500 text-white ring-2 ring-emerald-300/50'
                      : 'w-11 h-11 bg-white/90 text-orange-600 hover:scale-110 ring-2 ring-orange-400/60 active:scale-95'
                )}
                style={{ left: `calc(${pt.x}% - 20px)`, top: `calc(${pt.y}% - 20px)` }}
              >
                {isRevealed ? <CheckCircle className="w-5 h-5" /> : i + 1}
                {!isRevealed && !isActive && (
                  <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" style={{ animationDuration: `${1.5 + i * 0.3}s` }} />
                )}
              </button>
            );
          })}
        </div>

        {block.caption && (
          <p className="text-xs text-gray-400 text-center px-5 pt-3 pb-1 font-medium italic">{block.caption}</p>
        )}

        {/* Info panel */}
        <div className={cn('transition-all duration-300 overflow-hidden', active ? 'max-h-none opacity-100' : 'max-h-0 opacity-0')}>
          {active && (
            <div className="mx-4 mb-4 mt-2 rounded-2xl p-4" style={{ backgroundColor: '#fff7ed', border: '1.5px solid #fed7aa' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-black">{block.points.findIndex((p) => p.id === active.id) + 1}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base mb-1">{active.label}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{active.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend chips */}
        <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
          {block.points.map((pt, i) => {
            const isRevealed = revealed.has(pt.id);
            return (
              <button
                key={pt.id}
                onClick={() => isRevealed && setActiveId(pt.id)}
                disabled={!isRevealed}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
                  isRevealed
                    ? activeId === pt.id
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-orange-50 text-gray-700 ring-1 ring-orange-100'
                    : 'bg-gray-50 text-gray-300 ring-1 ring-gray-100'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                  isRevealed ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                )}>{i + 1}</span>
                <span className="text-xs font-semibold">{isRevealed ? pt.label : '—'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!submitted && allRevealed && <SubmitButton onClick={handleSubmit} disabled={disabled ?? false} label="Continuer" />}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 13. Pull Timeline — drag a handle to reveal dates ───────────────── */
export function PullTimelineView({ block }: {
  block: PullTimelineBlock;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);

  const updatePos = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(pct);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updatePos(e.clientX);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updatePos(e.clientX);
  }, [dragging, updatePos]);

  const onPointerUp = useCallback(() => { setDragging(false); }, []);

  const closestEvent = [...block.events].sort((a, b) => Math.abs(a.position - pos) - Math.abs(b.position - pos))[0];
  const revealedEvents = block.events.filter((ev) => ev.position <= pos + 2);

  return (
    <div className="space-y-5" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <BlockHeader label="Frise à dérouler" text={block.question} />

      <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
        <span className="text-base">👈</span>
        <p className="text-sm text-orange-300 font-medium">Tirez la flèche le long de la frise pour découvrir les dates</p>
      </div>

      {/* Timeline track */}
      <div className="pt-8 pb-4 px-4">
        <div
          ref={trackRef}
          className="relative h-3 rounded-full bg-white/10 cursor-pointer"
          onPointerDown={onPointerDown}
          style={{ touchAction: 'none' }}
        >
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-75"
            style={{ width: `${pos}%` }}
          />

          {/* Event markers */}
          {block.events.map((ev) => {
            const isRevealed = ev.position <= pos + 2;
            return (
              <div
                key={ev.id}
                className="absolute -top-1 w-5 h-5 rounded-full border-2 transition-all"
                style={{
                  left: `calc(${ev.position}% - 10px)`,
                  backgroundColor: isRevealed ? '#f97316' : 'rgba(255,255,255,0.15)',
                  borderColor: isRevealed ? '#fb923c' : 'rgba(255,255,255,0.1)',
                }}
              />
            );
          })}

          {/* Drag handle */}
          <div
            onPointerDown={onPointerDown}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 cursor-grab active:cursor-grabbing touch-manipulation z-10"
            style={{ left: `${pos}%`, touchAction: 'none' }}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Date labels under track */}
        <div className="relative mt-3 h-6">
          {block.events.map((ev) => {
            const isRevealed = ev.position <= pos + 2;
            return (
              <span
                key={ev.id}
                className={cn(
                  'absolute -translate-x-1/2 text-xs font-bold transition-opacity',
                  isRevealed ? 'text-orange-400 opacity-100' : 'text-white/20 opacity-0'
                )}
                style={{ left: `${ev.position}%` }}
              >
                {ev.date}
              </span>
            );
          })}
        </div>
      </div>

      {/* Event detail card */}
      {closestEvent && closestEvent.position <= pos + 5 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10 fade-scale-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-black">
              {closestEvent.date}
            </div>
            <h3 className="text-white font-bold text-lg">{closestEvent.title}</h3>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{closestEvent.content}</p>
        </div>
      )}

      {/* Revealed count */}
      <div className="text-center text-sm text-white/40">
        {revealedEvents.length} / {block.events.length} événements révélés
      </div>

      {block.explanation && revealedEvents.length === block.events.length && (
        <Explanation text={block.explanation} />
      )}
    </div>
  );
}

/* ─── 14. Sort Bin — tap to sort into keep/discard bins ───────────────── */
export function SortBinView({ block, onAnswer, disabled }: {
  block: SortBinBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}) {
  const [shuffled] = useState(() => [...block.items].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null);

  const current = shuffled[idx];
  const allDone = idx >= shuffled.length;

  const handleChoice = (keep: boolean) => {
    if (submitted || disabled || !current) return;
    setChoices((p) => ({ ...p, [current.id]: keep }));
    setFeedback({ correct: keep === current.keep });
    setTimeout(() => {
      setFeedback(null);
      setIdx((i) => i + 1);
    }, 700);
  };

  const handleSubmit = () => {
    const correct = block.items.filter((it) => choices[it.id] === it.keep).length;
    const total = block.items.length;
    setSubmitted(true);
    onAnswer(correct === total, Math.round((correct / total) * 100));
  };

  if (allDone && !submitted) {
    return (
      <div className="space-y-5">
        <BlockHeader label="Trier" text={block.question} />
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg mb-1">Tous les éléments ont été triés !</p>
          <p className="text-white/50 text-sm">Validez pour voir le résultat</p>
        </div>
        <SubmitButton onClick={handleSubmit} disabled={disabled ?? false} label="Valider" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BlockHeader label="Trier" text={block.question} />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {shuffled.map((it, i) => (
          <div key={it.id} className={cn(
            'h-2 rounded-full flex-1 transition-all',
            i < idx ? 'bg-orange-400/60' : i === idx ? 'bg-orange-500' : 'bg-white/10'
          )} />
        ))}
      </div>

      {/* Current item card */}
      <div className={cn(
        'min-h-[140px] rounded-3xl p-6 flex items-center justify-center text-center border-2 transition-all',
        feedback
          ? feedback.correct
            ? 'border-emerald-400 bg-emerald-500/10 pop-in'
            : 'border-red-400 bg-red-500/10 shake'
          : 'border-white/10 bg-white/5'
      )}>
        <div>
          {feedback && (
            <div className="mb-2">
              {feedback.correct
                ? <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                : <XCircle className="w-8 h-8 text-red-400 mx-auto" />}
            </div>
          )}
          <p className="text-xl font-semibold text-white leading-relaxed">{current?.label}</p>
        </div>
      </div>

      {/* Two large bin buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleChoice(false)}
          disabled={disabled || feedback !== null}
          className={cn(
            'h-20 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all touch-manipulation border-2',
            feedback && feedback.correct === false && choices[current?.id ?? ''] === false
              ? 'bg-red-500 text-white border-red-400'
              : 'bg-white/5 text-white/70 border-red-400/30 active:scale-95'
          )}
        >
          <XCircle className="w-6 h-6" />
          {block.discardLabel}
        </button>
        <button
          onClick={() => handleChoice(true)}
          disabled={disabled || feedback !== null}
          className={cn(
            'h-20 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all touch-manipulation border-2',
            feedback && feedback.correct === false && choices[current?.id ?? ''] === true
              ? 'bg-emerald-500 text-white border-emerald-400'
              : 'bg-white/5 text-white/70 border-emerald-400/30 active:scale-95'
          )}
        >
          <CheckCircle className="w-6 h-6" />
          {block.keepLabel}
        </button>
      </div>
    </div>
  );
}

/* ─── 15. Connect the Dots — tap dots in order to trace a path ────────── */
export function ConnectDotsView({ block, onAnswer, disabled }: {
  block: ConnectDotsBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}) {
  const [connected, setConnected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  const sortedDots = [...block.dots].sort((a, b) => a.order - b.order);
  const expectedNext = connected.length + 1;

  const handleTap = (dotId: string) => {
    if (submitted || disabled) return;
    const dot = block.dots.find((d) => d.id === dotId);
    if (!dot) return;
    if (dot.order === expectedNext) {
      setConnected((p) => [...p, dotId]);
      setShowInfo(dotId);
      setError(false);
      if (connected.length + 1 === block.dots.length) {
        setSubmitted(true);
        onAnswer(true, 100);
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  // Build SVG path from connected dots
  const pathPoints = connected
    .map((id) => block.dots.find((d) => d.id === id))
    .filter(Boolean)
    .map((d) => ({ x: d!.x, y: d!.y }));

  const activeInfo = showInfo ? block.dots.find((d) => d.id === showInfo) : null;

  return (
    <div className="space-y-5">
      <BlockHeader label="Relier les points" text={block.question} />

      <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
        <span className="text-base">👆</span>
        <p className="text-sm text-orange-300 font-medium">Touchez les points dans le bon ordre pour tracer le chemin</p>
        <span className="ml-auto text-sm font-bold text-orange-400">{connected.length}/{block.dots.length}</span>
      </div>

      <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-white ring-1 ring-gray-100/80" style={{ touchAction: 'none' }}>
        <img src={block.imageUrl} alt={block.alt} className="w-full object-cover" style={{ maxHeight: 300 }} loading="lazy" />
        {block.caption && <p className="text-xs text-gray-400 text-center px-5 py-2 font-medium italic">{block.caption}</p>}

        {/* SVG overlay for lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: 0, height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {pathPoints.length > 1 && (
            <polyline
              points={pathPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#f97316"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 4 }}
            />
          )}
        </svg>

        {/* Dots */}
        {sortedDots.map((dot) => {
          const isConnected = connected.includes(dot.id);
          const isNext = !isConnected && dot.order === expectedNext;
          return (
            <button
              key={dot.id}
              onClick={() => handleTap(dot.id)}
              disabled={submitted || disabled || isConnected}
              className={cn(
                'absolute flex items-center justify-center rounded-full font-black shadow-lg transition-all duration-200 touch-manipulation',
                error && isNext ? 'bg-red-500 text-white shake' :
                isConnected ? 'bg-emerald-500 text-white' :
                isNext ? 'bg-orange-500 text-white ring-4 ring-orange-300/60 animate-pulse' :
                'bg-white/90 text-gray-400'
              )}
              style={{
                left: `calc(${dot.x}% - 18px)`,
                top: `calc(${dot.y}% - 18px)`,
                width: 36,
                height: 36,
              }}
            >
              {isConnected ? <CheckCircle className="w-5 h-5" /> : dot.order}
            </button>
          );
        })}
      </div>

      {/* Info popup for last connected dot */}
      {activeInfo && !submitted && (
        <div className="rounded-2xl p-4 bg-orange-500/10 border border-orange-500/20 fade-scale-in">
          <p className="font-bold text-orange-300 text-sm mb-1">{activeInfo.label}</p>
          <p className="text-white/70 text-sm leading-relaxed">{activeInfo.info}</p>
        </div>
      )}

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 fade-scale-in">
          <p className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Chemin complété !
          </p>
        </div>
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 16. Word Search — find and tap hidden words in a grid ───────────── */
export function WordSearchView({ block, onAnswer, disabled }: {
  block: WordSearchBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}) {
  const grid = useMemo(() => Array.from({ length: block.gridSize }, (_, row) =>
    block.letters.slice(row * block.gridSize, (row + 1) * block.gridSize).split('')
  ), [block.gridSize, block.letters]);

  const [selected, setSelected] = useState<{ r: number; c: number }[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);

  const selectedWord = selected.map((s) => grid[s.r][s.c]).join('');

  const handleCellDown = (r: number, c: number) => {
    if (submitted || disabled) return;
    setSelected([{ r, c }]);
    setDragging(true);
  };

  const handleCellEnter = (r: number, c: number) => {
    if (!dragging || submitted || disabled) return;
    setSelected((prev) => {
      if (prev.some((p) => p.r === r && p.c === c)) return prev;
      return [...prev, { r, c }];
    });
  };

  const handleUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const word = selected.map((s) => grid[s.r][s.c]).join('');
    const reversed = word.split('').reverse().join('');
    const matched = block.words.find((w) => w.word === word || w.word === reversed);
    if (matched && !found.has(matched.id)) {
      setFound((prev) => new Set(prev).add(matched.id));
    }
    setSelected([]);
  }, [dragging, selected, grid, block.words, found]);

  useEffect(() => {
    if (found.size === block.words.length && !submitted) {
      setSubmitted(true);
      onAnswer(true, 100);
    }
  }, [found, block.words.length, submitted, onAnswer]);

  const isCellSelected = (r: number, c: number) => selected.some((p) => p.r === r && p.c === c);
  return (
    <div className="space-y-5" onPointerLeave={handleUp}>
      <BlockHeader label="Mots cachés" text={block.question} />

      <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
        <span className="text-base">👆</span>
        <p className="text-sm text-orange-300 font-medium">Glissez votre doigt sur les lettres pour former un mot</p>
        <span className="ml-auto text-sm font-bold text-orange-400">{found.size}/{block.words.length}</span>
      </div>

      {/* Word clues */}
      <div className="flex flex-wrap gap-2">
        {block.words.map((w) => (
          <span key={w.id} className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
            found.has(w.id)
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200 line-through'
              : 'bg-white/5 border-white/10 text-white/60'
          )}>
            {w.clue}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        className="inline-grid max-w-full gap-1 mx-auto select-none"
        style={{
          gridTemplateColumns: `repeat(${block.gridSize}, 1fr)`,
          touchAction: 'none',
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-word-row]');
          if (cell && event.currentTarget.contains(cell)) handleCellEnter(Number(cell.dataset.wordRow), Number(cell.dataset.wordColumn));
        }}
        onPointerUp={handleUp}
        onPointerCancel={() => { setDragging(false); setSelected([]); }}
      >
        {grid.map((row, r) => row.map((letter, c) => {
          const isSelected = isCellSelected(r, c);
          const currentWord = selected.map((s) => grid[s.r][s.c]).join('');
          const isFound = found.size > 0 && block.words.some((w) => {
            if (!found.has(w.id)) return false;
            return w.word.includes(currentWord) && selected.length === w.word.length;
          });
          return (
            <button
              key={`${r}-${c}`}
              data-word-row={r}
              data-word-column={c}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                handleCellDown(r, c);
              }}
              disabled={submitted || disabled}
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all touch-none',
                isSelected
                  ? 'bg-orange-500 text-white scale-110 shadow-lg'
                  : isFound
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-white/5 text-white/70'
              )}
            >
              {letter}
            </button>
          );
        }))}
      </div>

      {/* Current selection preview */}
      {selected.length > 0 && (
        <div className="text-center">
          <span className="inline-block px-4 py-2 rounded-xl bg-orange-500/20 text-orange-300 font-bold text-lg tracking-widest">
            {selectedWord}
          </span>
        </div>
      )}

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 fade-scale-in">
          <p className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Tous les mots ont été trouvés !
          </p>
        </div>
      )}
      {submitted && block.explanation && <Explanation text={block.explanation} />}
    </div>
  );
}

/* ─── 17. Yes/No Path — gentle decision tree with large buttons ───────── */
export function YesNoPathView({ block, onAnswer, disabled }: {
  block: YesNoPathBlock;
  onAnswer: (isCorrect: boolean, score: number) => void;
  disabled?: boolean;
}) {
  const [currentId, setCurrentId] = useState(block.startStepId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [path, setPath] = useState<string[]>([block.startStepId]);
  const [wrongCount, setWrongCount] = useState(0);

  const current = block.steps.find((s) => s.id === currentId);

  const handleAnswer = (yes: boolean) => {
    if (disabled || feedback || completed || !current) return;
    const nextId = yes ? current.yesStepId : current.noStepId;
    const feedbackText = yes ? current.yesFeedback : current.noFeedback;

    if (current.result) {
      // Leaf node — any answer ends here
      setCompleted(true);
      onAnswer(current.isCorrectEnd ?? true, Math.max(30, 100 - wrongCount * 20));
      return;
    }

    if (feedbackText) {
      setFeedback(feedbackText);
      setTimeout(() => {
        setFeedback(null);
        if (nextId) {
          setCurrentId(nextId);
          setPath((p) => [...p, nextId]);
        } else if (current.result) {
          setCompleted(true);
          onAnswer(current.isCorrectEnd ?? true, 100);
        }
      }, 1800);
    } else if (nextId) {
      setCurrentId(nextId);
      setPath((p) => [...p, nextId]);
    } else {
      setCompleted(true);
      onAnswer(current.isCorrectEnd ?? true, 100);
    }

    // Track wrong turns (simplified — any feedback that contains "non" or similar)
    if (feedbackText && feedbackText.toLowerCase().includes('non')) {
      setWrongCount((c) => c + 1);
    }
  };

  if (completed && current?.result) {
    return (
      <div className="space-y-5">
        <BlockHeader label="Parcours de décision" text={block.question} />
        <div className={cn(
          'p-6 rounded-3xl border-2 text-center fade-scale-in',
          current.isCorrectEnd
            ? 'bg-emerald-500/10 border-emerald-400'
            : 'bg-amber-500/10 border-amber-400'
        )}>
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
            current.isCorrectEnd ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          )}>
            {current.isCorrectEnd
              ? <CheckCircle className="w-7 h-7 text-emerald-400" />
              : <HelpCircle className="w-7 h-7 text-amber-400" />}
          </div>
          <p className="text-lg font-bold text-white mb-2">{current.result}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-5">
        <BlockHeader label="Parcours de décision" text={block.question} />
        <div className="p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-400 text-center fade-scale-in">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-white">Parcours terminé !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BlockHeader label="Parcours de décision" text={block.question} />

      {/* Path breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {path.map((stepId, i) => {
          return (
            <div key={stepId} className="flex items-center gap-1.5">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full',
                i === path.length - 1 ? 'bg-orange-500 scale-150' : 'bg-orange-400/40'
              )} />
              {i < path.length - 1 && <div className="w-4 h-0.5 bg-white/10" />}
            </div>
          );
        })}
      </div>

      {/* Question card */}
      <div className="min-h-[120px] rounded-3xl p-6 bg-white/5 border-2 border-white/10 flex items-center justify-center text-center">
        <p className="text-xl font-semibold text-white leading-relaxed">{current?.question}</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 fade-scale-in">
          <p className="text-base text-sky-200/90 leading-relaxed">{feedback}</p>
        </div>
      )}

      {/* Large Yes/No buttons */}
      {!feedback && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer(false)}
            disabled={disabled}
            className="h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 bg-white/5 text-white/70 border-2 border-red-400/30 active:scale-95 transition-all touch-manipulation"
          >
            <XCircle className="w-7 h-7" /> Non
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={disabled}
            className="h-20 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 bg-white/5 text-white/70 border-2 border-emerald-400/30 active:scale-95 transition-all touch-manipulation"
          >
            <CheckCircle className="w-7 h-7" /> Oui
          </button>
        </div>
      )}
    </div>
  );
}
