import type { PictoGridBlock } from '../types';
import { CourseText } from './CourseText';

export function PictoGridView({ block, fill = false }: { block: PictoGridBlock; fill?: boolean }) {
  const stacked = block.layout === 'stacked';
  const comparison = block.comparison === true;
  const columns = block.columns ?? 3;
  return <section className={`space-y-5 text-[#004138]${fill ? ' flex flex-1 flex-col' : ''}`}>
    {block.question && <p className={comparison || block.spread ? 'text-[25px]' : 'text-[25px] font-bold'}><CourseText text={block.question} /></p>}
    <div className={stacked ? `course-picto-stack${block.alignCaptions ? ' course-picto-aligned' : ''}${block.centerRows ? ' course-picto-centered' : ''}${fill ? ' flex-1 justify-evenly' : ''}` : `course-picto-grid course-picto-grid-${columns}${block.centerLastItem ? ' course-picto-center-last' : ''}`}>
      {block.items.map((item, index) => <figure key={item.id} className="min-w-0 text-center" style={{ ...(block.questionGap === 'large' ? { marginTop: 'clamp(48px, 12dvh, 140px)' } : {}), ...(block.centerLastItem && index === block.items.length - 1 ? { gridColumn: '3 / span 2' } : {}) }}>
        {item.title && <h3 className="mb-2 course-label font-bold"><CourseText text={item.title} /></h3>}
        {item.imageUrl ? <img
          src={item.imageUrl}
          alt={item.alt}
          className={block.imageWidth ? 'mx-auto h-auto max-w-full object-contain' : 'mx-auto h-[100px] w-[100px] object-contain'}
          style={block.imageWidth ? { width: block.imageWidth } : undefined}
        /> : <div className="mx-auto h-[100px] w-[100px] rounded-xl border border-dashed border-[#004138]/30" aria-label="Picto à ajouter" />}
        <figcaption
          className={`mt-3 whitespace-pre-line break-words leading-snug ${comparison ? 'mx-auto max-w-full text-left text-xl' : 'text-[25px]'}`}
          style={comparison && block.imageWidth ? { width: block.imageWidth } : undefined}
        ><CourseText text={item.text} /></figcaption>
      </figure>)}
    </div>
  </section>;
}
