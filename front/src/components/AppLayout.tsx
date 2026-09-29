import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSetSecurityCode } from '../api/hooks';
import Sidebar from './Sidebar';
import { SecurityCodeForm } from './SecurityCodeForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export default function AppLayout() {
  const { user, refreshUser } = useAuth();
  const setSecurityCode = useSetSecurityCode();

  // Première connexion : l'IDE doit définir son code personnel (demandé pour quitter une séance).
  // Les administrateurs nationaux utilisent le code national.
  const mustConfigureCode = !!user && user.role !== 'admin_national' && !user.securityCodeConfigured;

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <Dialog open={mustConfigureCode}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-2">
              <ShieldCheck className="w-6 h-6 text-orange-600" />
            </div>
            <DialogTitle>Choisissez votre code de sécurité</DialogTitle>
            <DialogDescription>
              Il vous sera demandé pour quitter une séance d'entraînement en cours et revenir à la gestion.
              Il vous est personnel : ne le communiquez pas au patient.
            </DialogDescription>
          </DialogHeader>
          <SecurityCodeForm
            submitLabel="Enregistrer mon code"
            onSubmit={async (input) => {
              await setSecurityCode.mutateAsync(input);
              await refreshUser();
              toast.success('Code de sécurité enregistré');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
