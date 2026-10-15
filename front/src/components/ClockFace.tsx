import { useRef } from 'react';

export type ClockStroke = { x: number; y: number }[];

/** Cadran vierge : aucune graduation ni aiguille susceptible de guider le patient. */
export function ClockFace({ strokes, onChange, readOnly = false }: {
  strokes: ClockStroke[];
  onChange?: (strokes: ClockStroke[]) => void;
  readOnly?: boolean;
}) {
  const pointer = useRef<number | null>(null);
  const current = useRef<ClockStroke[]>(strokes);
  current.current = strokes;
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(300, (event.clientX - box.left) * 300 / box.width)), y: Math.max(0, Math.min(300, (event.clientY - box.top) * 300 / box.height)) };
  };
  const update = (next: ClockStroke[]) => { current.current = next; onChange?.(next); };
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[420px] touch-none select-none" role="img" aria-label={readOnly ? 'Horloge dessinée par le patient' : 'Cadran vierge à dessiner au doigt ou au stylet'}
      onPointerDown={(event) => {
        if (readOnly || pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update([...current.current, [point(event)]]);
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId) return;
        const previous = current.current;
        update([...previous.slice(0, -1), [...previous[previous.length - 1], point(event)]]);
      }}
      onPointerUp={() => { pointer.current = null; }}
      onPointerCancel={() => { pointer.current = null; }}
      onLostPointerCapture={() => { pointer.current = null; }}>
      <circle cx="150" cy="150" r="140" fill="white" stroke="#004138" strokeWidth="3" />
      {strokes.map((stroke, index) => <polyline key={index} points={stroke.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}
