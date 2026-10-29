import type { CourseTextStyle } from '../../types';
import { CourseText } from '../CourseText';
import { courseTextStyle } from '../../lib/courseTextStyle';

export function TextStyleFields({ value = {}, onChange }: { value?: CourseTextStyle; onChange: (style: CourseTextStyle) => void }) {
  return <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Style du texte · charte Diaverum</summary>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Taille<select className="block w-full rounded-lg border p-2" value={value.size ?? 25} onChange={e => onChange({ ...value, size: Number(e.target.value) as 20 | 25 | 40 })}><option value={20}>20 px · texte dense / légende</option><option value={25}>25 px · texte courant</option><option value={40}>40 px · titre</option></select></label>
      <label className="space-y-1 text-sm">Couleur<select className="block w-full rounded-lg border p-2" value={value.color ?? '#004138'} onChange={e => onChange({ ...value, color: e.target.value as CourseTextStyle['color'] })}><option value="#004138">Vert texte · #004138</option><option value="#1C5335">Vert bandeau · #1C5335</option><option value="#E86825">Orange · #E86825</option></select></label>
      <label className="space-y-1 text-sm">Graisse<select className="block w-full rounded-lg border p-2" value={value.weight ?? 'regular'} onChange={e => onChange({ ...value, weight: e.target.value as CourseTextStyle['weight'] })}><option value="regular">Regular</option><option value="bold">Bold</option></select></label>
      <label className="space-y-1 text-sm">Alignement<select className="block w-full rounded-lg border p-2" value={value.align ?? 'left'} onChange={e => onChange({ ...value, align: e.target.value as CourseTextStyle['align'] })}><option value="left">À gauche</option><option value="center">Centré</option></select></label>
    </div><p className="mt-3 text-xs text-gray-500">Euclid Circular A · Entourez un passage de ** pour le mettre en gras.</p>
    <p className="mt-3 rounded-lg bg-[#ECF5E9] p-3 text-[25px] text-[#004138]" style={courseTextStyle(value)}><CourseText text="Votre texte et **un passage en gras**" /></p>
  </details>;
}
