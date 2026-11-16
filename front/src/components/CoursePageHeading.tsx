interface CoursePageHeadingProps {
  title: string;
  instruction?: string;
  pageNumber: number;
  totalPages: number;
  level?: 'h1' | 'h2';
  showCounter?: boolean;
  /** Picto « ? » des pages interactives */
  showIcon?: boolean;
}

export function CoursePageHeading({ title, instruction, pageNumber, totalPages, level: Heading = 'h1', showCounter = true, showIcon }: CoursePageHeadingProps) {
  return <div className="flex items-end justify-between gap-4 text-white">
    <div className="min-w-0 flex-1 flex items-center gap-3">
      {showIcon && <img src="/pictos/interactif.png" alt="" aria-hidden className="flex-shrink-0 w-12 h-12" draggable={false} />}
      <div className="min-w-0">
        <Heading className={`font-sans text-[28px] ${title.length > 45 ? 'sm:text-[30px]' : 'sm:text-[40px]'} font-bold uppercase leading-snug tracking-normal break-words text-[#E86825]`}>{title}</Heading>
        {instruction?.trim() && <p className="mt-1 text-xl sm:text-[25px] text-[#FFE0D0] whitespace-pre-line break-words">{instruction}</p>}
      </div>
    </div>
    {showCounter && <CoursePageCounter pageNumber={pageNumber} totalPages={totalPages} />}
  </div>;
}

export function CoursePageCounter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return <span aria-label={`Page ${pageNumber} sur ${totalPages}`} className="shrink-0 inline-flex items-center min-h-11 pl-3 border-l border-white/15 font-sans course-label font-medium tabular-nums tracking-normal text-white/75">{pageNumber}/{totalPages}</span>;
}
