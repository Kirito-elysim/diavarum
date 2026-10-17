import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarRange, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { PERIOD_OPTIONS, type Period, type PeriodPreset } from '../lib/period';

const toDate = (day: string | null) => (day ? new Date(`${day}T00:00:00`) : undefined);
const toDay = (date: Date | undefined) => (date ? format(date, 'yyyy-MM-dd') : null);
const short = (day: string | null) => (day ? format(new Date(`${day}T00:00:00`), 'd MMM yyyy', { locale: fr }) : '…');

/**
 * Choix d'une période dans un seul bouton : périodes prédéfinies à gauche, calendrier (deux mois) à droite.
 * Les dates personnalisées ne s'appliquent qu'au clic sur « Appliquer » : la page ne bouge pas pendant la saisie.
 */
export function PeriodPicker({ preset, custom, onChange, className }: {
  preset: PeriodPreset;
  custom: Period;
  onChange: (preset: PeriodPreset, custom: Period) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const label = preset === 'custom' ? `${short(custom.from)} – ${short(custom.to)}` : PERIOD_OPTIONS.find((o) => o.value === preset)?.label;
  const presets = PERIOD_OPTIONS.filter((o) => o.value !== 'custom');

  const openChange = (value: boolean) => {
    if (value) setDraft(preset === 'custom' ? { from: toDate(custom.from), to: toDate(custom.to) } : undefined);
    setOpen(value);
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Période"
          aria-expanded={open}
          className={cn('flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring', className)}
        >
          <CalendarRange className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <ul className="sm:w-48 border-b sm:border-b-0 sm:border-r border-gray-100 p-2 space-y-0.5" aria-label="Périodes prédéfinies">
            {presets.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => { onChange(option.value, custom); setOpen(false); }}
                  className={cn('w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left hover:bg-orange-50', preset === option.value && 'bg-orange-50 text-orange-800 font-medium')}
                >
                  <Check className={cn('h-4 w-4 text-orange-600', preset !== option.value && 'invisible')} />
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
          <div>
            <p className="px-4 pt-3 text-xs font-medium text-gray-500">Dates personnalisées</p>
            <Calendar
              mode="range"
              locale={fr}
              numberOfMonths={2}
              defaultMonth={draft?.from ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)}
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: new Date() }}
              showOutsideDays={false}
              classNames={{
                // Jours de la plage en orange clair, début et fin en orange plein
                cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-orange-50 [&:has(>.day-range-start)]:rounded-l-md [&:has(>.day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
                day_selected: 'text-orange-900 hover:bg-orange-100 focus:bg-orange-100',
                day_range_start: 'day-range-start !bg-orange-500 !text-white',
                day_range_end: 'day-range-end !bg-orange-500 !text-white',
                day_range_middle: 'rounded-none',
                day_today: 'font-semibold text-orange-600',
              }}
            />
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <span className="text-sm text-gray-600">
                {draft?.from ? `${short(toDay(draft.from))} – ${draft.to ? short(toDay(draft.to)) : 'choisissez la fin'}` : 'Choisissez le début puis la fin'}
              </span>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!draft?.from}
                onClick={() => { onChange('custom', { from: toDay(draft?.from), to: toDay(draft?.to ?? draft?.from) }); setOpen(false); }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
