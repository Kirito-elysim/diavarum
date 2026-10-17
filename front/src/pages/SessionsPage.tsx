import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SessionsTable } from '../components/SessionsTable';

export default function SessionsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Séances d'entraînement</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historique des séances des patients de vos centres</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200" onClick={() => navigate('/sessions/new')}>
          <Play className="w-4 h-4" />
          Nouvelle séance
        </Button>
      </div>
      <SessionsTable />
    </div>
  );
}
