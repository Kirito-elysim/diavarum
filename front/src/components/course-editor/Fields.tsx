import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export function Field({ label, value, onChange, multiline = false }: { label: string; value?: string; onChange: (value: string) => void; multiline?: boolean }) {
  const id = useId();
  return <div className="space-y-2 min-w-0"><label htmlFor={id} className="text-sm font-medium">{label}</label>{multiline
    ? <Textarea id={id} rows={4} value={value ?? ''} onChange={e => onChange(e.target.value)} />
    : <Input id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} />}</div>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 min-h-11 cursor-pointer text-sm"><input type="checkbox" className="h-5 w-5 accent-orange-600" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>;
}
export function ImageField({ url, alt, onChange }: { url: string; alt: string; onChange: (url: string, alt: string) => void }) {
  const [busy, setBusy] = useState(false);
  const latest = useRef({ onChange, alt });
  latest.current = { onChange, alt };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const id = useId();
  return <div className="space-y-3 rounded-xl bg-slate-50 p-4">
    {url && <img src={url} alt={alt} className="max-h-48 max-w-full rounded-lg object-contain" />}
    <label htmlFor={id} className="block text-sm font-medium">Importer une image</label>
    <input id={id} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-3 file:text-orange-900" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast.error('L’image doit faire 5 Mo maximum.'); return; }
      setBusy(true);
      try { const data = new FormData(); data.append('file', file); const result = await api<{ url: string }>('/content/media', { method: 'POST', body: data }); if (mounted.current) latest.current.onChange(result.url, latest.current.alt); }
      catch (err) { toast.error(err instanceof Error ? err.message : 'Import impossible'); }
      finally { setBusy(false); }
    }} />
    <p className="text-xs text-gray-500">{busy ? 'Import en cours…' : 'PNG, JPEG ou WebP · 5 Mo maximum'}</p>
    <details><summary className="cursor-pointer py-2 text-sm text-gray-600">Utiliser une adresse d’image existante</summary><Field label="Adresse de l’image" value={url} onChange={value => onChange(value, alt)} /></details>
    <Field label="Description de l’image pour l’accessibilité" value={alt} onChange={value => onChange(url, value)} />
  </div>;
}
export function ItemActions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (direction: number) => void; onRemove: () => void }) {
  return <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Monter">↑</Button><Button type="button" variant="outline" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Descendre">↓</Button><Button type="button" variant="ghost" className="text-red-700" onClick={onRemove}>Retirer</Button></div>;
}
