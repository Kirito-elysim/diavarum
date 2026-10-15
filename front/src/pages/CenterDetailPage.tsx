import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Archive, Eye, Loader2, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, Search, Upload } from 'lucide-react';
import { useCenter, useCenterPatients, useRestoreCenter } from '../api/hooks';
import { ELIGIBILITY_LABELS, type Center } from '../api/types';
import { UsersPanel } from './AdminPage';
import { NewPatientDialog } from './PatientsPage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { CenterDialog } from '../components/CenterDialog';
import { ImportDialog } from '../components/ImportDialog';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ListPagination } from '../components/ListPagination';
import { eligibilityBadge, formatDate } from '../lib/format';

export default function CenterDetailPage() {
  const { id = '' } = useParams();
  const { data: center, isLoading, isError } = useCenter(id);
  if (isLoading) return <p>Chargement du centre…</p>;
  if (isError || !center) return <div className="space-y-4"><Link to="/admin/centers" className="text-emerald-800 underline">Retour aux centres</Link><p role="alert">Ce centre est introuvable ou inaccessible.</p></div>;
  return <CenterWorkspace key={center.id} center={center} />;
}

function CenterWorkspace({ center }: { center: Center }) {
  const [tab, setTab] = useState('patients');
  const [editing, setEditing] = useState(false);
  const address = [center.address, [center.postalCode, center.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return <div className="space-y-6">
    <Link to="/admin/centers" className="text-sm text-gray-500 hover:text-orange-600">← Tous les centres</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{center.finess ? `FINESS ${center.finess}` : 'FINESS non renseigné'} · {center.region ?? 'Région non renseignée'}</p>
      </div>
      <Button variant="outline" className="h-10 gap-2" onClick={() => setEditing(true)}><Pencil className="w-4 h-4" />Modifier le centre</Button>
    </header>
    {center.archivedAt && <ArchivedBanner center={center} />}
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100"><CardContent className="p-4 grid gap-3 sm:grid-cols-3 text-sm">
        <InfoLine icon={MapPin} label="Adresse">{address || null}</InfoLine>
        <InfoLine icon={Phone} label="Téléphone">{center.phone && <a className="hover:text-orange-600" href={`tel:${center.phone.replace(/[^\d+]/g, '')}`}>{center.phone}</a>}</InfoLine>
        <InfoLine icon={Mail} label="Email">{center.email && <a className="hover:text-orange-600 break-all" href={`mailto:${center.email}`}>{center.email}</a>}</InfoLine>
      </CardContent></Card>
      <div className="grid grid-cols-4 gap-3">
        {[['Postes', center.stations ?? '—'], ['Patients', center.patientCount], ['IDE', center.nurseCount], ['Cadres', center.managers.length]].map(([label, value]) => (
          <Card key={label} className="border-0 shadow-sm ring-1 ring-gray-100"><CardContent className="p-4 text-center min-w-20"><p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p><p className="text-xs text-gray-500">{label}</p></CardContent></Card>
        ))}
      </div>
    </div>
    {editing && <CenterDialog center={center} open onOpenChange={setEditing} />}
    <nav aria-label="Rubriques du centre" className="flex gap-6 border-b">
      {[['patients', 'Patients'], ['team', 'Collaborateurs']].map(([value, label]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} className={`px-1 py-3 text-sm font-medium border-b-2 ${tab === value ? 'border-orange-500 text-emerald-950' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{label}</button>)}
    </nav>
    {tab === 'team' ? <div className="space-y-4"><UsersPanel centerId={center.id} centerIri={center['@id']} /></div> : <CenterPatients center={center} />}
  </div>;
}

function ArchivedBanner({ center }: { center: Center }) {
  const restore = useRestoreCenter();
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-100 ring-1 ring-gray-200 px-4 py-3">
    <p className="flex items-center gap-2 text-sm text-gray-700"><Archive className="w-4 h-4 text-gray-500" />Centre archivé le {formatDate(center.archivedAt)} : il n'apparaît plus dans les listes.</p>
    <Button variant="outline" className="h-9 gap-2 bg-white" disabled={restore.isPending} onClick={() => restore.mutateAsync(center).then(
      () => toast.success(`Centre « ${center.name} » réactivé`),
      () => toast.error('Réactivation impossible'),
    )}><RotateCcw className="w-4 h-4" />Réactiver le centre</Button>
  </div>;
}

function InfoLine({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return <div className="flex gap-2.5"><Icon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" /><div className="min-w-0"><p className="text-xs text-gray-400">{label}</p><p className="text-gray-700">{children || <span className="text-gray-400">Non renseigné</span>}</p></div></div>;
}

function CenterPatients({ center }: { center: Center }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCenterPatients(center['@id'], search, page);
  return <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input aria-label="Rechercher un patient du centre" className="pl-9 h-10 bg-gray-50 border-gray-100" placeholder="Rechercher un patient par nom…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setImporting(true)} className="h-10 px-4 gap-2"><Upload className="w-4 h-4" />Importer</Button>
        <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 gap-2 shadow-sm shadow-orange-200"><Plus className="w-4 h-4" />Nouveau patient</Button>
      </div>
    </div>
    <Table><TableHeader><TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100"><TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</TableHead><TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date de naissance</TableHead><TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Éligibilité</TableHead><TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé par</TableHead><TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {data?.member.map(patient => <TableRow key={patient.id} className="border-gray-100 hover:bg-orange-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)}>
        <TableCell><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-semibold flex-shrink-0">{patient.firstName[0]}{patient.lastName[0]}</div><div><p className="font-medium text-gray-900">{patient.lastName.toUpperCase()} {patient.firstName}</p><p className="text-xs text-gray-400">Enregistré le {formatDate(patient.createdAt)}</p></div></div></TableCell>
        <TableCell className="text-sm text-gray-700">{formatDate(patient.dateOfBirth, 'dd/MM/yyyy')}</TableCell>
        <TableCell><Badge variant="secondary" className={`text-xs font-medium ${eligibilityBadge[patient.eligibilityStatus]}`}>{ELIGIBILITY_LABELS[patient.eligibilityStatus]}</Badge></TableCell>
        <TableCell className="text-sm text-gray-700">{patient.createdBy.firstName} {patient.createdBy.lastName}</TableCell>
        <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900" aria-label="Voir la fiche"><Eye className="w-4 h-4" /></Button></TableCell>
      </TableRow>)}
      {(isLoading || isError || !data?.member.length) && <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-400">{isLoading ? <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…</> : isError ? 'Impossible de charger les patients.' : 'Aucun patient dans ce centre'}</TableCell></TableRow>}
    </TableBody></Table>
    {(data?.totalItems ?? 0) > 20 && <ListPagination page={page} total={data?.totalItems ?? 0} pageSize={20} onChange={setPage} />}
    <ImportDialog type="patients" open={importing} onOpenChange={setImporting} centerId={center.id} centerName={center.name} />
    {creating && <NewPatientDialog open defaultCenter={center['@id']} onOpenChange={setCreating} onCreated={id => navigate(`/patients/${id}`)} />}
  </Card>;
}
