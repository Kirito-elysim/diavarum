import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselBlock } from '../types';
import { cn } from '../lib/utils';

/**
 * Carrousel : images défilantes avec leur texte (interactivité prévue par le cahier des charges).
 * Glisser horizontalement fait défiler les images sans changer de page du cours.
 */
export function CarouselView({ block }: { block: CarouselBlock }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const slide = block.slides[index];
  const last = block.slides.length - 1;
  const go = (i: number) => setIndex(Math.max(0, Math.min(last, i)));

  if (!slide) return null;

  return (
    <div className="space-y-4">
      {block.question && <p className="text-lg font-semibold text-[#004138] leading-snug">{block.question}</p>}

      {/* Le geste horizontal reste dans le carrousel ; le défilement vertical reste disponible. */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: '#1C5335', touchAction: 'pan-y' }}
        data-course-gesture
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; }}
        onTouchCancel={() => { startX.current = null; startY.current = null; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - (startY.current ?? 0))) go(index + (dx < 0 ? 1 : -1));
          startX.current = null;
        }}
      >
        <img key={slide.id} src={slide.imageUrl} alt={slide.alt} className="w-full h-64 sm:h-[400px] object-contain fade-scale-in" draggable={false} />
        {index > 0 && (
          <button onClick={() => go(index - 1)} aria-label="Image précédente" className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#E86825] text-white flex items-center justify-center shadow-lg touch-manipulation">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {index < last && (
          <button onClick={() => go(index + 1)} aria-label="Image suivante" className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#E86825] text-white flex items-center justify-center shadow-lg touch-manipulation">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <p key={`t-${slide.id}`} className="rounded-xl px-5 py-4 text-[20px] text-[#004138] leading-snug text-center min-h-[3.5rem] whitespace-pre-line fade-scale-in" style={{ border: '1.5px solid rgba(0,65,56,0.14)' }}>{slide.text}</p>

      <div className="flex items-center justify-center gap-2">
        {block.slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i)}
            aria-label={`Image ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            className="w-11 h-11 flex items-center justify-center"
          >
            <span className={cn('h-2.5 rounded-full transition-all', i === index ? 'w-8 bg-[#E86825]' : 'w-2.5 bg-[#004138]/15')} />
          </button>
        ))}
      </div>
    </div>
  );
}
