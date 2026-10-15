import { Button } from './ui/button';

export function ListPagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-gray-500">
    <span>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} sur {total}</span>
    <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</Button><span>Page {page} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant</Button></div>
  </div>;
}
