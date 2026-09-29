import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { ApiError, downloadFile } from '../lib/api';

/** Téléchargement d'un export Excel ou PDF de l'API */
export function ExportButton({ path, format, label }: { path: string; format: 'xlsx' | 'pdf'; label?: string }) {
  const [loading, setLoading] = useState(false);
  const Icon = format === 'xlsx' ? FileSpreadsheet : FileText;

  const download = async () => {
    setLoading(true);
    try {
      await downloadFile(path);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Export impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={download} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className={format === 'xlsx' ? 'w-4 h-4 text-green-700' : 'w-4 h-4 text-red-600'} />}
      {label ?? (format === 'xlsx' ? 'Excel' : 'PDF')}
    </Button>
  );
}
