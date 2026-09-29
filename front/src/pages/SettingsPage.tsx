import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSetSecurityCode } from '../api/hooks';
import { ROLE_LABELS } from '../api/types';
import { SecurityCodeForm } from '../components/SecurityCodeForm';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const setSecurityCode = useSetSecurityCode();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Votre compte et votre code de sécurité</p>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />Mon compte</CardTitle>
          <CardDescription>Pour modifier ces informations, adressez-vous à votre cadre de service.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><dt className="text-gray-500">Nom</dt><dd className="font-medium text-gray-900">{user.firstName} {user.lastName}</dd></div>
            <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900">{user.email}</dd></div>
            <div><dt className="text-gray-500">Profil</dt><dd><Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge></dd></div>
            <div>
              <dt className="text-gray-500">Centres</dt>
              <dd className="font-medium text-gray-900">
                {user.role === 'admin_national' ? 'Tous les centres' : user.centers.map((c) => `${c.name} (${c.city})`).join(', ')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {user.role !== 'admin_national' && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-400" />Code de sécurité</CardTitle>
            <CardDescription>
              Demandé pour quitter une séance d'entraînement en cours et revenir à la gestion. 4 à 6 chiffres,
              personnel : ne le communiquez pas au patient.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md">
            <SecurityCodeForm
              submitLabel={user.securityCodeConfigured ? 'Changer mon code' : 'Définir mon code'}
              onSubmit={async (input) => {
                await setSecurityCode.mutateAsync(input);
                await refreshUser();
                toast.success('Code de sécurité mis à jour');
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
