import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Download, Eye, Info, Loader2, Upload } from 'lucide-react';
import { getModuleContent, useImportModuleContent, useModules } from '../api/hooks';
import type { Module, ModuleContent } from '../api/types';
import { ApiError } from '../lib/api';
import { sessionLabel } from '../lib/format';

/**
 * Contenus des 33 séances (administrateurs nationaux). Le prestataire intègre les contenus via l'API
 * (/api/content/modules/{code}) ; cet écran permet de contrôler, prévisualiser, exporter et importer un contenu.
 */
export default function ContentAdminPage() {
  const { data, isLoading } = useModules();
  const modules = data?.member ?? [];
  const withContent = modules.filter((m) => m.pageCount > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contenus des séances</h1>
        <p className="text-gray-500 text-sm mt-0.5">{withContent}/{modules.length} séances ont un contenu intégré</p>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-blue-100 bg-blue-50/50">
        <CardContent className="p-4 flex gap-3 text-sm text-blue-900">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>
              Le prestataire intègre les contenus par l'API <code className="bg-white px-1 rounded">PUT /api/content/modules/&#123;code&#125;</code> avec
              l'en-tête <code className="bg-white px-1 rounded">X-Content-Token</code> (jeton fourni par l'hébergeur, sans accès aux données patients).
            </p>
            <p className="mt-1 text-blue-800/80">
              Ici, vous pouvez télécharger le JSON d'une séance, le corriger et le réimporter. Le serveur contrôle la structure avant tout enregistrement.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="text-xs uppercase">Séance</TableHead>
              <TableHead className="text-xs uppercase text-right">Pages</TableHead>
              <TableHead className="text-xs uppercase text-right">Exercices notés</TableHead>
              <TableHead className="text-xs uppercase text-right">Compétences</TableHead>
              <TableHead className="text-xs uppercase">État</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => <ModuleRow key={m.id} module={m} />)}
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline text-gray-400" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ModuleRow({ module }: { module: Module }) {
  const navigate = useNavigate();
  const importContent = useImportModuleContent();
  const input = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);

  const exportJson = async () => {
    setDownloading(true);
    try {
      const content = await getModuleContent(module.code);
      const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: `seance-${module.code}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Export impossible');
    } finally {
      setDownloading(false);
    }
  };

  const importJson = async (file: File) => {
    let content: ModuleContent;
    try {
      content = JSON.parse(await file.text());
    } catch {
      toast.error('Fichier JSON illisible');
      return;
    }
    if (content.code && content.code !== module.code) {
      toast.error(`Ce fichier concerne la séance ${content.code}, pas ${module.code}.`);
      return;
    }
    try {
      await importContent.mutateAsync({ ...content, code: module.code });
      toast.success(`${sessionLabel(module.code)} : contenu intégré`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Import impossible', { duration: 10000 });
    }
  };

  const empty = module.pageCount === 0;

  return (
    <TableRow>
      <TableCell>
        <Badge variant="secondary" className={module.mandatory ? 'bg-blue-50 text-blue-700 mr-2' : 'bg-violet-50 text-violet-700 mr-2'}>{module.code}</Badge>
        <span className="text-sm">{module.title}</span>
      </TableCell>
      <TableCell className="text-right text-sm">{module.pageCount}</TableCell>
      <TableCell className="text-right text-sm">{module.exerciseCount}</TableCell>
      <TableCell className="text-right text-sm">{module.competencyCount}</TableCell>
      <TableCell>
        {empty
          ? <Badge variant="secondary" className="bg-amber-50 text-amber-700">À intégrer</Badge>
          : module.published
            ? <Badge variant="secondary" className="bg-green-50 text-green-700">Publiée</Badge>
            : <Badge variant="secondary">Non publiée</Badge>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Prévisualiser" aria-label="Prévisualiser" disabled={empty}
          onClick={() => navigate(`/sessions/run?moduleId=${module.id}&preview=1`)}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Télécharger le JSON" aria-label="Télécharger le JSON" onClick={exportJson} disabled={downloading}>
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Importer un JSON" aria-label="Importer un JSON" onClick={() => input.current?.click()} disabled={importContent.isPending}>
          {importContent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) importJson(file); }}
        />
      </TableCell>
    </TableRow>
  );
}
