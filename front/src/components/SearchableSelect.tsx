import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export type SearchableOption = { value: string; label: string; hint?: string };

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Liste déroulante à choix unique, filtrée par la saisie (sans tenir compte des accents) */
export function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder = 'Rechercher…', emptyText = 'Aucun résultat', className, ...aria }: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={aria['aria-label']}
          className={cn('flex h-10 items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring', className)}
        >
          <span className="truncate">{current?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-56" align="start">
        <Command filter={(_, search, keywords) => (normalize(keywords?.join(' ') ?? '').includes(normalize(search.trim())) ? 1 : 0)}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, option.hint ?? '']}
                onSelect={() => { onChange(option.value); setOpen(false); }}
                className="min-h-10 gap-2 cursor-pointer data-[selected=true]:bg-orange-50 data-[selected=true]:text-gray-900"
              >
                <Check className={cn('h-4 w-4 text-orange-600', option.value === value ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{option.label}</span>
                {option.hint && <span className="ml-auto text-xs text-gray-400">{option.hint}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
