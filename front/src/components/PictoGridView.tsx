import type { PictoGridBlock } from '../types';
import { CourseText } from './CourseText';

export function PictoGridView({ block }: { block: PictoGridBlock }) {
  const stacked = block.layout === 'stacked';
  const columns = block.columns ?? 3;
  return <section className="space-y-5 text-[#004138]">
    {block.question && <p className="text-[25px] font-bold"><CourseText text={block.question} /></p>}
    <div className={stacked ? 'course-picto-stack' : `course-picto-grid course-picto-grid-${columns}`}>
      {block.items.map(item => <figure key={item.id} className="min-w-0 text-center">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.alt} className="mx-auto h-[100px] w-[100px] object-contain" /> : <div className="mx-auto h-[100px] w-[100px] rounded-xl border border-dashed border-[#004138]/30" aria-label="Picto à ajouter" />}
        <figcaption className="mt-3 whitespace-pre-line break-words text-[25px] leading-snug"><CourseText text={item.text} /></figcaption>
      </figure>)}
    </div>
  </section>;
}
