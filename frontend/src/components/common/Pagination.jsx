import React, { useMemo, useState } from 'react';

export const usePagination = (items = [], initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const start = (validPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, validPage, pageSize]);

  return {
    currentPage: validPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalItems,
    totalPages,
  };
};

export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemName = 'registros'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalItems, currentPage * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        Mostrando <strong style={{ color: 'var(--text-main)' }}>{startRecord}–{endRecord}</strong> de{' '}
        <strong style={{ color: 'var(--accent)' }}>{totalItems}</strong> {itemName}
      </div>

      <div className="pagination-controls">
        {onPageSizeChange && (
          <div className="pagination-size-selector">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="pagination-select"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
            </select>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-nav">
            <button
              type="button"
              className="pagination-btn pagination-btn-arrow"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title="Primera página"
            >
              «
            </button>
            <button
              type="button"
              className="pagination-btn pagination-btn-prev"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Página anterior"
            >
              ‹ Anterior
            </button>

            <div className="pagination-pages">
              {pages.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="pagination-dots">
                      …
                    </span>
                  );
                }
                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`pagination-btn pagination-btn-page ${isActive ? 'active' : ''}`}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="pagination-btn pagination-btn-next"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Página siguiente"
            >
              Siguiente ›
            </button>
            <button
              type="button"
              className="pagination-btn pagination-btn-arrow"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Última página"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
