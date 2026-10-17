import { useMemo, useState } from 'react';

type SortValue = string | number | null | undefined;

/** Tri d'un tableau par colonne (clic sur l'en-tête : croissant, puis décroissant) ; les valeurs vides vont en bas */
export function useSort<T, K extends string>(rows: T[], accessors: Record<K, (row: T) => SortValue>, initial: { key: NoInfer<K>; desc?: boolean }) {
  const [sort, setSort] = useState<{ key: K; desc?: boolean }>(initial);
  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    return [...rows].sort((a, b) => {
      const [x, y] = [get(a), get(b)];
      if (x == null || x === '') return y == null || y === '' ? 0 : 1;
      if (y == null || y === '') return -1;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fr');
      return sort.desc ? -order : order;
    });
  }, [rows, accessors, sort]);
  const toggle = (key: K) => setSort((current) => ({ key, desc: current.key === key ? !current.desc : false }));
  return { sorted, sort, toggle };
}
