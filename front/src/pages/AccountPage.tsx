import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Building2, CalendarDays, CheckCircle2, Info, KeyRound, LogOut, Mail, ShieldCheck, Tablet } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useSetSecurityCode } from '../api/hooks';
import { ROLE_LABELS, type UserRole } from '../api/types';
import { SecurityCodeForm } from '../components/SecurityCodeForm';
import { formatDate } from '../lib/format';

const ROLE_STYLES: Record<UserRole, string> = {
  ide: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  cadre: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  admin_national: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ide: 'Vous accompagnez les patients pendant leurs séances d\'entraînement.',
  cadre: 'Vous gérez l\'équipe IDE et suivez les résultats de vos centres.',
  admin_national: 'Vous administrez les centres, les comptes et les contenus des séances.',
};

/** Espace personnel : identité, rattachements et code de sécurité */
export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const isAdmin = user.role === 'admin_national';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>
        <p className="text-gray-500 text-sm mt-0.5">Votre profil et la sécurité de vos séances</p>
      </div>

      {/* Identité */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-orange-500 to-orange-400" />
        <CardContent className="px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-orange-100 text-orange-700 text-2xl font-bold flex items-center justify-center">{initials}</div>
            </div>
            <div className="flex-1 min-w-0 pt-12 pb-1">
              <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${ROLE_STYLES[user.role]}`}>{ROLE_LABELS[user.role]}</Badge>
                <span className="text-sm text-gray-500">{ROLE_DESCRIPTIONS[user.role]}</span>
              </div>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 mt-6 pt-6 border-t border-gray-100 text-sm">
            <InfoItem icon={Mail} label="Email de connexion">{user.email}</InfoItem>
            <InfoItem icon={CalendarDays} label="Compte créé le">{formatDate(user.createdAt, 'd MMMM yyyy')}</InfoItem>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Centres */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={Building2} title={isAdmin ? 'Périmètre' : user.centers.length > 1 ? 'Mes centres' : 'Mon centre'} />
            {isAdmin ? (
              <p className="text-sm text-gray-600">Vous avez accès à <span className="font-medium text-gray-900">tous les centres</span> du réseau.</p>
            ) : (
              <ul className="space-y-2">
                {user.centers.map((center) => (
                  <li key={center.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></div>
                    <div>
                      <p className="font-medium text-gray-900">{center.name}</p>
                      <p className="text-xs text-gray-500">{center.city}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="flex gap-2 text-xs text-gray-400">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Vos informations, vos centres et votre mot de passe sont gérés par {isAdmin ? 'un autre administrateur national' : 'votre cadre de service ou un administrateur'}.
            </p>
          </CardContent>
        </Card>

        {/* Code de sécurité */}
        {isAdmin ? <NationalCodeCard /> : <SecurityCodeCard />}
      </div>
    </div>
  );
}

function SecurityCodeCard() {
  const { user, refreshUser } = useAuth();
  const setSecurityCode = useSetSecurityCode();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const configured = user.securityCodeConfigured;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-6 space-y-4">
        <SectionTitle icon={ShieldCheck} title="Mon code de sécurité" />

        {configured ? (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 ring-1 ring-green-100 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-800">Code défini</p>
              {user.securityCodeUpdatedAt && <p className="text-green-700/80">Dernière modification le {formatDate(user.securityCodeUpdatedAt, "d MMMM yyyy 'à' HH:mm")}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 ring-1 ring-amber-100 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Code non défini</p>
              <p className="text-amber-700/80">Il est indispensable pour quitter une séance et valider les compétences.</p>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-900">Quand est-il demandé ?</p>
          <UsageLine icon={LogOut}>Pour quitter une séance avant la fin</UsageLine>
          <UsageLine icon={Tablet}>Quand le patient vous rend la tablette, pour valider les compétences</UsageLine>
          <UsageLine icon={KeyRound}>Personnel : ne le communiquez jamais au patient</UsageLine>
        </div>

        {editing || !configured ? (
          <div className="rounded-xl ring-1 ring-gray-100 p-4">
            <SecurityCodeForm
              submitLabel={configured ? 'Changer mon code' : 'Définir mon code'}
              onSubmit={async (input) => {
                await setSecurityCode.mutateAsync(input);
                await refreshUser();
                setEditing(false);
                toast.success('Code de sécurité mis à jour');
              }}
            />
            {configured && <Button variant="ghost" size="sm" className="mt-2 text-gray-500" onClick={() => setEditing(false)}>Annuler</Button>}
          </div>
        ) : (
          <Button variant="outline" className="h-10 gap-2" onClick={() => setEditing(true)}><KeyRound className="w-4 h-4" />Changer mon code</Button>
        )}
      </CardContent>
    </Card>
  );
}

function NationalCodeCard() {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-6 space-y-4">
        <SectionTitle icon={ShieldCheck} title="Déverrouillage des séances" />
        <p className="text-sm text-gray-600">
          En tant qu'administrateur national, vous n'avez pas de code personnel : le <span className="font-medium text-gray-900">code national</span> déverrouille
          les séances de toutes les IDE (oubli de code, remplacement).
        </p>
        <Button asChild variant="outline" className="h-10 gap-2">
          <Link to="/admin/security">Gérer le code national<ArrowRight className="w-4 h-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Mail; title: string }) {
  return <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Icon className="w-4 h-4 text-orange-500" />{title}</h3>;
}

function InfoItem({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-gray-400" /></div>
      <div className="min-w-0">
        <dt className="text-xs text-gray-400">{label}</dt>
        <dd className="font-medium text-gray-900 break-all">{children}</dd>
      </div>
    </div>
  );
}

function UsageLine({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return <p className="flex items-start gap-2"><Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />{children}</p>;
}
