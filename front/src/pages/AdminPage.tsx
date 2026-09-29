import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Building2, ChevronLeft, ChevronRight, KeyRound, Loader2, Plus, ScrollText, Trash2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useAccessLogs, useArchiveUser, useCenters, useCreateCenter, useCreateUser, useSetNationalSecurityCode, useUsers, type UserInput,
} from '../api/hooks';
import { ROLE_LABELS, type UserAccount, type UserRole } from '../api/types';
import { ApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { SecurityCodeForm } from '../components/SecurityCodeForm';

export default function AdminPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Centres et comptes' : 'Équipe IDE'}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {isAdmin
            ? 'Centres de dialyse, cadres, IDE et administrateurs nationaux'
            : "IDE d'entraînement de vos centres : création, affiliation, désactivation"}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="users">
          <TabsList className="bg-gray-100 p-1 h-auto rounded-xl">
            <TabsTrigger value="users" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="w-4 h-4 mr-2" />Comptes
            </TabsTrigger>
            <TabsTrigger value="centers" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4 mr-2" />Centres
            </TabsTrigger>
            <TabsTrigger value="code" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <KeyRound className="w-4 h-4 mr-2" />Code national
            </TabsTrigger>
            <TabsTrigger value="log" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ScrollText className="w-4 h-4 mr-2" />Journal des accès
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
          <TabsContent value="centers" className="mt-4"><CentersPanel /></TabsContent>
          <TabsContent value="code" className="mt-4"><NationalCodePanel /></TabsContent>
          <TabsContent value="log" className="mt-4"><AccessLogPanel /></TabsContent>
        </Tabs>
      ) : (
        <UsersPanel />
      )}
    </div>
  );
}

/* ─── Comptes ──────────────────────────────────────────────────────────── */

