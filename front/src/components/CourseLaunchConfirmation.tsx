import { useNavigate } from 'react-router-dom';
import type { TrainingProgram } from '../api/types';

/** Lance un cours du parcours du patient (aucune confirmation, même sans cours optionnel). */
export function useCourseLaunch(patientId: string, program: TrainingProgram | null | undefined) {
  const navigate = useNavigate();
  const launch = (moduleId: string) => {
    if (!program) return;
    navigate(`/sessions/run?patientId=${patientId}&moduleId=${moduleId}&programId=${program.id}`);
  };
  return { launch };
}
