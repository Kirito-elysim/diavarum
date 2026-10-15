import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCenter, useCenterPatients, useUpdateCenter } from '../api/hooks';
import { ELIGIBILITY_LABELS, type Center } from '../api/types';
import { UsersPanel } from './AdminPage';
import { NewPatientDialog } from './PatientsPage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ListPagination } from '../components/ListPagination';
import { formatDate } from '../lib/format';

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
  const [form, setForm] = useState({ name: center.name, city: center.city });
  const update = useUpdateCenter();
  return <div className="space-y-6">
    <Link to="/admin/centers" className="text-sm text-emerald-800 hover:underline">← Tous les centres</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold text-emerald-950">{center.name}</h1><Badge variant="secondary">Actif</Badge></div><p className="text-gray-500 mt-1">{center.city} · {center.country}</p></div>
      <Button variant="outline" onClick={() => { setForm({ name: center.name, city: center.city }); setEditing(!editing); }}>Modifier le centre</Button>
    </header>
    {editing && <Card className="p-5"><form className="flex flex-wrap items-end gap-4" onSubmit={async event => {
      event.preventDefault();
      try { await update.mutateAsync({ id: center.id, ...form }); setEditing(false); toast.success('Centre mis à jour'); }
      catch { toast.error('Impossible de modifier le centre. Vérifiez les informations puis réessayez.'); }
    }}><div className="flex-1 min-w-48"><Label htmlFor="center-name">Nom du centre</Label><Input id="center-name" required maxLength={255} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="flex-1 min-w-48"><Label htmlFor="center-city">Ville</Label><Input id="center-city" required maxLength={255} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div><Button type="submit" disabled={update.isPending}>Enregistrer</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button></form></Card>}
    <nav aria-label="Rubriques du centre" className="flex gap-6 border-b">
      {[['patients', 'Patients'], ['team', 'Collaborateurs']].map(([value, label]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} className={`px-1 py-3 text-sm font-medium border-b-2 ${tab === value ? 'border-orange-500 text-emerald-950' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{label}</button>)}
    </nav>
    {tab === 'team' ? <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500"><p>Pour rattacher un collaborateur existant, modifiez les centres de son compte.</p><Button asChild variant="outline"><Link to="/admin/accounts">Gérer les comptes existants</Link></Button></div><UsersPanel centerId={center.id} centerIri={center['@id']} /></div> : <CenterPatients center={center} />}
  </div>;
}

function CenterPatients({ center }: { center: Center }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCenterPatients(center['@id'], search, page);
  return <Card className="overflow-hidden shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b"><Input aria-label="Rechercher un patient du centre" className="max-w-sm" placeholder="Rechercher un patient par nom…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /><Button onClick={() => setCreating(true)}>Nouveau patient</Button></div>
    <Table><TableHeader><TableRow className="bg-gray-50"><TableHead>Patient</TableHead><TableHead>Date de naissance</TableHead><TableHead>Éligibilité</TableHead><TableHead>Enregistré le</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {data?.member.map(patient => <TableRow key={patient.id}><TableCell><Link className="font-medium text-emerald-900 hover:underline" to={`/patients/${patient.id}`}>{patient.lastName} {patient.firstName}</Link></TableCell><TableCell>{formatDate(patient.dateOfBirth, 'dd/MM/yyyy')}</TableCell><TableCell><Badge variant="secondary">{ELIGIBILITY_LABELS[patient.eligibilityStatus]}</Badge></TableCell><TableCell>{formatDate(patient.createdAt)}</TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/patients/${patient.id}`}>Ouvrir le dossier</Link></Button></TableCell></TableRow>)}
      {(isLoading || isError || !data?.member.length) && <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">{isLoading ? 'Chargement…' : isError ? 'Impossible de charger les patients.' : 'Aucun patient trouvé dans ce centre.'}</TableCell></TableRow>}
    </TableBody></Table>
    <ListPagination page={page} total={data?.totalItems ?? 0} pageSize={20} onChange={setPage} />
    {creating && <NewPatientDialog open defaultCenter={center['@id']} onOpenChange={setCreating} onCreated={id => navigate(`/patients/${id}`)} />}
  </Card>;
}
