import { useId, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { Center } from '../api/types';
import { Input } from './ui/input';

/** Choix de plusieurs centres dans une liste filtrée par la saisie (nom ou ville) */
export function CenterPicker({ centers, value, onChange, invalid }: { centers: Center[]; value: string[]; onChange: (value: string[]) => void; invalid?: boolean }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const matches = centers.filter((c) => normalize(`${c.name} ${c.city}`).includes(normalize(query.trim())));
  const selected = centers.filter((c) => value.includes(c['@id']));

  const toggle = (iri: string) => {
    onChange(value.includes(iri) ? value.filter((v) => v !== iri) : [...value, iri]);
    setQuery('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); toggle(matches[active]['@id']); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Backspace' && !query && value.length) onChange(value.slice(0, -1));
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 ring-1 ring-orange-100 pl-3 pr-1 py-1 text-sm">
              {c.name}
              <button type="button" onClick={() => toggle(c['@id'])} aria-label={`Retirer ${c.name}`} className="rounded-full p-1 hover:bg-orange-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid}
          aria-label="Rechercher un centre de rattachement"
          placeholder="Rechercher un centre par nom ou ville…"
          className="pl-9"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul id={listId} role="listbox" aria-multiselectable className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white py-1 shadow-lg">
            {matches.map((c, i) => {
              const isSelected = value.includes(c['@id']);
              return (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); toggle(c['@id']); }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-2 px-3 min-h-11 cursor-pointer text-sm ${i === active ? 'bg-orange-50' : ''}`}
                >
                  <Check className={`w-4 h-4 text-orange-600 ${isSelected ? '' : 'invisible'}`} />
                  <span className="text-gray-900">{c.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{c.city}</span>
                </li>
              );
            })}
            {matches.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">Aucun centre ne correspond à « {query} »</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
