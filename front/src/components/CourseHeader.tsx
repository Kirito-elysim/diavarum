import type { ReactNode } from 'react';
import type { ModulePage } from '../types';
import { pageHeaderMeta } from '../lib/courseVisuals';
import { CoursePageCounter, CoursePageHeading } from './CoursePageHeading';

/** Même bandeau dans le lecteur, l'aperçu apprenant et la tablette. */
export function CourseHeader({ page, pageNumber, totalPages, actions, level = 'h1' }: {
  page: ModulePage;
  pageNumber: number;
  totalPages: number;
  actions?: ReactNode;
  level?: 'h1' | 'h2';
}) {
  const meta = pageHeaderMeta(page);
  return <header className="course-header shrink-0 overflow-hidden">
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-72">
        <CoursePageHeading title={page.title} instruction={meta.instruction} icon={meta.icon} level={level} showCounter={false} pageNumber={pageNumber} totalPages={totalPages} />
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end">
        {actions}
        <CoursePageCounter pageNumber={pageNumber} totalPages={totalPages} />
      </div>
    </div>
    <div className="relative h-1 bg-white/10" role="progressbar" aria-label="Progression du cours" aria-valuemin={0} aria-valuemax={totalPages} aria-valuenow={pageNumber}>
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500 ease-out rounded-r-full" style={{ width: `${totalPages ? Math.round(pageNumber / totalPages * 100) : 0}%` }} />
    </div>
  </header>;
}