function UsersPanel() {
  const { user: me, isAdmin } = useAuth();
  const { data, isLoading } = useUsers();
  const archiveUser = useArchiveUser();
  const [creating, setCreating] = useState(false);
  const [toArchive, setToArchive] = useState<UserAccount | null>(null);

  const canManage = (account: UserAccount) => account.id !== me?.id && (isAdmin || account.role === 'ide');

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <p className="text-sm text-gray-500">{data?.totalItems ?? 0} compte{(data?.totalItems ?? 0) > 1 ? 's' : ''} actif{(data?.totalItems ?? 0) > 1 ? 's' : ''}</p>
        <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-9 gap-2">
          <Plus className="w-4 h-4" />{isAdmin ? 'Nouveau compte' : 'Nouvelle IDE'}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nom</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Profil</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Centres</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Dernière connexion</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.member.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <p className="font-medium text-gray-900">{account.lastName.toUpperCase()} {account.firstName}</p>
                <p className="text-xs text-gray-400">{account.email}</p>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={account.role === 'ide' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                  {ROLE_LABELS[account.role]}
                </Badge>
                {!account.securityCodeConfigured && account.role !== 'admin_national' && (
                  <p className="text-xs text-amber-600 mt-1">Code de sécurité non défini</p>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-700">{account.centers.map((c) => c.name).join(', ') || '—'}</TableCell>
              <TableCell className="text-sm text-gray-500">{account.lastLoginAt ? formatDate(account.lastLoginAt, "d MMM yyyy 'à' HH:mm") : 'Jamais'}</TableCell>
              <TableCell className="text-right">
                {canManage(account) && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" aria-label="Désactiver" onClick={() => setToArchive(account)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {isLoading && (
            <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <NewUserDialog open={creating} onOpenChange={setCreating} />

      <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver {toArchive?.firstName} {toArchive?.lastName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte ne pourra plus se connecter. Son historique (patients créés, séances réalisées) est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                toArchive &&
                archiveUser.mutateAsync(toArchive).then(
                  () => toast.success('Compte désactivé'),
                  (err) => toast.error(err instanceof ApiError ? err.message : 'Action impossible'),
                )
              }
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function NewUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { isAdmin } = useAuth();
  const { data: centers } = useCenters();
  const createUser = useCreateUser();
  const empty: UserInput = { email: '', firstName: '', lastName: '', role: 'ide', centers: [], plainPassword: '' };
  const [form, setForm] = useState<UserInput>(empty);
  const [error, setError] = useState<ApiError | null>(null);

  const set = (field: 'email' | 'firstName' | 'lastName' | 'plainPassword') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });
  const toggleCenter = (iri: string, checked: boolean) =>
    setForm({ ...form, centers: checked ? [...form.centers, iri] : form.centers.filter((c) => c !== iri) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await createUser.mutateAsync(form);
      toast.success(`Compte créé pour ${user.firstName} ${user.lastName}`);
      setForm(empty);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Une erreur est survenue.'));
    }
  };

  const fieldError = (field: string) => error?.fieldError(field) && <p className="text-xs text-red-600">{error.fieldError(field)}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAdmin ? 'Nouveau compte' : 'Nouvelle IDE d\'entraînement'}</DialogTitle>
          <DialogDescription>Communiquez le mot de passe provisoire à la personne ; elle choisira son code de sécurité à la première connexion.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="u-last">Nom</Label>
              <Input id="u-last" value={form.lastName} onChange={set('lastName')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-first">Prénom</Label>
              <Input id="u-first" value={form.firstName} onChange={set('firstName')} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email professionnel</Label>
            <Input id="u-email" type="email" value={form.email} onChange={set('email')} required />
            {fieldError('email')}
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Profil</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.role !== 'admin_national' && (
            <div className="space-y-2">
              <Label>Centres d'affiliation</Label>
              <div className="grid grid-cols-2 gap-2">
                {centers?.member.map((center) => (
                  <div key={center.id} className="flex items-center gap-2">
                    <Checkbox id={`c-${center.id}`} checked={form.centers.includes(center['@id'])} onCheckedChange={(c) => toggleCenter(center['@id'], c === true)} />
                    <label htmlFor={`c-${center.id}`} className="text-sm cursor-pointer">{center.name}</label>
                  </div>
                ))}
              </div>
              {fieldError('centers')}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">Mot de passe provisoire</Label>
            <Input id="u-pass" type="text" autoComplete="new-password" value={form.plainPassword} onChange={set('plainPassword')} required />
            <p className="text-xs text-gray-400">12 caractères minimum, avec majuscules, chiffres ou symboles.</p>
            {fieldError('plainPassword')}
          </div>
          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={createUser.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le compte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Centres (administrateur national) ────────────────────────────────── */

function CentersPanel() {
  const { data, isLoading } = useCenters();
  const createCenter = useCreateCenter();
  const [form, setForm] = useState({ name: '', city: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCenter.mutateAsync(form);
      toast.success(`Centre « ${form.name} » créé`);
      setForm({ name: '', city: '' });
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Création impossible');
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Centre</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Ville</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.member.map((center) => (
              <TableRow key={center.id}>
                <TableCell className="font-medium text-gray-900">{center.name}</TableCell>
                <TableCell className="text-gray-600">{center.city}</TableCell>
                <TableCell className="text-gray-500 text-sm">{formatDate(center.createdAt)}</TableCell>
              </TableRow>
            ))}
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin inline text-gray-400" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 h-fit">
        <CardHeader>
          <CardTitle className="text-base">Nouveau centre</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nom</Label>
              <Input id="c-name" placeholder="Diaverum …" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-city">Ville</Label>
              <Input id="c-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <Button type="submit" disabled={createCenter.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {createCenter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le centre
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Code national (garde-fou) ────────────────────────────────────────── */

function NationalCodePanel() {
  const setNationalCode = useSetNationalSecurityCode();

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Code de sécurité national</CardTitle>
        <CardDescription>
          Code « garde-fou » qui déverrouille les séances de toutes les IDE. Après modification, il est envoyé
          automatiquement par email à tous les administrateurs nationaux.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SecurityCodeForm
          submitLabel="Changer le code national"
          onSubmit={async (input) => {
            await setNationalCode.mutateAsync(input);
            toast.success('Code national modifié et transmis aux administrateurs');
          }}
        />
      </CardContent>
    </Card>
  );
}

/* ─── Journal des accès (traçabilité RGPD) ─────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  login_success: 'Connexion',
  login_failure: 'Échec de connexion',
  logout: 'Déconnexion',
  read: 'Consultation',
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  action: 'Action',
  export: 'Export',
};

function AccessLogPanel() {
  const [user, setUser] = useState('');
  const [action, setAction] = useState('all');
  const [resourceId, setResourceId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAccessLogs({
    user: user || undefined,
    action: action === 'all' ? undefined : action,
    resourceId: resourceId.trim() || undefined,
    page,
  });
  const pages = Math.max(1, Math.ceil((data?.totalItems ?? 0) / 50));
  const filter = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setPage(1); };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
        <Input placeholder="Utilisateur (email)" value={user} onChange={(e) => filter(setUser)(e.target.value)} className="h-9 w-56" />
        <Select value={action} onValueChange={filter(setAction)}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Identifiant de ressource (ex. patient)" value={resourceId} onChange={(e) => filter(setResourceId)(e.target.value)} className="h-9 w-80 font-mono text-xs" />
        {isFetching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <span className="ml-auto text-sm text-gray-500">{data?.totalItems ?? 0} entrée(s)</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
            <TableHead className="text-xs uppercase">Date</TableHead>
            <TableHead className="text-xs uppercase">Utilisateur</TableHead>
            <TableHead className="text-xs uppercase">Action</TableHead>
            <TableHead className="text-xs uppercase">Ressource</TableHead>
            <TableHead className="text-xs uppercase">Résultat</TableHead>
            <TableHead className="text-xs uppercase">Adresse IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.member.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-xs text-gray-600 whitespace-nowrap">{formatDate(entry.occurredAt, 'dd/MM/yyyy HH:mm:ss')}</TableCell>
              <TableCell className="text-sm">{entry.userEmail ?? '—'}</TableCell>
              <TableCell className="text-sm">{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
              <TableCell className="text-xs text-gray-600">
                {entry.resourceType ?? '—'}
                {entry.resourceId && <span className="block font-mono text-[10px] text-gray-400">{entry.resourceId}</span>}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={entry.statusCode < 400 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>{entry.statusCode}</Badge>
              </TableCell>
              <TableCell className="text-xs font-mono text-gray-500">{entry.ip ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-100">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm text-gray-500">Page {page} / {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </Card>
  );
}
