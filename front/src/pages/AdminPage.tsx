import { Link, useNavigate } from 'react-router-dom';
import { ListPagination } from '../components/ListPagination';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CenterPicker } from '../components/CenterPicker';
import { SearchableSelect } from '../components/SearchableSelect';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { AlertTriangle, Archive, Building2, Check, Download, FileSpreadsheet, Filter, KeyRound, Loader2, Pencil, Plus, Link2, RotateCcw, ScrollText, Search, ShieldCheck, Unlink, Upload, UserRoundX, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useUpdateUser, useResetPassword, useSetUserCenters, useRestoreUser, useRestoreCenter, type ArchiveStatus, useAccessLogs, useArchiveUser, useArchiveCenter, useCenters, useCreateUser, useSetNationalSecurityCode, useUsers, type UserInput,
} from '../api/hooks';
import { ROLE_LABELS, type Center, type UserAccount, type UserRole } from '../api/types';
import { ApiError, downloadFile } from '../lib/api';
import { formatDate } from '../lib/format';
import { generateTemporaryPassword } from '../lib/password';
import { PasswordField } from '../components/PasswordField';
import { SecurityCodeForm } from '../components/SecurityCodeForm';
import { CenterDialog } from '../components/CenterDialog';
import { ImportDialog } from '../components/ImportDialog';

type AdminSection = 'users' | 'centers' | 'security' | 'logs';

const SECTION_HEADERS: Record<AdminSection, { title: string; subtitle: string }> = {
  users: { title: 'Utilisateurs', subtitle: 'Accès et rattachement des membres de votre équipe' },
  centers: { title: 'Centres', subtitle: 'Les centres de dialyse et leurs équipes' },
  security: { title: 'Code national', subtitle: 'Code garde-fou qui déverrouille les séances de toutes les IDE' },
  logs: { title: 'Journal des accès', subtitle: 'Traçabilité des connexions, consultations et modifications (RGPD)' },
};

export default function AdminPage({ section = 'users' }: { section?: AdminSection }) {
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const { title, subtitle } = SECTION_HEADERS[section];
  const importType = section === 'users' ? 'users' : section === 'centers' ? 'centers' : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
        </div>
        {importType && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImporting(true)} className="h-10 px-4 gap-2">
              <Upload className="w-4 h-4" />
              Importer
            </Button>
            <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200">
              <Plus className="w-4 h-4" />
              {section === 'centers' ? 'Nouveau centre' : isAdmin ? 'Nouvel utilisateur' : 'Nouvelle IDE'}
            </Button>
          </div>
        )}
      </div>
      {section === 'users' && <UsersPanel creating={creating} onCreatingChange={setCreating} />}
      {section === 'centers' && <CentersPanel creating={creating} onCreatingChange={setCreating} />}
      {section === 'security' && <NationalCodePanel />}
      {section === 'logs' && <AccessLogPanel />}
      {importType && <ImportDialog type={importType} open={importing} onOpenChange={setImporting} />}
    </div>
  );
}

