import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CourseNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}

/** Navigation commune au lecteur et aux deux aperçus, selon la maquette XD. */
export function CourseNavigation({ onPrevious, onNext, previousDisabled, nextDisabled, nextLabel = 'Page suivante' }: CourseNavigationProps) {
  return <footer className="course-navigation" aria-label="Navigation du cours">
    <button type="button" onClick={onPrevious} disabled={previousDisabled} className="course-navigation-previous"><ChevronLeft aria-hidden="true" /><span>Précédent</span></button>
    <button type="button" onClick={onNext} disabled={nextDisabled} className="course-navigation-next"><span>{nextLabel}</span><ChevronRight aria-hidden="true" /></button>
  </footer>;
}
