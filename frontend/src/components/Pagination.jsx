const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}) {
  if (!total) return null;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = ((page - 1) * pageSize) + 1;
  const lastItem = Math.min(page * pageSize, total);
  const buttonStyle = {
    minHeight: 38,
    padding: '7px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 9,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <nav
      aria-label="Paginação da lista"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderTop: '1px solid var(--border-color)',
        padding: '12px 0 0',
        marginTop: 12,
        fontSize: 13,
      }}
    >
      <p aria-live="polite" style={{ margin: 0, color: 'var(--text-secondary)' }}>
        Exibindo {firstItem}–{lastItem} de {total}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)' }}>
          Itens por página
          <select
            aria-label="Itens por página"
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            style={{
              minHeight: 38,
              padding: '6px 8px',
              border: '1px solid var(--border-color)',
              borderRadius: 9,
              background: 'var(--input-bg)',
              color: 'var(--input-text)',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="Página anterior"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ ...buttonStyle, cursor: disabled || page <= 1 ? 'not-allowed' : 'pointer', opacity: disabled || page <= 1 ? 0.55 : 1 }}
        >
          ‹ Anterior
        </button>
        <span aria-current="page" style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
          Página {page} de {pageCount}
        </span>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          style={{ ...buttonStyle, cursor: disabled || page >= pageCount ? 'not-allowed' : 'pointer', opacity: disabled || page >= pageCount ? 0.55 : 1 }}
        >
          Próxima ›
        </button>
      </div>
    </nav>
  );
}