const ROLE_BADGE: Record<UserRole, string> = {
  ide: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  cadre: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  admin_national: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Record<'users' | 'centers', { value: ArchiveStatus; label: string }[]> = {
  users: [
    { value: 'active', label: 'Actifs' },
    { value: 'archived', label: 'Désactivés' },
    { value: 'all', label: 'Tous les statuts' },
  ],
  centers: [
    { value: 'active', label: 'Actifs' },
    { value: 'archived', label: 'Archivés' },
    { value: 'all', label: 'Tous les statuts' },
  ],
};

/**
 * Liste des utilisateurs. Sur la page Utilisateurs, la création est pilotée par le bouton de l'en-tête
 * (creating / onCreatingChange) ; intégrée ailleurs (fiche centre), la liste affiche son propre bouton.
 */
export function UsersPanel({ centerId, centerIri, creating: creatingProp, onCreatingChange }: {
  centerId?: string;
  centerIri?: string;
  creating?: boolean;
  onCreatingChange?: (open: boolean) => void;
} = {}) {
  const { user: me, isAdmin } = useAuth();
  const [status, setStatus] = useState<ArchiveStatus>('active');
  const { data, isLoading, isError } = useUsers(true, status);
  const { data: centers } = useCenters();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [center, setCenter] = useState(centerId ?? 'all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [localCreating, setLocalCreating] = useState(false);
  const [toArchive, setToArchive] = useState<UserAccount | null>(null);
  const archiveUser = useArchiveUser();
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toRestore, setToRestore] = useState<UserAccount | null>(null);
  const restoreUser = useRestoreUser();
  const [toDetach, setToDetach] = useState<UserAccount | null>(null);
  const setUserCenters = useSetUserCenters();

  const embedded = !onCreatingChange;
  const creating = creatingProp ?? localCreating;
  const setCreating = onCreatingChange ?? setLocalCreating;
  const showCenterColumn = !centerId;
  const showCenterFilter = !centerId && (centers?.member.length ?? 0) > 1;

  const query = search.trim().toLocaleLowerCase();
  const accounts = (data?.member ?? []).filter((a) =>
    `${a.firstName} ${a.lastName} ${a.email}`.toLocaleLowerCase().includes(query)
    && (role === 'all' || a.role === role)
    && (center === 'all' || a.centers.some((c) => c.id === center)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(accounts.length / PAGE_SIZE)));
  const columns = showCenterColumn ? 5 : 4;
  const filter = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(1); };

  const canManage = (account: UserAccount) => account.id !== me?.id && (isAdmin || account.role === 'ide');

  return (
    <>
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                aria-label="Rechercher un utilisateur"
                placeholder="Rechercher par nom ou email…"
                value={search}
                onChange={(e) => filter(setSearch)(e.target.value)}
                className="pl-9 h-10 bg-gray-50 border-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <SearchableSelect
                aria-label="Filtrer par rôle"
                className="w-48"
                value={role}
                onChange={filter(setRole)}
                placeholder="Tous les rôles"
                searchPlaceholder="Rechercher un rôle…"
                emptyText="Aucun rôle trouvé"
                options={[{ value: 'all', label: 'Tous les rôles' }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))]}
              />
              <SearchableSelect
                aria-label="Filtrer par statut"
                className="w-40"
                value={status}
                onChange={(value) => filter(setStatus)(value as ArchiveStatus)}
                placeholder="Actifs"
                searchPlaceholder="Rechercher…"
                options={STATUS_OPTIONS.users}
              />
              {showCenterFilter && (
                <SearchableSelect
                  aria-label="Filtrer par centre"
                  className="w-52"
                  value={center}
                  onChange={filter(setCenter)}
                  placeholder="Tous les centres"
                  searchPlaceholder="Rechercher un centre ou une ville…"
                  emptyText="Aucun centre trouvé"
                  options={[{ value: 'all', label: 'Tous les centres' }, ...(centers?.member ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.city }))]}
                />
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {accounts.length} utilisateur{accounts.length > 1 ? 's' : ''}
              </span>
              {centerIri && (
                <Button variant="outline" onClick={() => setImporting(true)} className="h-10 px-4 gap-2">
                  <Upload className="w-4 h-4" />
                  Importer
                </Button>
              )}
              {centerIri && (
                <Button variant="outline" onClick={() => setAttaching(true)} className="h-10 px-4 gap-2">
                  <Link2 className="w-4 h-4" />
                  Rattacher un utilisateur
                </Button>
              )}
              {embedded && (
                <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200">
                  <Plus className="w-4 h-4" />
                  {isAdmin ? 'Nouvel utilisateur' : 'Nouvelle IDE'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</TableHead>
              {showCenterColumn && <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Centres</TableHead>}
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernière connexion</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && accounts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((account) => (
              <TableRow key={account.id} className={`border-gray-100 hover:bg-orange-50/30 transition-colors ${account.archivedAt ? 'bg-gray-50/70 text-gray-400' : ''}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${account.archivedAt ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-700'}`}>
                      {account.firstName[0]}{account.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium ${account.archivedAt ? 'text-gray-500' : 'text-gray-900'}`}>{account.lastName.toUpperCase()} {account.firstName}</p>
                      <p className="text-xs text-gray-400 truncate">{account.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs font-medium ${ROLE_BADGE[account.role]}`}>{ROLE_LABELS[account.role]}</Badge>
                  {account.archivedAt ? (
                    <p className="text-xs text-gray-500 mt-1">Désactivé le {formatDate(account.archivedAt)}</p>
                  ) : account.role !== 'admin_national' && !account.securityCodeConfigured && (
                    <p className="text-xs text-amber-600 mt-1">Code de sécurité non défini</p>
                  )}
                </TableCell>
                {showCenterColumn && (
                  <TableCell className="text-sm text-gray-700 max-w-xs">
                    {account.role === 'admin_national'
                      ? <span className="text-gray-400">Tous les centres</span>
                      : account.centers.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && ', '}
                          {isAdmin ? <Link className="hover:underline hover:text-orange-600" to={`/admin/centers/${c.id}`}>{c.name}</Link> : c.name}
                        </span>
                      ))}
                  </TableCell>
                )}
                <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                  {account.lastLoginAt ? formatDate(account.lastLoginAt, "d MMM yyyy 'à' HH:mm") : <span className="text-gray-400">Jamais</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {canManage(account) && account.archivedAt && (
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50" aria-label={`Réactiver le compte de ${account.firstName} ${account.lastName}`} onClick={() => setToRestore(account)}>
                      <RotateCcw className="w-4 h-4" />Réactiver
                    </Button>
                  )}
                  {canManage(account) && !account.archivedAt && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900" title="Modifier le compte" aria-label={`Modifier le compte de ${account.firstName} ${account.lastName}`} onClick={() => setEditing(account)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900" title="Réinitialiser le mot de passe" aria-label={`Réinitialiser le mot de passe de ${account.firstName} ${account.lastName}`} onClick={() => setResetting(account)}>
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      {centerIri && (
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                          title={account.centers.length > 1 ? 'Retirer du centre' : 'Dernier centre de ce compte : désactivez plutôt le compte'}
                          aria-label={`Retirer ${account.firstName} ${account.lastName} du centre`}
                          disabled={account.centers.length <= 1}
                          onClick={() => setToDetach(account)}
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600" title="Désactiver le compte" aria-label={`Désactiver le compte de ${account.firstName} ${account.lastName}`} onClick={() => setToArchive(account)}>
                        <UserRoundX className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns} className="text-center py-12 text-gray-400">
                  {isError ? 'Impossible de charger les utilisateurs.' : 'Aucun utilisateur ne correspond à votre recherche'}
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columns} className="text-center py-12 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {accounts.length > PAGE_SIZE && <ListPagination page={currentPage} total={accounts.length} pageSize={PAGE_SIZE} onChange={setPage} />}
      </Card>

      {editing && <NewUserDialog key={editing.id} account={editing} open onOpenChange={(open) => !open && setEditing(null)} />}
      <NewUserDialog defaultCenter={centerIri} open={creating} onOpenChange={setCreating} />
      {resetting && <ResetPasswordDialog key={resetting.id} account={resetting} onClose={() => setResetting(null)} />}
      {centerId && (
        <ImportDialog
          type="users"
          open={importing}
          onOpenChange={setImporting}
          centerId={centerId}
          centerName={centers?.member.find((c) => c.id === centerId)?.name}
        />
      )}
      {attaching && centerIri && (
        <AttachUserDialog
          centerIri={centerIri}
          centerName={centers?.member.find((c) => c['@id'] === centerIri)?.name ?? 'ce centre'}
          candidates={(data?.member ?? []).filter((a) => !a.archivedAt && a.role !== 'admin_national' && !a.centers.some((c) => c['@id'] === centerIri))}
          onClose={() => setAttaching(false)}
        />
      )}

      <AlertDialog open={!!toRestore} onOpenChange={(open) => !open && setToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver {toRestore?.firstName} {toRestore?.lastName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte retrouve ses centres ({toRestore?.role === 'admin_national' ? 'tous les centres' : toRestore?.centers.map((c) => c.name).join(', ')}) et peut de nouveau se connecter
              avec son mot de passe actuel. Pensez à le réinitialiser s'il a été oublié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                toRestore &&
                restoreUser.mutateAsync(toRestore).then(
                  () => toast.success(`Compte de ${toRestore.firstName} ${toRestore.lastName} réactivé`),
                  (err) => toast.error(err instanceof ApiError ? err.message : 'Réactivation impossible'),
                )
              }
            >
              Réactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDetach} onOpenChange={(open) => !open && setToDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer {toDetach?.firstName} {toDetach?.lastName} de ce centre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte reste actif dans ses autres centres ({toDetach?.centers.filter((c) => c['@id'] !== centerIri).map((c) => c.name).join(', ')}).
              Il ne verra plus les patients de ce centre ; son historique est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                toDetach &&
                setUserCenters.mutateAsync({ id: toDetach.id, centers: toDetach.centers.map((c) => c['@id']).filter((iri) => iri !== centerIri) }).then(
                  () => toast.success(`${toDetach.firstName} ${toDetach.lastName} retiré(e) du centre`),
                  (err) => toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Action impossible'),
                )
              }
            >
              Retirer du centre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
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
  const centerList = centers?.member ?? [];
  // Un seul centre accessible (cas habituel du cadre) : il est présélectionné à la création
  const selectedCenters = !account && form.centers.length === 0 && centerList.length === 1 ? [centerList[0]['@id']] : form.centers;

  const set = (field: 'email' | 'firstName' | 'lastName' | 'plainPassword') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const input = { ...form, centers: form.role === 'admin_national' ? [] : selectedCenters };
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
          <DialogTitle>{account ? 'Modifier le compte' : isAdmin ? 'Nouvel utilisateur' : 'Nouvelle IDE d\'entraînement'}</DialogTitle>
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
            <div className="space-y-1.5">
              <Label>Centres de rattachement</Label>
              <CenterPicker centers={centerList} value={selectedCenters} onChange={(value) => setForm({ ...form, centers: value })} invalid={!!error?.fieldError('centers')} />
              {fieldError('centers')}
            </div>
          )}
          <PasswordField
            id="u-pass"
            label={account ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe provisoire'}
            value={form.plainPassword ?? ''}
            onChange={(plainPassword) => setForm({ ...form, plainPassword })}
            required={!account}
            error={fieldError('plainPassword')}
          />
          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {account ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Rattache un utilisateur existant (IDE ou cadre) à un centre, en plus de ses centres actuels */
function AttachUserDialog({ centerIri, centerName, candidates, onClose }: { centerIri: string; centerName: string; candidates: UserAccount[]; onClose: () => void }) {
  const setUserCenters = useSetUserCenters();
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const attach = async () => {
    if (!selected) return;
    try {
      await setUserCenters.mutateAsync({ id: selected.id, centers: [...selected.centers.map((c) => c['@id']), centerIri] });
      toast.success(`${selected.firstName} ${selected.lastName} rattaché(e) à ${centerName}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Rattachement impossible');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rattacher un utilisateur</DialogTitle>
          <DialogDescription>Ajoutez une IDE ou un cadre existant à {centerName}. Ses autres centres sont conservés.</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border" filter={(_, search, keywords) => (normalize(keywords?.join(' ') ?? '').includes(normalize(search.trim())) ? 1 : 0)}>
          <CommandInput placeholder="Rechercher par nom ou email…" />
          <CommandList className="max-h-72">
            <CommandEmpty>{candidates.length ? 'Aucun utilisateur trouvé' : 'Tous les utilisateurs sont déjà rattachés à ce centre'}</CommandEmpty>
            {candidates.map((account) => (
              <CommandItem
                key={account.id}
                value={account.id}
                keywords={[account.firstName, account.lastName, account.email]}
                onSelect={() => setSelected(account)}
                className="gap-3 py-2 cursor-pointer data-[selected=true]:bg-orange-50 data-[selected=true]:text-gray-900"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-semibold flex-shrink-0">
                  {account.firstName[0]}{account.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{account.lastName.toUpperCase()} {account.firstName}</p>
                  <p className="text-xs text-gray-400 truncate">{account.email} · {account.centers.map((c) => c.name).join(', ')}</p>
                </div>
                <Badge variant="secondary" className={`text-xs ${ROLE_BADGE[account.role]}`}>{ROLE_LABELS[account.role]}</Badge>
                <Check className={`w-4 h-4 text-orange-600 ${selected?.id === account.id ? '' : 'invisible'}`} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="button" disabled={!selected || setUserCenters.isPending} onClick={attach} className="bg-orange-500 hover:bg-orange-600 text-white">
            {setUserCenters.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selected ? `Rattacher ${selected.firstName} ${selected.lastName}` : 'Rattacher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Nouveau mot de passe provisoire pour un membre de l'équipe ; ses sessions ouvertes sont fermées */
function ResetPasswordDialog({ account, onClose }: { account: UserAccount; onClose: () => void }) {
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState(generateTemporaryPassword);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const name = `${account.firstName} ${account.lastName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await resetPassword.mutateAsync({ id: account.id, plainPassword: password });
      setDone(true);
      toast.success(`Mot de passe de ${name} réinitialisé`);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Une erreur est survenue.'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            {done
              ? `Communiquez ce mot de passe à ${name}. Il ne sera plus affiché après fermeture.`
              : `${name} (${account.email}) devra utiliser ce nouveau mot de passe. Ses sessions ouvertes seront fermées.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {done ? (
            <div className="rounded-lg bg-orange-50 ring-1 ring-orange-100 px-4 py-3 text-center">
              <p className="font-mono text-lg text-gray-900 select-all">{password}</p>
            </div>
          ) : (
            <PasswordField id="reset-pass" label="Nouveau mot de passe provisoire" value={password} onChange={setPassword} required initiallyVisible error={error?.fieldError('plainPassword') && <p className="text-xs text-red-600">{error.fieldError('plainPassword')}</p>} />
          )}
          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            {done ? (
              <Button type="button" onClick={onClose} className="bg-orange-500 hover:bg-orange-600 text-white">Fermer</Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={resetPassword.isPending || !password} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {resetPassword.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Réinitialiser
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Centres (administrateur national) ────────────────────────────────── */

const STAFFING_OPTIONS = [
  { value: 'all', label: 'Tous les encadrements' },
  { value: 'with', label: 'Avec cadre de service' },
  { value: 'without', label: 'Sans cadre de service' },
];

function CentersPanel({ creating, onCreatingChange }: { creating: boolean; onCreatingChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<ArchiveStatus>('active');
  const { data, isLoading, isError } = useCenters(status);
  const archiveCenter = useArchiveCenter();
  const restoreCenter = useRestoreCenter();
  const [toRestore, setToRestore] = useState<Center | null>(null);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [staffing, setStaffing] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Center | null>(null);
  const [toArchive, setToArchive] = useState<Center | null>(null);
  const filter = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setPage(1); };

  const all = data?.member ?? [];
  const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const term = normalize(search.trim());
  const centers = all.filter((c) =>
    (!term || normalize([c.name, c.city, c.postalCode, c.finess, c.address].filter(Boolean).join(' ')).includes(term))
    && (region === 'all' || (region === 'none' ? !c.region : c.region === region))
    && (staffing === 'all' || (staffing === 'with') === c.managers.length > 0),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(centers.length / PAGE_SIZE)));
  const usedRegions = [...new Set(all.map((c) => c.region).filter((r): r is string => !!r))].sort((x, y) => x.localeCompare(y, 'fr'));
  const totals = centers.reduce((t, c) => ({ patients: t.patients + c.patientCount, nurses: t.nurses + c.nurseCount }), { patients: 0, nurses: 0 });

  return (
    <>
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                aria-label="Rechercher un centre"
                placeholder="Nom, ville, code postal ou FINESS…"
                value={search}
                onChange={(e) => filter(setSearch)(e.target.value)}
                className="pl-9 h-10 bg-gray-50 border-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <SearchableSelect
                aria-label="Filtrer par région"
                className="w-52"
                value={region}
                onChange={filter(setRegion)}
                placeholder="Toutes les régions"
                searchPlaceholder="Rechercher une région…"
                emptyText="Aucune région trouvée"
                options={[
                  { value: 'all', label: 'Toutes les régions' },
                  ...usedRegions.map((r) => ({ value: r, label: r })),
                  ...(all.some((c) => !c.region) ? [{ value: 'none', label: 'Région non renseignée' }] : []),
                ]}
              />
              <SearchableSelect
                aria-label="Filtrer par statut"
                className="w-40"
                value={status}
                onChange={(value) => filter(setStatus)(value as ArchiveStatus)}
                placeholder="Actifs"
                searchPlaceholder="Rechercher…"
                options={STATUS_OPTIONS.centers}
              />
              <SearchableSelect
                aria-label="Filtrer par encadrement"
                className="w-56"
                value={staffing}
                onChange={filter(setStaffing)}
                placeholder="Tous les encadrements"
                searchPlaceholder="Rechercher…"
                options={STAFFING_OPTIONS}
              />
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="w-4 h-4" />
              {centers.length} centre{centers.length > 1 ? 's' : ''}
              <span className="text-gray-300">·</span>
              {totals.patients} patient{totals.patients > 1 ? 's' : ''}
              <span className="text-gray-300">·</span>
              {totals.nurses} IDE
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Centre</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Localisation</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Postes</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Patients</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">IDE</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadre de service</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && centers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((center) => (
              <TableRow key={center.id} className={`border-gray-100 hover:bg-orange-50/30 transition-colors cursor-pointer ${center.archivedAt ? 'bg-gray-50/70' : ''}`} onClick={() => navigate(`/admin/centers/${center.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${center.archivedAt ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-700'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <Link to={`/admin/centers/${center.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-gray-900 hover:text-orange-600 hover:underline">{center.name}</Link>
                      <p className="text-xs text-gray-400">
                        {center.archivedAt ? <span className="text-gray-500 font-medium">Archivé le {formatDate(center.archivedAt)}</span> : center.finess ? `FINESS ${center.finess}` : 'FINESS non renseigné'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="text-gray-700">{[center.postalCode, center.city].filter(Boolean).join(' ')}</p>
                  <p className="text-xs text-gray-400">{center.region ?? 'Région non renseignée'}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {center.phone || center.email ? (
                    <>
                      {center.phone && <a href={`tel:${center.phone.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="block text-gray-700 hover:text-orange-600 whitespace-nowrap">{center.phone}</a>}
                      {center.email && <a href={`mailto:${center.email}`} onClick={(e) => e.stopPropagation()} className="block text-xs text-gray-400 hover:text-orange-600">{center.email}</a>}
                    </>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className="text-sm text-gray-700 text-right tabular-nums">{center.stations ?? <span className="text-gray-400">—</span>}</TableCell>
                <TableCell className="text-sm text-gray-700 text-right tabular-nums">{center.patientCount}</TableCell>
                <TableCell className="text-sm text-gray-700 text-right tabular-nums">{center.nurseCount}</TableCell>
                <TableCell className="text-sm">
                  {center.managers.length
                    ? <span className="text-gray-700">{center.managers.map((m) => m.name).join(', ')}</span>
                    : center.archivedAt
                      ? <span className="text-gray-400">—</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />Aucun cadre</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {center.archivedAt ? (
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50" aria-label={`Réactiver ${center.name}`} onClick={() => setToRestore(center)}>
                      <RotateCcw className="w-4 h-4" />Réactiver
                    </Button>
                  ) : (
                    <>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900" title="Modifier le centre" aria-label={`Modifier ${center.name}`} onClick={() => setEditing(center)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                    title={center.patientCount ? 'Archivage impossible : des patients sont encore suivis dans ce centre' : 'Archiver le centre'}
                    aria-label={`Archiver ${center.name}`}
                    disabled={center.patientCount > 0}
                    onClick={() => setToArchive(center)}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && centers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  {isError ? 'Impossible de charger les centres.' : 'Aucun centre ne correspond à votre recherche'}
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {centers.length > PAGE_SIZE && <ListPagination page={currentPage} total={centers.length} pageSize={PAGE_SIZE} onChange={setPage} />}
      </Card>

      <CenterDialog open={creating} onOpenChange={onCreatingChange} onSaved={(center) => navigate(`/admin/centers/${center.id}`)} />
      {editing && <CenterDialog key={editing.id} center={editing} open onOpenChange={(open) => !open && setEditing(null)} />}

      <AlertDialog open={!!toRestore} onOpenChange={(open) => !open && setToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver {toRestore?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le centre réapparaît dans les listes et peut de nouveau accueillir des patients. Les comptes qui y étaient rattachés le retrouvent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                toRestore &&
                restoreCenter.mutateAsync(toRestore).then(
                  () => toast.success(`Centre « ${toRestore.name} » réactivé`),
                  (err) => toast.error(err instanceof ApiError ? err.message : 'Réactivation impossible'),
                )
              }
            >
              Réactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toArchive} onOpenChange={(open) => !open && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver {toArchive?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le centre n'apparaîtra plus dans les listes. Son historique (séances, statistiques) est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                toArchive &&
                archiveCenter.mutateAsync(toArchive).then(
                  () => toast.success('Centre archivé'),
                  (err) => toast.error(err instanceof ApiError ? err.message : 'Action impossible'),
                )
              }
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─── Code national (garde-fou) ────────────────────────────────────────── */

function NationalCodePanel() {
  const setNationalCode = useSetNationalSecurityCode();

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100 max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-400" />Code de sécurité national</CardTitle>
        <CardDescription>
          Accepté en plus du code personnel de chaque IDE pour quitter une séance en cours (oubli de code, remplacement).
          Après modification, il est envoyé automatiquement par email à tous les administrateurs nationaux.
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
  import: 'Import',
  import_check: 'Vérification d\'import',
};

function AccessLogPanel() {
  const [user, setUser] = useState('');
  const [action, setAction] = useState('all');
  const [resourceId, setResourceId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useAccessLogs({
    user: user || undefined,
    action: action === 'all' ? undefined : action,
    resourceId: resourceId.trim() || undefined,
    page,
  });
  const total = data?.totalItems ?? 0;
  const filter = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setPage(1); };
  const head = 'text-xs font-semibold text-gray-500 uppercase tracking-wider';

  return (
    <>
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input aria-label="Filtrer par utilisateur" placeholder="Email de l'utilisateur…" value={user} onChange={(e) => filter(setUser)(e.target.value)} className="pl-9 h-10 bg-gray-50 border-gray-100" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <SearchableSelect
                aria-label="Filtrer par action"
                className="w-52"
                value={action}
                onChange={filter(setAction)}
                placeholder="Toutes les actions"
                searchPlaceholder="Rechercher une action…"
                options={[{ value: 'all', label: 'Toutes les actions' }, ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))]}
              />
              <Input aria-label="Filtrer par ressource" placeholder="Identifiant de ressource (ex. patient)" value={resourceId} onChange={(e) => filter(setResourceId)(e.target.value)} className={`h-10 w-80 bg-gray-50 border-gray-100 ${resourceId ? 'font-mono text-xs' : ''}`} />
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
              {total} entrée{total > 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              <TableHead className={head}>Date</TableHead>
              <TableHead className={head}>Utilisateur</TableHead>
              <TableHead className={head}>Action</TableHead>
              <TableHead className={head}>Ressource</TableHead>
              <TableHead className={head}>Résultat</TableHead>
              <TableHead className={head}>Adresse IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.member.map((entry) => (
              <TableRow key={entry.id} className="border-gray-100">
                <TableCell className="text-sm text-gray-700 whitespace-nowrap tabular-nums">{formatDate(entry.occurredAt, 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                <TableCell className="text-sm text-gray-700">{entry.userEmail ?? <span className="text-gray-400">—</span>}</TableCell>
                <TableCell className="text-sm text-gray-700">{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                <TableCell className="text-sm text-gray-700">
                  {entry.detail ? (
                    <span className="flex items-center gap-2">
                      {entry.resourceType === 'imports' && <FileSpreadsheet className="w-4 h-4 text-green-700 flex-shrink-0" />}
                      <span>{entry.detail}</span>
                      {entry.action === 'import' && entry.resourceType === 'imports' && entry.resourceId && (
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900 flex-shrink-0"
                          title="Télécharger le fichier importé" aria-label={`Télécharger le fichier : ${entry.detail}`}
                          onClick={() => downloadFile(`/imports/${entry.resourceId}/file`).catch((err) => toast.error(err instanceof ApiError ? err.message : 'Téléchargement impossible'))}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </span>
                  ) : (
                    <>
                      {entry.resourceType ?? <span className="text-gray-400">—</span>}
                      {entry.resourceId && <span className="block font-mono text-[10px] text-gray-400">{entry.resourceId}</span>}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs ${entry.statusCode < 400 ? 'bg-green-50 text-green-700 hover:bg-green-50' : 'bg-red-50 text-red-700 hover:bg-red-50'}`}>{entry.statusCode}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-gray-500">{entry.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {!isLoading && !data?.member.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">Aucune entrée ne correspond à ces filtres</TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {total > 50 && <ListPagination page={page} total={total} pageSize={50} onChange={setPage} />}
      </Card>
    </>
  );
}
