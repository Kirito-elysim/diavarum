interface CoursePageHeadingProps {
  title: string;
  instruction?: string;
  pageNumber: number;
  totalPages: number;
  level?: 'h1' | 'h2';
  showCounter?: boolean;
}

export function CoursePageHeading({ title, instruction, pageNumber, totalPages, level: Heading = 'h1', showCounter = true }: CoursePageHeadingProps) {
  return <div className="flex items-end justify-between gap-4 text-white">
    <div className="min-w-0 flex-1">
      <Heading className="font-sans text-lg sm:text-xl font-semibold leading-snug tracking-normal break-words">{title}</Heading>
      {instruction?.trim() && <p className="mt-1.5 text-sm sm:text-base text-gray-300 whitespace-pre-line break-words">{instruction}</p>}
    </div>
    {showCounter && <CoursePageCounter pageNumber={pageNumber} totalPages={totalPages} />}
  </div>;
}

export function CoursePageCounter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return <span aria-label={`Page ${pageNumber} sur ${totalPages}`} className="shrink-0 inline-flex items-center min-h-11 pl-3 border-l border-white/15 font-sans text-base font-medium tabular-nums tracking-normal text-white/75">{pageNumber}/{totalPages}</span>;
}
