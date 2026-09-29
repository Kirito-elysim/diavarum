import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModules } from '../api/hooks';
import {
  Search,
  Eye,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const PAGE_SIZE = 8;

export default function CourseLibraryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useModules();

  const filtered = useMemo(() => {
    const modules = data?.member ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }, [search, data]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageModules = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handlePreview = (moduleId: string) => {
    navigate(`/sessions/run?moduleId=${moduleId}&preview=1`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bibliothèque de cours</h1>
            <p className="text-sm text-gray-500">
              Prévisualisez les cours du programme (mode démo : aucune séance n'est enregistrée)
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher un cours par titre ou description…"
          className="h-12 pl-12 pr-4 text-base rounded-xl border-gray-200"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} cours{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-400">
            Page {safePage + 1} sur {totalPages}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cours
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Type
              </th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Durée
              </th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-gray-400">Chargement…</td>
              </tr>
            ) : pageModules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Aucun cours trouvé</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Essayez d'autres mots-clés
                  </p>
                </td>
              </tr>
            ) : (
              pageModules.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-orange-600">
                        {m.code}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">
                          {m.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-md">
                          {m.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', m.mandatory ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700')}
                    >
                      {m.intro ? 'Démarrage' : m.mandatory ? 'Systématique' : 'Optionnelle'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-center">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {m.estimatedDuration} min
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handlePreview(m.id)}
                      className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Prévisualiser
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-semibold transition-all',
                i === safePage
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="gap-1.5"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
