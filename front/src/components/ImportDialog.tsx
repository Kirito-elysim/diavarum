import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { useImport, type ImportReport, type ImportType } from '../api/hooks';
import { ApiError, downloadFile } from '../lib/api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const NOUNS: Record<ImportType, [string, string]> = {
  users: ['utilisateur', 'utilisateurs'],
  centers: ['centre', 'centres'],
  patients: ['patient', 'patients'],
};

const DESCRIPTIONS: Record<ImportType, (centerName?: string) => string> = {
  users: (centerName) => `Créez plusieurs comptes à partir d'un fichier Excel${centerName ? `, rattachés par défaut à ${centerName}` : ''}. Un mot de passe provisoire est généré pour chacun.`,
  centers: () => 'Créez plusieurs centres de dialyse à partir d\'un fichier Excel.',
  patients: (centerName) => `Créez plusieurs patients à partir d'un fichier Excel${centerName ? ` dans ${centerName}` : ''}. Ils sont enregistrés au statut « Enregistré » ; profil, test CODEX et éligibilité se complètent ensuite sur leur fiche.`,
};
const COLUMN_TITLES: Record<ImportType, string> = { users: 'Utilisateur', centers: 'Centre', patients: 'Patient' };
const plural = (type: ImportType, count: number) => `${count} ${NOUNS[type][count > 1 ? 1 : 0]}`;

/**
 * Import en masse depuis Excel / CSV, en trois temps : fichier → vérification ligne par ligne → création.
 * Rien n'est créé tant qu'une ligne est en erreur.
 */
export function ImportDialog({ type, open, onOpenChange, centerId, centerName }: {
  type: ImportType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Centre appliqué aux lignes sans centre (import depuis la fiche d'un centre) */
  centerId?: string;
  centerName?: string;
}) {
  const runImport = useImport(type);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [result, setResult] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); if (input.current) input.current.value = ''; };
  const close = (value: boolean) => { if (!value) reset(); onOpenChange(value); };

  const check = async (selected: File) => {
    setFile(selected);
    setPreview(null);
    setError('');
    try {
      setPreview(await runImport.mutateAsync({ file: selected, mode: 'preview', centerId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vérification impossible.');
    }
  };

  const commit = async () => {
    if (!file) return;
    try {
      const report = await runImport.mutateAsync({ file, mode: 'import', centerId });
      setResult(report);
      toast.success(`${plural(type, report.created)} créé${report.created > 1 ? 's' : ''}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import impossible.');
    }
  };

  const errorCount = preview?.rows.filter((r) => r.errors.length).length ?? 0;
  const validCount = (preview?.rows.length ?? 0) - errorCount;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des {NOUNS[type][1]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[type](centerName)}</DialogDescription>
        </DialogHeader>

        {result ? (
          <ImportResult type={type} report={result} />
        ) : (
          <div className="space-y-4">
            <ol className="grid gap-3 sm:grid-cols-3 text-sm">
              <Step n={1} title="Téléchargez le modèle">
                <Button variant="outline" size="sm" className="mt-2 h-8 gap-2" onClick={() => downloadFile(`/imports/${type}/template.xlsx`).catch(() => toast.error('Téléchargement impossible'))}>
                  <FileSpreadsheet className="w-4 h-4 text-green-700" />Modèle Excel
                </Button>
              </Step>
              <Step n={2} title="Remplissez-le">Une ligne par {NOUNS[type][0]} ; l'onglet « Mode d'emploi » détaille chaque colonne.</Step>
              <Step n={3} title="Déposez-le ici">Le fichier est vérifié avant toute création.</Step>
            </ol>

            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const dropped = e.dataTransfer.files[0]; if (dropped) check(dropped); }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/40'}`}
            >
              {runImport.isPending && !preview ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Upload className="w-6 h-6 text-orange-500" />}
              <span className="text-sm font-medium text-gray-900">{file ? file.name : 'Glissez votre fichier ici ou cliquez pour le choisir'}</span>
              <span className="text-xs text-gray-400">Excel (.xlsx, .xls, .ods) ou CSV · 500 lignes et 2 Mo maximum</span>
              <input ref={input} type="file" accept=".xlsx,.xls,.ods,.csv" className="sr-only" aria-label="Fichier à importer" onChange={(e) => { const chosen = e.target.files?.[0]; if (chosen) check(chosen); }} />
            </label>

            {error && <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</p>}

            {preview && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500">{preview.rows.length} ligne{preview.rows.length > 1 ? 's' : ''} lue{preview.rows.length > 1 ? 's' : ''} :</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />{validCount} valide{validCount > 1 ? 's' : ''}</span>
                  {errorCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-red-700"><XCircle className="w-3.5 h-3.5" />{errorCount} en erreur</span>}
                </div>
                {errorCount > 0 && (
                  <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Rien ne sera créé tant que le fichier contient des erreurs : corrigez les lignes signalées puis déposez à nouveau le fichier.
                  </p>
                )}
                <div className="rounded-xl ring-1 ring-gray-100 overflow-hidden max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                        <TableHead className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ligne</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{COLUMN_TITLES[type]}</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vérification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...preview.rows].sort((a, b) => b.errors.length - a.errors.length || a.line - b.line).map((row) => (
                        <TableRow key={row.line} className={row.errors.length ? 'bg-red-50/40' : ''}>
                          <TableCell className="text-sm text-gray-500 tabular-nums">{row.line}</TableCell>
                          <TableCell className="text-sm text-gray-900">{row.label || <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell className="text-sm">
                            {row.errors.length
                              ? <ul className="space-y-0.5 text-red-700">{row.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                              : <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" />Prêt</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => close(false)} className="bg-orange-500 hover:bg-orange-600 text-white">Terminer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>Annuler</Button>
              <Button onClick={commit} disabled={!preview?.valid || runImport.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {runImport.isPending && preview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {preview?.valid ? `Importer ${plural(type, preview.rows.length)}` : 'Importer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="flex items-center gap-2 font-medium text-gray-900">
        <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">{n}</span>{title}
      </p>
      <div className="mt-1 text-xs text-gray-500">{children}</div>
    </li>
  );
}

function ImportResult({ type, report }: { type: ImportType; report: ImportReport }) {
  const credentials = report.credentials ?? [];

  const downloadCredentials = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [['Nom', 'Email', 'Rôle', 'Mot de passe provisoire'], ...credentials.map((c) => [c.name, c.email, c.role, c.password])];
    const csv = '﻿' + lines.map((line) => line.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `identifiants-${new Date().toISOString().slice(0, 10)}.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        <CheckCircle2 className="w-4 h-4" />{plural(type, report.created)} créé{report.created > 1 ? 's' : ''}.
      </p>
      {credentials.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Ces mots de passe ne seront plus affichés : téléchargez-les ou notez-les avant de fermer.
            </p>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={downloadCredentials}><Download className="w-4 h-4" />Télécharger les identifiants</Button>
          </div>
          <div className="rounded-xl ring-1 ring-gray-100 overflow-hidden max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  {['Nom', 'Email', 'Rôle', 'Mot de passe provisoire'].map((h) => <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((c) => (
                  <TableRow key={c.email}>
                    <TableCell className="text-sm text-gray-900">{c.name}</TableCell>
                    <TableCell className="text-sm text-gray-700">{c.email}</TableCell>
                    <TableCell className="text-sm text-gray-700">{c.role}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-900 select-all">{c.password}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
