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
