import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export function usePagedItems(items = [], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(0);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const pagedItems = useMemo(() => items.slice(page * pageSize, page * pageSize + pageSize), [items, page, pageSize]);

  return { pagedItems, page, setPage, pageCount, total, pageSize };
}

export function PaginationControls({ page, setPage, pageCount, total, pageSize = PAGE_SIZE }) {
  if (total <= pageSize) return null;
  const start = page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="paginationControls" aria-label="Navegación de lista">
      <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Anterior">
        <ChevronLeft size={17} />
      </button>
      <span>{start}-{end} de {total}</span>
      <button type="button" onClick={() => setPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} aria-label="Ver más">
        <ChevronRight size={17} />
      </button>
    </nav>
  );
}
