import { useAuth } from '../contexts/AuthContext';
import { NurseResults } from './results/NurseResults';
import { StatisticsView } from './results/StatisticsView';

/** Résultats : synthèse statistique pour le cadre et l'administrateur, suivi des patients pour l'IDE */
export default function ResultsPage() {
  const { isCadre } = useAuth();

  return isCadre ? <StatisticsView /> : <NurseResults />;
}
