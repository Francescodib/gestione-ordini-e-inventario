import React from 'react';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (record: T) => void;
  className?: string;
}

const Table = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyText = 'Nessun dato disponibile',
  onRowClick,
  className = ''
}: TableProps<T>) => {
  if (loading) {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-[var(--radius-md)] border border-[var(--color-border-light)] shadow-[var(--shadow-base)]">
        <div className="animate-pulse p-[var(--spacing-xl)]">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                {columns.map((_, j) => (
                  <div key={j} className="flex-1 h-4 bg-[var(--color-gray-200)] rounded-[var(--radius-base)]"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-[var(--radius-md)] border border-[var(--color-border-light)] shadow-[var(--shadow-base)]">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-[var(--color-gray-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)]">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--color-bg-primary)] rounded-[var(--radius-md)] border border-[var(--color-border-light)] shadow-[var(--shadow-base)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--color-border-light)]">
          <thead className="bg-[var(--color-bg-secondary)]">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[var(--color-bg-primary)] divide-y divide-[var(--color-border-light)]">
            {data.map((record, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${onRowClick ? 'cursor-pointer hover:bg-[var(--color-bg-secondary)]' : ''} transition-colors duration-150`}
                onClick={() => onRowClick?.(record)}
              >
                {columns.map((column, colIndex) => {
                  const value = typeof column.key === 'string' 
                    ? record[column.key] 
                    : record[column.key as keyof T];
                  
                  return (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {column.render ? column.render(value, record) : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;