import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrainingProgram } from '../api/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

/** Confirmer le parcours sans cours optionnel avant de remettre la tablette au patient. */
export function useCourseLaunch(patientId: string, program: TrainingProgram | null | undefined) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const launch = (moduleId: string) => {
    if (!program) return;
    const url = `/sessions/run?patientId=${patientId}&moduleId=${moduleId}&programId=${program.id}`;
    const optional = program.modules.filter(item => !item.module.mandatory);
    if (optional.length && !optional.some(item => item.selected)) setPending(url);
    else navigate(url);
  };
  const confirmation = (
    <AlertDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aucun cours optionnel sélectionné</AlertDialogTitle>
          <AlertDialogDescription>Confirmez-vous que ce parcours est adapté au patient et souhaitez-vous lancer le cours ?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Revoir le parcours</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pending) navigate(pending); }}>Lancer le cours</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { launch, confirmation };
}
