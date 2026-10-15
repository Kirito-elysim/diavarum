import { Link } from 'react-router-dom';
import { ListPagination } from '../components/ListPagination';
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
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, UserRoundX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useUpdateUser, useAccessLogs, useArchiveUser, useCenters, useCreateCenter, useCreateUser, useSetNationalSecurityCode, useUsers, type UserInput,
} from '../api/hooks';
import { ROLE_LABELS, type UserAccount, type UserRole } from '../api/types';
import { ApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { SecurityCodeForm } from '../components/SecurityCodeForm';

export default function AdminPage({ section = 'users' }: { section?: 'users' | 'centers' }) {
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold text-emerald-950">{section === 'centers' ? 'Centres' : 'Comptes'}</h1>
    <p className="text-gray-500 text-sm mt-1">{section === 'centers' ? 'Les centres de dialyse et leurs équipes.' : 'Gérez les accès et le rattachement des membres de votre équipe.'}</p></div>
    {section === 'centers' ? <CentersPanel /> : <UsersPanel />}
  </div>;
}

/* ─── Comptes ──────────────────────────────────────────────────────────── */

export function UsersPanel({ centerId, centerIri }: { centerId?: string; centerIri?: string } = {}) {
  const { user: me, isAdmin } = useAuth();
  const { data, isLoading, isError } = useUsers();
  const { data: centers } = useCenters();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [center, setCenter] = useState(centerId ?? 'all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const accounts = (data?.member ?? []).filter(a => `${a.firstName} ${a.lastName} ${a.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (role === 'all' || a.role === role) && (center === 'all' || a.centers.some(c => c.id === center)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(accounts.length / 20)));
  const archiveUser = useArchiveUser();
  const [creating, setCreating] = useState(false);
  const [toArchive, setToArchive] = useState<UserAccount | null>(null);

  const canManage = (account: UserAccount) => account.id !== me?.id && (isAdmin || account.role === 'ide');

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 border-b border-gray-100">
        <p className="text-sm text-gray-500">{accounts.length} compte{accounts.length > 1 ? 's' : ''} actif{accounts.length > 1 ? 's' : ''}</p>
        <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white min-h-11 gap-2">
          <Plus className="w-4 h-4" />{isAdmin ? 'Nouveau compte' : 'Nouvelle IDE'}
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 p-4 bg-gray-50/60">
        <div><Label htmlFor="account-search">Rechercher</Label><Input id="account-search" className="h-11 mt-1" placeholder="Nom ou email" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <div><Label htmlFor="role-filter">Rôle</Label><select id="role-filter" className="w-full h-11 mt-1 rounded-md border bg-white px-3 text-sm" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="all">Tous les rôles</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        {!centerId && <div><Label htmlFor="center-filter">Centre</Label><select id="center-filter" className="w-full h-11 mt-1 rounded-md border bg-white px-3 text-sm" value={center} onChange={e => { setCenter(e.target.value); setPage(1); }}><option value="all">Tous les centres</option>{centers?.member.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
      </div>
      <Table><TableHeader><TableRow className="bg-gray-50"><TableHead>Collaborateur</TableHead><TableHead>Rôle</TableHead>{!centerId && <TableHead>Centres</TableHead>}<TableHead>Dernière connexion</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {accounts.slice((currentPage - 1) * 20, currentPage * 20).map(account => <TableRow key={account.id}>
          <TableCell><p className="font-medium text-emerald-950">{account.lastName} {account.firstName}</p><p className="text-xs text-gray-500">{account.email}</p></TableCell>
          <TableCell><Badge variant="secondary" className={account.role === 'ide' ? 'bg-blue-100 text-blue-800' : account.role === 'cadre' ? 'bg-orange-100 text-orange-800' : 'bg-violet-100 text-violet-800'}>{ROLE_LABELS[account.role]}</Badge></TableCell>
          {!centerId && <TableCell className="text-sm max-w-xs">{account.role === 'admin_national' ? 'Tous les centres' : account.centers.map((c, i) => <span key={c.id}>{i > 0 && ', '}{isAdmin ? <Link className="hover:underline text-emerald-800" to={`/admin/centers/${c.id}`}>{c.name}</Link> : c.name}</span>)}</TableCell>}
          <TableCell className="text-sm whitespace-nowrap">{account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Jamais'}</TableCell><TableCell><span className="text-xs text-emerald-700">Actif</span></TableCell>
          <TableCell className="text-right whitespace-nowrap">{canManage(account) && <><Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(account)}><Pencil className="w-4 h-4" aria-hidden="true" />Modifier</Button><Button variant="ghost" size="sm" className="gap-1.5 text-red-700" onClick={() => setToArchive(account)}><UserRoundX className="w-4 h-4" aria-hidden="true" />Désactiver</Button></>}</TableCell>
        </TableRow>)}
        {(isLoading || isError || !accounts.length) && <TableRow><TableCell colSpan={6} className="py-8 text-center text-gray-500">{isLoading ? 'Chargement…' : isError ? 'Impossible de charger les comptes.' : 'Aucun compte ne correspond à votre recherche.'}</TableCell></TableRow>}
      </TableBody></Table>
      <ListPagination page={currentPage} total={accounts.length} pageSize={20} onChange={setPage} />
      {editing && <NewUserDialog key={editing.id} account={editing} open onOpenChange={open => !open && setEditing(null)} />}
      <NewUserDialog defaultCenter={centerIri} open={creating} onOpenChange={setCreating} />

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

function NewUserDialog({ open, onOpenChange, account, defaultCenter }: { open: boolean; onOpenChange: (open: boolean) => void; account?: UserAccount; defaultCenter?: string }) {
  const { isAdmin } = useAuth();
  const { data: centers } = useCenters();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const empty: UserInput = { email: '', firstName: '', lastName: '', role: 'ide', centers: defaultCenter ? [defaultCenter] : [], plainPassword: '' };
  const [form, setForm] = useState<UserInput>(account ? { email: account.email, firstName: account.firstName, lastName: account.lastName, role: account.role, centers: account.centers.map(c => c['@id']), plainPassword: '' } : empty);
  const [error, setError] = useState<ApiError | null>(null);

  const set = (field: 'email' | 'firstName' | 'lastName' | 'plainPassword') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });
  const toggleCenter = (iri: string, checked: boolean) =>
    setForm({ ...form, centers: checked ? [...form.centers, iri] : form.centers.filter((c) => c !== iri) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const input = { ...form, centers: form.role === 'admin_national' ? [] : form.centers };
      const user = account ? await updateUser.mutateAsync({ id: account.id, input }) : await createUser.mutateAsync(input);
      toast.success(`Compte ${account ? 'modifié' : 'créé'} pour ${user.firstName} ${user.lastName}`);
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
          <DialogTitle>{account ? 'Modifier le compte' : isAdmin ? 'Nouveau compte' : 'Nouvelle IDE d\'entraînement'}</DialogTitle>
          <DialogDescription>{account ? 'Mettez à jour les informations et les accès de ce compte.' : 'Communiquez le mot de passe provisoire à la personne ; elle choisira son code de sécurité à la première connexion.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-semibold text-emerald-950">Identité</h3><div className="grid sm:grid-cols-2 gap-3">
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
              <Label>Droits d’accès</Label>
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
              <Label>Centres de rattachement</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {centers?.member.map((center) => (
                  <div key={center.id} className="flex items-center gap-2 min-h-11">
                    <Checkbox id={`c-${center.id}`} checked={form.centers.includes(center['@id'])} onCheckedChange={(c) => toggleCenter(center['@id'], c === true)} />
                    <label htmlFor={`c-${center.id}`} className="text-sm cursor-pointer">{center.name}</label>
                  </div>
                ))}
              </div>
              {fieldError('centers')}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">{account ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe provisoire'}</Label>
            <Input id="u-pass" type="password" autoComplete="new-password" value={form.plainPassword} onChange={set('plainPassword')} required={!account} />
            <p className="text-xs text-gray-400">12 caractères minimum, avec majuscules, chiffres ou symboles.</p>
            {fieldError('plainPassword')}
          </div>
          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {account ? 'Enregistrer les modifications' : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Centres (administrateur national) ────────────────────────────────── */

function CentersPanel() {
  const { data, isLoading, isError } = useCenters();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const filtered = (data?.member ?? []).filter(c => `${c.name} ${c.city}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const createCenter = useCreateCenter();
  const [form, setForm] = useState({ name: '', city: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCenter.mutateAsync(form);
      toast.success(`Centre « ${form.name} » créé`);
      setForm({ name: '', city: '' });
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Création impossible');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 justify-between"><div className="w-full sm:w-80"><Label htmlFor="center-search">Rechercher un centre</Label><Input id="center-search" className="h-11 mt-1" placeholder="Nom ou ville" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div><Button className="min-h-11 self-end" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Ajouter un centre</Button></div>
      <Card className="overflow-hidden shadow-sm"><Table><TableHeader><TableRow className="bg-gray-50"><TableHead>Centre</TableHead><TableHead>Ville</TableHead><TableHead>Pays</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map(c => <TableRow key={c.id}><TableCell><Link className="font-medium text-emerald-900 hover:underline" to={`/admin/centers/${c.id}`}>{c.name}</Link></TableCell><TableCell>{c.city}</TableCell><TableCell>{c.country}</TableCell><TableCell><Badge variant="secondary">Actif</Badge></TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/admin/centers/${c.id}`}>Ouvrir le centre</Link></Button></TableCell></TableRow>)}
        {(isLoading || isError || !filtered.length) && <TableRow><TableCell colSpan={5} className="text-center py-8">{isLoading ? 'Chargement…' : isError ? 'Impossible de charger les centres.' : 'Aucun centre trouvé.'}</TableCell></TableRow>}
      </TableBody></Table><ListPagination page={currentPage} total={filtered.length} pageSize={20} onChange={setPage} /></Card>
      <Dialog open={creating} onOpenChange={setCreating}><DialogContent><DialogHeader><DialogTitle>Ajouter un centre</DialogTitle><DialogDescription>Renseignez le nom du centre de dialyse et sa ville.</DialogDescription></DialogHeader>
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
      </DialogContent></Dialog>
    </div>
  );
}

/* ─── Code national (garde-fou) ────────────────────────────────────────── */

export function NationalCodePanel() {
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

export function AccessLogPanel() {
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
