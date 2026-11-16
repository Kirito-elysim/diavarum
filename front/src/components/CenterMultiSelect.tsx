import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Center } from '../api/types';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtre multi-centres : liste cochable, filtrée par la saisie (nom ou ville, sans tenir compte des accents). `value` = IRI des centres retenus ; vide = tous. */
export function CenterMultiSelect({ centers, value, onChange, className, allLabel = 'Tous les centres' }: { centers: Center[]; value: string[]; onChange: (value: string[]) => void; className?: string; allLabel?: string }) {
  const [open, setOpen] = useState(false);
  const selected = centers.filter((c) => value.includes(c['@id']));
  const label = selected.length === 0 ? allLabel : selected.length === 1 ? selected[0].name : `${selected.length} centres`;
  const toggle = (iri: string) => onChange(value.includes(iri) ? value.filter((v) => v !== iri) : [...value, iri]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Filtrer par centres"
          className={cn('flex h-10 w-56 items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring', selected.length > 0 && 'border-orange-200 bg-orange-50', className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command filter={(_, search, keywords) => (normalize(keywords?.join(' ') ?? '').includes(normalize(search.trim())) ? 1 : 0)}>
          <CommandInput placeholder="Rechercher un centre…" />
          <CommandList>
            <CommandEmpty>Aucun centre trouvé</CommandEmpty>
            {centers.map((c) => (
              <CommandItem
                key={c.id}
                value={c['@id']}
                keywords={[c.name, c.city ?? '']}
                onSelect={() => toggle(c['@id'])}
                className="min-h-10 gap-2 cursor-pointer data-[selected=true]:bg-orange-50 data-[selected=true]:text-gray-900"
              >
                <Check className={cn('h-4 w-4 text-orange-600', value.includes(c['@id']) ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{c.name}</span>
                {c.city && <span className="ml-auto text-xs text-gray-400">{c.city}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="flex w-full items-center justify-center gap-1.5 border-t px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            <X className="h-3.5 w-3.5" />{allLabel}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
