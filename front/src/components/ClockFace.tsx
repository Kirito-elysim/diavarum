import { useRef, useState } from 'react';

/**
 * Horloge du test CODEX : le patient place les 2 aiguilles par déplacement tactile.
 * Grande aiguille par pas de 5 minutes, petite aiguille sur les chiffres.
 */
export function ClockFace({ onChange }: { onChange: (hours: number, minutes: number) => void }) {
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const dragging = useRef<'hour' | 'minute' | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const angleFromEvent = (e: React.PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    const x = e.clientX - (box.left + box.width / 2);
    const y = e.clientY - (box.top + box.height / 2);
    return (Math.atan2(x, -y) * 180) / Math.PI + 360; // 0° = midi, sens horaire
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const step = Math.round(angleFromEvent(e) / 30) % 12; // 12 positions
    if (dragging.current === 'hour') {
      const h = step === 0 ? 12 : step;
      setHours(h);
      onChange(h, minutes);
    } else {
      const m = step * 5;
      setMinutes(m);
      onChange(hours, m);
    }
  };

  const start = (hand: 'hour' | 'minute') => (e: React.PointerEvent) => {
    dragging.current = hand;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const hand = (angle: number, length: number) => ({
    x: 150 + length * Math.sin((angle * Math.PI) / 180),
    y: 150 - length * Math.cos((angle * Math.PI) / 180),
  });
  const hourTip = hand((hours % 12) * 30, 62);
  const minuteTip = hand(minutes * 6, 100);

  return (
    <svg
      ref={svg}
      viewBox="0 0 300 300"
      className="w-full max-w-[420px] touch-none select-none"
      onPointerMove={move}
      onPointerUp={() => (dragging.current = null)}
      onPointerCancel={() => (dragging.current = null)}
      role="img"
      aria-label="Horloge à régler"
    >
      <circle cx="150" cy="150" r="140" fill="#fff" stroke="#004138" strokeWidth="6" />
      {Array.from({ length: 60 }, (_, i) => {
        const outer = hand(i * 6, 132);
        const inner = hand(i * 6, i % 5 === 0 ? 118 : 126);
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#004138" strokeWidth={i % 5 === 0 ? 3 : 1} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const p = hand((i + 1) * 30, 100);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="700" fill="#1f2937">
            {i + 1}
          </text>
        );
      })}
      {/* Petite aiguille (heures) */}
      <line x1="150" y1="150" x2={hourTip.x} y2={hourTip.y} stroke="#004138" strokeWidth="10" strokeLinecap="round" />
      <circle cx={hourTip.x} cy={hourTip.y} r="20" fill="#004138" fillOpacity="0.15" onPointerDown={start('hour')} className="cursor-grab" data-hand="hour" />
      {/* Grande aiguille (minutes) */}
      <line x1="150" y1="150" x2={minuteTip.x} y2={minuteTip.y} stroke="#E86825" strokeWidth="6" strokeLinecap="round" />
      <circle cx={minuteTip.x} cy={minuteTip.y} r="20" fill="#E86825" fillOpacity="0.2" onPointerDown={start('minute')} className="cursor-grab" data-hand="minute" />
      <circle cx="150" cy="150" r="8" fill="#1f2937" />
    </svg>
  );
}
