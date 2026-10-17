import { ProgramsTable } from '../components/ProgramsTable';

/**
 * Parcours d'entraînement des patients de mes centres.
 * Un parcours se crée et se compose depuis la fiche du patient.
 */
export default function ParcoursPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parcours d'entraînement</h1>
        <p className="text-gray-500 text-sm mt-0.5">Progression des patients de vos centres ; un parcours se crée depuis la fiche du patient</p>
      </div>
      <ProgramsTable />
    </div>
  );
}
