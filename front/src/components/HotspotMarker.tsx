import type { HotspotPoint } from '../types';
import { PICTOS } from '../lib/courseVisuals';
import { cn } from '../lib/utils';

/** Contenu d'un repère : image importée, picto de la bibliothèque, ou numéro par défaut */
export function HotspotMarker({ point, index, className }: { point: HotspotPoint; index: number; className?: string }) {
  if (point.iconUrl) return <img src={point.iconUrl} alt="" className={cn('h-2/3 w-2/3 object-contain', className)} draggable={false} />;
  const picto = point.icon ? PICTOS[point.icon] : undefined;
  if (picto) { const Icon = picto.icon; return <Icon aria-hidden className={cn('h-1/2 w-1/2', className)} />; }
  return <>{index + 1}</>;
}

/** Une case de la planche de pictos : ligne = picto, colonne = état (0 normal, 1 consulté) */
export function SheetMarker({ sheet, row, col = 0, className }: { sheet: { url: string; cols: number; rows: number }; row: number; col?: number; className?: string }) {
  const { url, cols, rows } = sheet;
  return <span aria-hidden className={cn('block h-full w-full bg-no-repeat', className)} style={{
    backgroundImage: `url("${url}")`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols > 1 ? Math.min(col, cols - 1) / (cols - 1) * 100 : 0}% ${rows > 1 ? row / (rows - 1) * 100 : 0}%`,
  }} />;
}
