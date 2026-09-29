import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EligibilityStatus, ProgramStatus } from '../api/types';

/** Formate une date ISO ; une date seule (AAAA-MM-JJ) est lue en heure locale pour ne pas décaler d'un jour */
export function formatDate(date: string | null | undefined, pattern = 'd MMM yyyy') {
  return date ? format(new Date(date.length === 10 ? `${date}T00:00:00` : date), pattern, { locale: fr }) : '—';
}

/** Durée lisible : « 45 s », « 31 min », « 1 h 05 » */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Libellé d'une séance à partir de son code (liste officielle des séances) */
export function sessionLabel(code: string) {
  if (code === 'S0') return 'Démarrage';
  if (code === 'PT') return 'Post-test';
  if (code.startsWith('O')) return `Optionnelle ${code.slice(1)}`;
  return `Séance ${code.slice(1)}`;
}

export const eligibilityBadge: Record<EligibilityStatus, string> = {
  enregistre: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  eligible: 'bg-green-100 text-green-700 hover:bg-green-100',
  non_eligible: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export const programBadge: Record<ProgramStatus, string> = {
  non_actif: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  actif: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  interrompu: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  acheve: 'bg-green-100 text-green-700 hover:bg-green-100',
};
