import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Plus, Eye, Users, Filter, Loader2 } from 'lucide-react';
import { useCenters, useCreatePatient, usePatients } from '../api/hooks';
import { ELIGIBILITY_LABELS } from '../api/types';
import { ApiError } from '../lib/api';
import { ExportButton } from '../components/ExportButton';
import { eligibilityBadge, formatDate } from '../lib/format';

/** Recherche envoyée au serveur après une courte pause de frappe */
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const debouncedSearch = useDebounced(search);

  const { data: centers } = useCenters();
  const { data, isLoading, isError } = usePatients({
    search: debouncedSearch || undefined,
    center: centerFilter === 'all' ? undefined : centerFilter,
    eligibilityStatus: statusFilter === 'all' ? undefined : statusFilter,
  });
  const patients = data?.member ?? [];
  const showCenter = (centers?.member.length ?? 0) > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm mt-0.5">File active de vos centres</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton path="/exports/patients.xlsx" format="xlsx" label="Bilan des patients (Excel)" />
          <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200">
            <Plus className="w-4 h-4" />
            Nouveau patient
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-gray-50 border-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {showCenter && (
                <Select value={centerFilter} onValueChange={setCenterFilter}>
                  <SelectTrigger className="h-10 w-52 bg-gray-50 border-gray-100">
                    <SelectValue placeholder="Tous les centres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les centres</SelectItem>
                    {centers?.member.map((c) => (
                      <SelectItem key={c.id} value={c['@id']}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-44 bg-gray-50 border-gray-100">
                  <SelectValue placeholder="Toutes éligibilités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes éligibilités</SelectItem>
                  {Object.entries(ELIGIBILITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              {data?.totalItems ?? 0} patient{(data?.totalItems ?? 0) > 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date de naissance</TableHead>
              {showCenter && <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Centre</TableHead>}
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Éligibilité</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé par</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow
                key={patient.id}
                className="border-gray-100 hover:bg-orange-50/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-semibold flex-shrink-0">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{patient.lastName.toUpperCase()} {patient.firstName}</p>
                      <p className="text-xs text-gray-400">Enregistré le {formatDate(patient.createdAt)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-700">{formatDate(patient.dateOfBirth, 'dd/MM/yyyy')}</TableCell>
                {showCenter && <TableCell className="text-sm text-gray-700">{patient.center.name}</TableCell>}
                <TableCell>
                  <Badge variant="secondary" className={`text-xs font-medium ${eligibilityBadge[patient.eligibilityStatus]}`}>
                    {ELIGIBILITY_LABELS[patient.eligibilityStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-700">{patient.createdBy.firstName} {patient.createdBy.lastName}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900" aria-label="Voir la fiche">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  {isError ? 'Impossible de charger les patients.' : 'Aucun patient trouvé'}
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <NewPatientDialog open={creating} onOpenChange={setCreating} onCreated={(id) => navigate(`/patients/${id}`)} />
    </div>
  );
}

export function NewPatientDialog({ open, onOpenChange, onCreated, defaultCenter }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void; defaultCenter?: string }) {
  const { data: centers } = useCenters();
  const createPatient = useCreatePatient();
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', center: defaultCenter ?? '' });
  const [error, setError] = useState<ApiError | null>(null);

  const centerList = centers?.member ?? [];
  const center = form.center || (centerList.length === 1 ? centerList[0]['@id'] : '');
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const patient = await createPatient.mutateAsync({ ...form, center, dateOfBirth: form.dateOfBirth || null });
      toast.success(`${patient.firstName} ${patient.lastName} enregistré`);
      setForm({ firstName: '', lastName: '', dateOfBirth: '', center: defaultCenter ?? '' });
      onOpenChange(false);
      onCreated(patient.id);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Une erreur est survenue.'));
    }
  };

  const fieldError = (field: string) => error?.fieldError(field) && <p className="text-xs text-red-600">{error.fieldError(field)}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau patient</DialogTitle>
          <DialogDescription>Le profil complet (questionnaire, test CODEX, éligibilité) se renseigne ensuite sur sa fiche.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-last">Nom</Label>
              <Input id="p-last" value={form.lastName} onChange={set('lastName')} required />
              {fieldError('lastName')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-first">Prénom</Label>
              <Input id="p-first" value={form.firstName} onChange={set('firstName')} required />
              {fieldError('firstName')}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-dob">Date de naissance</Label>
            <Input id="p-dob" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} />
            {fieldError('dateOfBirth')}
          </div>
          {centerList.length > 1 && (
            <div className="space-y-1.5">
              <Label>Centre de dialyse</Label>
              <Select value={center} onValueChange={(value) => setForm({ ...form, center: value })}>
                <SelectTrigger><SelectValue placeholder="Choisir un centre" /></SelectTrigger>
                <SelectContent>
                  {centerList.map((c) => <SelectItem key={c.id} value={c['@id']}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldError('center')}
            </div>
          )}
          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={createPatient.isPending || !center} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createPatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
