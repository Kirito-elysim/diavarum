import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import type { Statistics } from '../../api/types';
import { formatDuration } from '../../lib/format';
import { EmptyState, ScoreBar, SortableHead } from '../../components/ListParts';
import { useSort } from './useSort';

type Course = Statistics['courses'][number];

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type IndexedCourse = Course & { catalogIndex: number };

const ACCESSORS = {
  order: (c: IndexedCourse) => c.catalogIndex,
  validations: (c: IndexedCourse) => c.validations,
  score: (c: IndexedCourse) => c.averageScore,
  duration: (c: IndexedCourse) => c.averageDurationSeconds,
};

/** Séances du catalogue sur la période : validations, score et durée moyens ; tri pour repérer les cours difficiles */
export function CoursesTab({ courses }: { courses: Statistics['courses'] }) {
  const [onlyDone, setOnlyDone] = useState(true);
  const [search, setSearch] = useState('');

  // Ordre du catalogue mémorisé pour pouvoir y revenir après un tri
  const indexed = useMemo(() => courses.map((c, i) => ({ ...c, catalogIndex: i })), [courses]);
  const rows = useMemo(() => indexed.filter((c) =>
    (!onlyDone || c.validations > 0) && normalize(`${c.code} ${c.title}`).includes(normalize(search.trim()))), [indexed, onlyDone, search]);
  const { sorted, sort, toggle } = useSort(rows, ACCESSORS, { key: 'order' });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input aria-label="Rechercher une séance" placeholder="Rechercher une séance (code ou titre)…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-gray-50 border-gray-100" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="only-done" checked={onlyDone} onCheckedChange={setOnlyDone} />
            <Label htmlFor="only-done" className="text-sm text-gray-700 cursor-pointer">Séances réalisées uniquement</Label>
          </div>
          <span className="ml-auto text-sm text-gray-500">{rows.length} séance{rows.length > 1 ? 's' : ''} sur {courses.length}</span>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {rows.length === 0 ? <EmptyState icon={<BookOpen className="w-8 h-8" />}>{onlyDone ? 'Aucune séance validée sur la période' : 'Aucune séance ne correspond à la recherche'}</EmptyState> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                <SortableHead label="Séance" column="order" sort={sort} onSort={toggle} />
                <SortableHead label="Validations" column="validations" sort={sort} onSort={toggle} align="right" />
                <SortableHead label="Score moyen" column="score" sort={sort} onSort={toggle} align="right" />
                <SortableHead label="Durée moyenne" column="duration" sort={sort} onSort={toggle} align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => (
                <TableRow key={c.code} className="border-gray-100">
                  <TableCell className="text-sm">
                    <Badge variant="secondary" className={`mr-2 ${c.mandatory ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>{c.code}</Badge>
                    {c.title}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.validations}</TableCell>
                  <TableCell className="text-right text-sm"><ScoreBar score={c.averageScore} /></TableCell>
                  <TableCell className="text-right text-sm text-gray-600 tabular-nums">{formatDuration(c.averageDurationSeconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <p className="text-xs text-gray-400">Cliquez sur « Score moyen » pour classer les séances de la plus difficile à la plus réussie.</p>
    </div>
  );
}
